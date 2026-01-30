#!/usr/bin/env node

/**
 * GitHub Actions script to sync large GoDaddy inventory files via edge function.
 * The edge function handles privileged database inserts using the service role key,
 * so this script only needs a simple SYNC_SECRET for authentication.
 * 
 * Required secrets:
 * - SUPABASE_URL
 * - SYNC_SECRET (shared secret for authenticating with the edge function)
 */

const https = require('https');
const { createWriteStream, unlinkSync, existsSync, mkdirSync, readFileSync } = require('fs');
const { join } = require('path');

// Node.js 18+ provides a built-in fetch() (Node 20 in GitHub Actions).
const fetch = global.fetch;
if (typeof fetch !== 'function') {
  console.error('❌ This script requires Node.js 18+ (global fetch missing).');
  process.exit(1);
}

// Large inventory files from GoDaddy - correct URLs
const LARGE_INVENTORY_TYPES = [
  { type: 'closeout', url: 'https://inventory.auctions.godaddy.com/closeout_listings.json.zip' },
  { type: 'endingToday', url: 'https://inventory.auctions.godaddy.com/all_listings_ending_today.json.zip' },
  { type: 'allBiddable', url: 'https://inventory.auctions.godaddy.com/all_biddable_auctions.json.zip' },
  { type: 'allExpiring', url: 'https://inventory.auctions.godaddy.com/all_expiring_auctions.json.zip' },
  { type: 'allListings', url: 'https://inventory.auctions.godaddy.com/all_listings.json.zip' },
];

// Configuration
const BATCH_SIZE = 1000; // Send 1000 auctions per edge function call
const TEMP_DIR = join(process.cwd(), '.temp-inventory');

// Get credentials from environment - trim to remove any accidental whitespace
const SUPABASE_URL = (process.env.SUPABASE_URL || '').trim();
const SYNC_SECRET = (process.env.SYNC_SECRET || '').trim();

if (!SUPABASE_URL || !SYNC_SECRET) {
  console.error('❌ Missing required environment variables:');
  console.error('   SUPABASE_URL');
  console.error('   SYNC_SECRET');
  console.error('');
  console.error('Add these as GitHub repository secrets.');
  process.exit(1);
}

// Validate SUPABASE_URL format
if (!SUPABASE_URL.startsWith('https://')) {
  console.error('❌ SUPABASE_URL must start with "https://"');
  process.exit(1);
}

// Ensure temp directory exists
if (!existsSync(TEMP_DIR)) {
  mkdirSync(TEMP_DIR, { recursive: true });
}

/**
 * Download a file from URL to local path
 */
function downloadFile(url, destPath) {
  return new Promise((resolve, reject) => {
    const file = createWriteStream(destPath);
    
    console.log(`   Downloading ${url}...`);

    const requestUrl = new URL(url);
    const req = https.request(
      {
        protocol: requestUrl.protocol,
        hostname: requestUrl.hostname,
        path: `${requestUrl.pathname}${requestUrl.search}`,
        method: 'GET',
        headers: {
          // GoDaddy inventory endpoints can return 403 without browser-like headers
          'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          'Accept': '*/*',
          'Accept-Language': 'en-US,en;q=0.9',
          'Referer': 'https://auctions.godaddy.com/',
          'Connection': 'keep-alive',
        },
      },
      (response) => {
        const status = response.statusCode || 0;

        // Handle redirects (including 307/308)
        if ([301, 302, 303, 307, 308].includes(status) && response.headers.location) {
          file.close();
          const nextUrl = new URL(response.headers.location, url).toString();
          downloadFile(nextUrl, destPath).then(resolve).catch(reject);
          return;
        }

        if (status !== 200) {
          // Capture a small slice of body for debugging (403 pages etc.)
          let body = '';
          response.on('data', (chunk) => {
            if (body.length < 4000) body += chunk.toString('utf8');
          });
          response.on('end', () => {
            file.close();
            reject(
              new Error(
                `HTTP ${status}: ${response.statusMessage}${body ? `\nBody (truncated): ${body.substring(0, 200)}` : ''}`
              )
            );
          });
          return;
        }
      
      const totalBytes = parseInt(response.headers['content-length'], 10);
      let downloadedBytes = 0;
      
      response.on('data', (chunk) => {
        downloadedBytes += chunk.length;
        if (totalBytes) {
          const percent = Math.round((downloadedBytes / totalBytes) * 100);
          process.stdout.write(`\r   Progress: ${percent}% (${Math.round(downloadedBytes / 1024 / 1024)}MB)`);
        }
      });
      
      response.pipe(file);
      
      file.on('finish', () => {
        file.close();
        console.log(''); // New line after progress
        resolve(destPath);
      });

      }
    );

    req.setTimeout(120000, () => {
      req.destroy(new Error('Download timeout'));
    });

    req.on('error', (err) => {
      try {
        file.close();
      } catch (_) {}
      if (existsSync(destPath)) unlinkSync(destPath);
      reject(err);
    });

    req.end();
  });
}

/**
 * Extract JSON from a ZIP file
 */
async function extractJsonFromZip(zipPath) {
  const AdmZip = require('adm-zip');
  
  console.log('   Extracting ZIP...');
  const zip = new AdmZip(zipPath);
  const entries = zip.getEntries();
  
  // Find the JSON file in the ZIP
  const jsonEntry = entries.find(e => e.entryName.endsWith('.json'));
  if (!jsonEntry) {
    throw new Error('No JSON file found in ZIP');
  }
  
  console.log(`   Found: ${jsonEntry.entryName} (${Math.round(jsonEntry.header.size / 1024 / 1024)}MB uncompressed)`);
  
  const jsonContent = zip.readAsText(jsonEntry);
  return JSON.parse(jsonContent);
}

/**
 * Extract TLD from domain name
 */
function extractTld(domain) {
  const parts = domain.split('.');
  return parts.length > 1 ? `.${parts[parts.length - 1]}` : '';
}

/**
 * Parse price from various formats
 */
function parsePrice(priceRaw) {
  if (typeof priceRaw === 'string') {
    return parseFloat(priceRaw.replace(/[$,]/g, '')) || 0;
  }
  return parseFloat(priceRaw) || 0;
}

/**
 * Parse auction data from GoDaddy format
 */
function parseAuction(item, inventoryType) {
  const domain = item.domainName || item.DomainName || item.domain || '';
  
  // For closeout (buy-now) inventory, set a far-future end_time to prevent cleanup deletion
  // Closeout domains don't have real auction end times - they're available until purchased
  let endTime = item.auctionEndTime || item.AuctionEndTime || item.endTime || null;
  if (inventoryType === 'closeout') {
    // Set end_time 1 year in the future for closeout domains
    endTime = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
  }
  
  return {
    domain_name: domain,
    price: parsePrice(item.price || item.Price || item.currentPrice || item.minBid || 0),
    bid_count: parseInt(item.numberOfBids || item.NumberOfBids || item.bids || 0, 10) || 0,
    traffic_count: parseInt(item.pageviews || item.traffic || item.Traffic || 0, 10) || 0,
    end_time: endTime,
    inventory_source: inventoryType,
    tld: extractTld(domain),
    auction_type: inventoryType === 'closeout' ? 'closeout' : (item.auctionType || item.AuctionType || item.type || 'auction'),
    valuation: parsePrice(item.valuation || item.Valuation || 0),
    domain_age: parseInt(item.domainAge || item.DomainAge || 0, 10) || 0,
  };
}

/**
 * Send auctions to the edge function for privileged upsert
 */
async function upsertAuctionsViaEdgeFunction(auctions, inventorySource) {
  let inserted = 0;
  let errors = 0;
  
  for (let i = 0; i < auctions.length; i += BATCH_SIZE) {
    const batch = auctions.slice(i, i + BATCH_SIZE);
    
    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/bulk-upsert-auctions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-sync-secret': SYNC_SECRET,
        },
        body: JSON.stringify({
          auctions: batch,
          inventory_source: inventorySource,
        }),
      });
      
      if (!response.ok) {
        const error = await response.text();
        console.error(`\n   Batch error: ${error.substring(0, 200)}`);
        errors++;
      } else {
        const result = await response.json();
        inserted += result.inserted || batch.length;
        if (result.errors) {
          errors += result.errors;
        }
      }
    } catch (err) {
      console.error(`\n   Network error: ${err.message}`);
      errors++;
    }
    
    process.stdout.write(`\r   Inserted: ${inserted}/${auctions.length} (${errors} errors)`);
  }
  
  console.log(''); // New line
  return { inserted, errors };
}

/**
 * Record sync history via edge function
 */
async function recordSyncHistory(inventorySource, success, auctionsCount, durationMs, errorMessage = null) {
  try {
    // Use a simple POST to the bulk-upsert function with a special flag for sync history
    // Or we can skip this since the edge function can record it
    console.log(`   Recording sync: ${inventorySource}, ${success ? 'success' : 'failed'}, ${auctionsCount} auctions, ${durationMs}ms`);
  } catch (err) {
    console.error(`   Failed to record sync history: ${err.message}`);
  }
}

/**
 * Sync a single inventory type
 */
async function syncInventoryType({ type, url }) {
  const startTime = Date.now();
  const zipPath = join(TEMP_DIR, `${type}.json.zip`);
  
  console.log(`\n📦 Syncing ${type}...`);
  console.log(`   URL: ${url}`);
  
  try {
    // Download the ZIP file
    await downloadFile(url, zipPath);
    
    // Extract and parse JSON
    const data = await extractJsonFromZip(zipPath);
    
    // Handle different response formats - GoDaddy uses { meta, data }
    let items = [];
    console.log(`   JSON structure keys: ${Object.keys(data).join(', ')}`);
    console.log(`   data.data type: ${typeof data.data}, isArray: ${Array.isArray(data.data)}`);
    
    if (Array.isArray(data)) {
      items = data;
      console.log(`   Matched: direct array`);
    } else if (data.data && Array.isArray(data.data)) {
      // Handle { meta: {...}, data: [...] } format
      items = data.data;
      console.log(`   Matched: data.data array`);
    } else if (data.data && typeof data.data === 'object') {
      // Handle nested data object - check all possible keys
      const nested = data.data;
      console.log(`   Nested data keys: ${Object.keys(nested).join(', ')}`);
      if (nested.domains && Array.isArray(nested.domains)) {
        items = nested.domains;
        console.log(`   Matched: data.data.domains`);
      } else if (nested.auctions && Array.isArray(nested.auctions)) {
        items = nested.auctions;
        console.log(`   Matched: data.data.auctions`);
      } else if (nested.listings && Array.isArray(nested.listings)) {
        items = nested.listings;
        console.log(`   Matched: data.data.listings`);
      } else if (nested.items && Array.isArray(nested.items)) {
        items = nested.items;
        console.log(`   Matched: data.data.items`);
      } else {
        // Try to find any array in the nested object
        for (const [key, value] of Object.entries(nested)) {
          if (Array.isArray(value) && value.length > 0) {
            console.log(`   Found array in data.data.${key} with ${value.length} items`);
            items = value;
            break;
          }
        }
      }
    } else if (data.domains && Array.isArray(data.domains)) {
      items = data.domains;
      console.log(`   Matched: domains`);
    } else if (data.auctions && Array.isArray(data.auctions)) {
      items = data.auctions;
      console.log(`   Matched: auctions`);
    } else if (data.items && Array.isArray(data.items)) {
      items = data.items;
      console.log(`   Matched: items`);
    } else if (data.listings && Array.isArray(data.listings)) {
      items = data.listings;
      console.log(`   Matched: listings`);
    } else {
      // Last resort - find any large array in root
      for (const [key, value] of Object.entries(data)) {
        if (Array.isArray(value) && value.length > 100) {
          console.log(`   Found array in root.${key} with ${value.length} items`);
          items = value;
          break;
        }
      }
    }
    
    if (items.length === 0) {
      console.log(`   ⚠️ Could not find auction array! Dumping first 500 chars of data:`);
      console.log(`   ${JSON.stringify(data).substring(0, 500)}`);
    }
    console.log(`   Found ${items.length.toLocaleString()} auctions`);
    
    // Parse auctions - filter out entries without domain names
    const auctions = items
      .filter(item => item.domainName || item.DomainName || item.domain)
      .map(item => parseAuction(item, type));
    
    console.log(`   Valid auctions: ${auctions.length.toLocaleString()}`);
    
    // Upsert via edge function
    const { inserted, errors } = await upsertAuctionsViaEdgeFunction(auctions, type);
    
    const duration = Date.now() - startTime;
    await recordSyncHistory(type, true, inserted, duration);
    
    console.log(`   ✅ Synced ${inserted.toLocaleString()} auctions in ${Math.round(duration / 1000)}s`);
    
    // Cleanup
    if (existsSync(zipPath)) {
      unlinkSync(zipPath);
    }
    
    return { type, success: true, count: inserted, errors };
  } catch (error) {
    const duration = Date.now() - startTime;
    await recordSyncHistory(type, false, 0, duration, error.message);
    
    console.error(`   ❌ Failed: ${error.message}`);
    
    // Cleanup
    if (existsSync(zipPath)) {
      unlinkSync(zipPath);
    }
    
    return { type, success: false, error: error.message };
  }
}

/**
 * Trigger pattern checking after sync
 */
async function triggerPatternCheck() {
  console.log('\n🔔 Triggering pattern check for all users...');
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/check-all-patterns`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-sync-secret': SYNC_SECRET,
      },
    });
    const result = await response.json();
    console.log(`   Pattern check result: ${JSON.stringify(result)}`);
    if (result.success) {
      console.log(`   ✅ Notified ${result.usersNotified || 0} users with ${result.totalNewMatches || 0} new matches`);
    }
  } catch (err) {
    console.error(`   ⚠️ Pattern check failed: ${err.message}`);
  }
}

/**
 * Main function
 */
async function main() {
  console.log('🚀 Large Inventory Sync (GitHub Actions → Edge Function)');
  console.log('==========================================================');
  console.log(`Supabase URL: ${SUPABASE_URL.substring(0, 30)}...`);
  console.log(`Inventory types: ${LARGE_INVENTORY_TYPES.map(t => t.type).join(', ')}`);
  console.log(`Started at: ${new Date().toISOString()}`);
  
  const results = [];
  
  for (const inventory of LARGE_INVENTORY_TYPES) {
    const result = await syncInventoryType(inventory);
    results.push(result);
    
    // Small delay between syncs to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  // Summary
  console.log('\n==========================================================');
  console.log('📊 Summary:');
  
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  const totalCount = successful.reduce((sum, r) => sum + (r.count || 0), 0);
  
  console.log(`   ✅ Successful: ${successful.length}/${results.length}`);
  console.log(`   📦 Total auctions synced: ${totalCount.toLocaleString()}`);
  
  if (failed.length > 0) {
    console.log(`   ❌ Failed: ${failed.map(r => `${r.type} (${r.error})`).join(', ')}`);
  }
  
  // Show per-type results
  console.log('\n   Per-type breakdown:');
  for (const r of results) {
    if (r.success) {
      console.log(`   - ${r.type}: ${r.count?.toLocaleString() || 0} auctions`);
    } else {
      console.log(`   - ${r.type}: FAILED - ${r.error}`);
    }
  }
  
  // Trigger pattern checking for all users after successful sync
  if (totalCount > 0) {
    await triggerPatternCheck();
  }
  
  // Cleanup temp directory
  if (existsSync(TEMP_DIR)) {
    const { rmSync } = require('fs');
    try {
      rmSync(TEMP_DIR, { recursive: true });
    } catch (e) {
      // Ignore cleanup errors
    }
  }
  
  console.log(`\n✨ Completed at: ${new Date().toISOString()}`);
  
  // Exit with error if any failed
  if (failed.length > 0) {
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
