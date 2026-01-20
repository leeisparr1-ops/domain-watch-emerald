#!/usr/bin/env node

/**
 * Local script to sync large GoDaddy inventory files to your database.
 * 
 * Usage:
 *   1. Install dependencies: npm install node-fetch adm-zip
 *   2. Set environment variables:
 *      - SUPABASE_URL (your Supabase project URL)
 *      - SUPABASE_SERVICE_ROLE_KEY (your service role key - NOT the anon key)
 *   3. Run: node scripts/sync-large-inventory.js
 * 
 * Or run with env vars inline:
 *   SUPABASE_URL=https://xxx.supabase.co SUPABASE_SERVICE_ROLE_KEY=xxx node scripts/sync-large-inventory.js
 */

const https = require('https');
const http = require('http');
const { createWriteStream, createReadStream, unlinkSync, existsSync, mkdirSync } = require('fs');
const { join } = require('path');
const { createUnzip } = require('zlib');
const { pipeline } = require('stream/promises');

// Large inventory files that are too big for edge functions
// These are the correct GoDaddy auction inventory URLs
const LARGE_INVENTORY_TYPES = [
  { type: 'closeout', url: 'https://auctions.godaddy.com/beta/closeout_listings.json.zip' },
  { type: 'allBiddable', url: 'https://auctions.godaddy.com/beta/all_biddable_listings.json.zip' },
  { type: 'allExpiring', url: 'https://auctions.godaddy.com/beta/all_expiring_listings.json.zip' },
  { type: 'allListings', url: 'https://auctions.godaddy.com/beta/all_listings.json.zip' },
  { type: 'endingToday', url: 'https://auctions.godaddy.com/beta/listings_ending_today.json.zip' },
];

// Configuration
const BATCH_SIZE = 1000;
const TEMP_DIR = join(process.cwd(), '.temp-inventory');

// Get Supabase credentials from environment
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing required environment variables:');
  console.error('   SUPABASE_URL (or VITE_SUPABASE_URL)');
  console.error('   SUPABASE_SERVICE_ROLE_KEY');
  console.error('');
  console.error('Get your service role key from your Supabase dashboard:');
  console.error('Project Settings > API > service_role (secret)');
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
    const protocol = url.startsWith('https') ? https : http;
    
    console.log(`   Downloading ${url}...`);
    
    protocol.get(url, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        // Handle redirect
        downloadFile(response.headers.location, destPath).then(resolve).catch(reject);
        return;
      }
      
      if (response.statusCode !== 200) {
        reject(new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`));
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
    }).on('error', (err) => {
      unlinkSync(destPath);
      reject(err);
    });
  });
}

/**
 * Extract JSON from a ZIP file (handles .json.zip format)
 */
async function extractJsonFromZip(zipPath) {
  // Dynamic import for adm-zip (needs to be installed)
  let AdmZip;
  try {
    AdmZip = require('adm-zip');
  } catch (e) {
    console.error('❌ Please install adm-zip: npm install adm-zip');
    process.exit(1);
  }
  
  console.log('   Extracting ZIP...');
  const zip = new AdmZip(zipPath);
  const entries = zip.getEntries();
  
  // Find the JSON file in the ZIP
  const jsonEntry = entries.find(e => e.entryName.endsWith('.json'));
  if (!jsonEntry) {
    throw new Error('No JSON file found in ZIP');
  }
  
  console.log(`   Found: ${jsonEntry.entryName} (${Math.round(jsonEntry.header.size / 1024 / 1024)}MB)`);
  
  const jsonContent = zip.readAsText(jsonEntry);
  return JSON.parse(jsonContent);
}

/**
 * Parse auction data from GoDaddy format
 */
function parseAuction(item, inventoryType) {
  return {
    domain_name: item.domainName || item.domain,
    price: parseFloat(item.price || item.currentPrice || item.minBid || 0),
    bid_count: parseInt(item.bidCount || item.bids || 0, 10),
    traffic_count: parseInt(item.traffic || 0, 10),
    end_time: item.endTime || item.auctionEndTime || null,
    inventory_source: `godaddy_${inventoryType}`,
    tld: (item.domainName || item.domain || '').split('.').pop() || null,
    auction_type: item.auctionType || inventoryType,
    valuation: item.valuation ? parseFloat(item.valuation) : null,
    domain_age: item.domainAge ? parseInt(item.domainAge, 10) : null,
  };
}

/**
 * Upsert auctions to Supabase in batches
 */
async function upsertAuctions(auctions) {
  let inserted = 0;
  
  for (let i = 0; i < auctions.length; i += BATCH_SIZE) {
    const batch = auctions.slice(i, i + BATCH_SIZE);
    
    const response = await fetch(`${SUPABASE_URL}/rest/v1/auctions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Prefer': 'resolution=merge-duplicates',
      },
      body: JSON.stringify(batch),
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to upsert batch: ${error}`);
    }
    
    inserted += batch.length;
    process.stdout.write(`\r   Inserted: ${inserted}/${auctions.length}`);
  }
  
  console.log(''); // New line
  return inserted;
}

/**
 * Record sync history
 */
async function recordSyncHistory(inventorySource, success, auctionsCount, durationMs, errorMessage = null) {
  await fetch(`${SUPABASE_URL}/rest/v1/sync_history`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    },
    body: JSON.stringify({
      inventory_source: inventorySource,
      success,
      auctions_count: auctionsCount,
      duration_ms: durationMs,
      error_message: errorMessage,
    }),
  });
}

/**
 * Sync a single inventory type
 */
async function syncInventoryType({ type, url }) {
  const startTime = Date.now();
  const zipPath = join(TEMP_DIR, `${type}.json.zip`);
  
  console.log(`\n📦 Syncing ${type}...`);
  
  try {
    // Download the ZIP file
    await downloadFile(url, zipPath);
    
    // Extract and parse JSON
    const data = await extractJsonFromZip(zipPath);
    
    // Handle different response formats
    let items = [];
    if (Array.isArray(data)) {
      items = data;
    } else if (data.domains) {
      items = data.domains;
    } else if (data.auctions) {
      items = data.auctions;
    } else if (data.items) {
      items = data.items;
    }
    
    console.log(`   Found ${items.length.toLocaleString()} auctions`);
    
    // Parse auctions
    const auctions = items
      .filter(item => item.domainName || item.domain)
      .map(item => parseAuction(item, type));
    
    // Upsert to database
    const inserted = await upsertAuctions(auctions);
    
    const duration = Date.now() - startTime;
    await recordSyncHistory(`godaddy_${type}`, true, inserted, duration);
    
    console.log(`   ✅ Synced ${inserted.toLocaleString()} auctions in ${Math.round(duration / 1000)}s`);
    
    // Cleanup
    if (existsSync(zipPath)) {
      unlinkSync(zipPath);
    }
    
    return { type, success: true, count: inserted };
  } catch (error) {
    const duration = Date.now() - startTime;
    await recordSyncHistory(`godaddy_${type}`, false, 0, duration, error.message);
    
    console.error(`   ❌ Failed: ${error.message}`);
    
    // Cleanup
    if (existsSync(zipPath)) {
      unlinkSync(zipPath);
    }
    
    return { type, success: false, error: error.message };
  }
}

/**
 * Main function
 */
async function main() {
  console.log('🚀 Large Inventory Sync Script');
  console.log('==============================');
  console.log(`Supabase URL: ${SUPABASE_URL}`);
  console.log(`Inventory types: ${LARGE_INVENTORY_TYPES.map(t => t.type).join(', ')}`);
  
  const results = [];
  
  for (const inventory of LARGE_INVENTORY_TYPES) {
    const result = await syncInventoryType(inventory);
    results.push(result);
  }
  
  // Summary
  console.log('\n==============================');
  console.log('📊 Summary:');
  
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  const totalCount = successful.reduce((sum, r) => sum + r.count, 0);
  
  console.log(`   ✅ Successful: ${successful.length}/${results.length}`);
  console.log(`   📦 Total auctions synced: ${totalCount.toLocaleString()}`);
  
  if (failed.length > 0) {
    console.log(`   ❌ Failed: ${failed.map(r => r.type).join(', ')}`);
  }
  
  // Cleanup temp directory
  if (existsSync(TEMP_DIR)) {
    const { rmSync } = require('fs');
    rmSync(TEMP_DIR, { recursive: true });
  }
  
  console.log('\n✨ Done!');
}

main().catch(console.error);
