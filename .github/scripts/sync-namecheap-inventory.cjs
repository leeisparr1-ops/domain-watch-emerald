#!/usr/bin/env node

/**
 * GitHub Actions script to sync Namecheap auction inventory.
 * Downloads the publicly accessible CSV export from CloudFront and syncs to the database.
 *
 * Required secrets:
 * - SUPABASE_URL
 * - SYNC_SECRET (shared secret for authenticating with the edge function)
 */

const { createReadStream, unlinkSync, existsSync, mkdirSync, writeFileSync, statSync } = require('fs');
const { join } = require('path');
const { createInterface } = require('readline');
const { pipeline } = require('stream/promises');
const { createWriteStream } = require('fs');

const fetch = global.fetch;
if (typeof fetch !== 'function') {
  console.error('❌ This script requires Node.js 18+ (global fetch missing).');
  process.exit(1);
}

// Direct CloudFront URL for the Namecheap CSV export (public, no auth required)
const CSV_URL = 'https://d3ry1h4w5036x1.cloudfront.net/reports/Namecheap_Market_Sales.csv';

// SAFE Configuration - Serial processing to prevent DB saturation
const BATCH_SIZE = 500;
const PARALLEL_REQUESTS = 1;
const BATCH_DELAY_MS = 2000;
const TEMP_DIR = join(process.cwd(), '.temp-inventory');
const DOWNLOAD_TIMEOUT_MS = 600000; // 10 minutes

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Get credentials from environment
const SUPABASE_URL = (process.env.SUPABASE_URL || '').trim();
const SYNC_SECRET = (process.env.SYNC_SECRET || '').trim();

if (!SUPABASE_URL || !SYNC_SECRET) {
  console.error('❌ Missing required environment variables: SUPABASE_URL, SYNC_SECRET');
  process.exit(1);
}

if (!SUPABASE_URL.startsWith('https://')) {
  console.error('❌ SUPABASE_URL must start with "https://"');
  process.exit(1);
}

if (!existsSync(TEMP_DIR)) {
  mkdirSync(TEMP_DIR, { recursive: true });
}

/**
 * Download CSV directly via HTTP (no browser required)
 */
async function downloadCsv() {
  console.log('📥 Downloading Namecheap CSV from CloudFront...');
  console.log(`   URL: ${CSV_URL}`);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DOWNLOAD_TIMEOUT_MS);

  try {
    const response = await fetch(CSV_URL, {
      signal: controller.signal,
      headers: { 'User-Agent': 'DomainPulse/1.0' },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const contentLength = response.headers.get('content-length');
    const lastModified = response.headers.get('last-modified');
    console.log(`   Size: ${contentLength ? (parseInt(contentLength) / 1024 / 1024).toFixed(1) + 'MB' : 'unknown'}`);
    console.log(`   Last modified: ${lastModified || 'unknown'}`);

    const csvPath = join(TEMP_DIR, 'Namecheap_Market_Sales.csv');
    const fileStream = createWriteStream(csvPath);
    const reader = response.body.getReader();
    let downloaded = 0;
    const totalBytes = contentLength ? parseInt(contentLength) : 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      fileStream.write(Buffer.from(value));
      downloaded += value.length;

      if (totalBytes > 0 && downloaded % (10 * 1024 * 1024) < value.length) {
        const pct = ((downloaded / totalBytes) * 100).toFixed(1);
        console.log(`   Downloaded ${(downloaded / 1024 / 1024).toFixed(1)}MB / ${(totalBytes / 1024 / 1024).toFixed(1)}MB (${pct}%)`);
      }
    }

    fileStream.end();
    await new Promise((resolve) => fileStream.on('finish', resolve));

    const stats = statSync(csvPath);
    console.log(`   ✅ Downloaded ${(stats.size / 1024 / 1024).toFixed(2)}MB to ${csvPath}`);

    return csvPath;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Parse CSV file and extract auction records (streaming)
 */
async function parseNamecheapCsv(csvPath) {
  console.log('📄 Parsing CSV file...');

  return new Promise((resolve, reject) => {
    const auctions = [];
    let headers = null;
    let lineCount = 0;

    const rl = createInterface({
      input: createReadStream(csvPath, { encoding: 'utf-8' }),
      crlfDelay: Infinity,
    });

    rl.on('line', (line) => {
      lineCount++;
      if (!line.trim()) return;

      const values = parseCSVLine(line);

      if (!headers) {
        headers = values.map((h) => h.toLowerCase().trim());
        console.log(`   Headers: ${headers.join(', ')}`);
        return;
      }

      const record = {};
      headers.forEach((header, i) => {
        record[header] = values[i] || '';
      });

      const auction = parseNamecheapRecord(record);
      if (auction) auctions.push(auction);

      if (lineCount % 100000 === 0) {
        console.log(`   Parsed ${lineCount.toLocaleString()} lines, ${auctions.length.toLocaleString()} valid auctions...`);
      }
    });

    rl.on('close', () => {
      console.log(`   ✅ Parsed ${auctions.length.toLocaleString()} auctions from ${lineCount.toLocaleString()} lines`);
      resolve(auctions);
    });

    rl.on('error', reject);
  });
}

function parseCSVLine(line) {
  const values = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      values.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  values.push(current.trim());
  return values;
}

/**
 * Parse a Namecheap CSV record to our auction format.
 * CSV headers (2026-03 export):
 * url, name, startDate, endDate, price, startPrice, renewPrice, bidCount,
 * ahrefsDomainRating, umbrellaRanking, cloudflareRanking, estibotValue,
 * extensionsTaken, keywordSearchCount, registeredDate, lastSoldPrice,
 * lastSoldYear, isPartnerSale, semrushAScore, majesticCitation,
 * ahrefsBacklinks, semrushBacklinks, majesticBacklinks, majesticTrustFlow, goValue
 */
function parseNamecheapRecord(record) {
  const domain = (record['name'] || '').trim().toLowerCase();
  if (!domain || !domain.includes('.') || /\s/.test(domain)) return null;

  const price = parseFloat(String(record['price'] || '0').replace(/[$,\s]/g, '')) || 0;
  const bids = parseInt(String(record['bidcount'] || '0').replace(/[,\s]/g, ''), 10) || 0;

  let endTime = null;
  const endRaw = record['enddate'] || '';
  if (endRaw) {
    const d = new Date(endRaw);
    if (!Number.isNaN(d.getTime())) endTime = d.toISOString();
  }

  // Compute domain age from registeredDate
  let domainAge = 0;
  const regDate = record['registereddate'] || '';
  if (regDate) {
    const rd = new Date(regDate);
    if (!Number.isNaN(rd.getTime())) {
      domainAge = Math.floor((Date.now() - rd.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
    }
  }

  // Extract valuation from estibotValue or goValue
  const estibotVal = parseFloat(String(record['estibotvalue'] || '0').replace(/[$,\s]/g, '')) || 0;
  const goVal = parseFloat(String(record['govalue'] || '0').replace(/[$,\s]/g, '')) || 0;
  const valuation = estibotVal || goVal || 0;

  const parts = domain.split('.');
  const tld = parts.length > 1 ? `.${parts[parts.length - 1]}` : '';
  const auctionType = bids > 0 ? 'auction' : 'buy-now';

  return {
    domain_name: domain,
    price,
    bid_count: bids,
    traffic_count: 0,
    end_time: endTime,
    inventory_source: 'namecheap',
    tld,
    auction_type: auctionType,
    valuation,
    domain_age: domainAge,
  };
}

/**
 * Send a single batch to the edge function
 */
async function sendBatch(batch, inventorySource) {
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
      return { success: false, error: error.substring(0, 200), count: 0 };
    }

    const result = await response.json();
    return {
      success: true,
      count: result.inserted || batch.length,
      errors: result.errors || 0,
    };
  } catch (err) {
    return { success: false, error: err.message, count: 0 };
  }
}

/**
 * Send auctions to the edge function using serial batch processing
 */
async function upsertAuctionsViaEdgeFunction(auctions, inventorySource) {
  let inserted = 0;
  let errors = 0;

  const batches = [];
  for (let i = 0; i < auctions.length; i += BATCH_SIZE) {
    batches.push(auctions.slice(i, i + BATCH_SIZE));
  }

  console.log(`   Processing ${batches.length} batches of ${BATCH_SIZE} records (serial)...`);

  for (let i = 0; i < batches.length; i++) {
    const result = await sendBatch(batches[i], inventorySource);

    if (result.success) {
      inserted += result.count;
      errors += result.errors || 0;
    } else {
      errors += batches[i].length;
      console.error(`   ❌ Batch ${i + 1} failed: ${result.error}`);
    }

    if ((i + 1) % 50 === 0 || i === batches.length - 1) {
      const pct = (((i + 1) / batches.length) * 100).toFixed(1);
      console.log(`   Progress: ${i + 1}/${batches.length} batches (${pct}%) — ${inserted.toLocaleString()} inserted, ${errors.toLocaleString()} errors`);
    }

    if (i < batches.length - 1) {
      await sleep(BATCH_DELAY_MS);
    }
  }

  return { inserted, errors };
}

/**
 * Record sync result in the sync_history table
 */
async function recordSyncHistory(auctionsCount, success, durationMs, errorMessage) {
  try {
    await fetch(`${SUPABASE_URL}/functions/v1/bulk-upsert-auctions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-sync-secret': SYNC_SECRET,
      },
      body: JSON.stringify({
        record_sync_history: true,
        inventory_source: 'namecheap',
        auctions_count: auctionsCount,
        success,
        duration_ms: durationMs,
        error_message: errorMessage,
      }),
    });
  } catch (err) {
    console.error('   ⚠️ Failed to record sync history:', err.message);
  }
}

// Main
(async () => {
  const startTime = Date.now();
  console.log('🚀 Starting Namecheap inventory sync...');
  console.log(`   Time: ${new Date().toISOString()}`);

  try {
    // Step 1: Download CSV
    const csvPath = await downloadCsv();

    // Step 2: Parse CSV
    const auctions = await parseNamecheapCsv(csvPath);

    if (auctions.length === 0) {
      throw new Error('No valid auctions parsed from CSV');
    }

    // Step 3: Upsert to database
    console.log(`\n📤 Uploading ${auctions.length.toLocaleString()} auctions...`);
    const { inserted, errors } = await upsertAuctionsViaEdgeFunction(auctions, 'namecheap');

    const durationMs = Date.now() - startTime;
    console.log(`\n✅ Namecheap sync completed in ${(durationMs / 1000 / 60).toFixed(1)} minutes`);
    console.log(`   Inserted: ${inserted.toLocaleString()}`);
    console.log(`   Errors: ${errors.toLocaleString()}`);

    await recordSyncHistory(inserted, true, durationMs, null);

    // Cleanup
    try { unlinkSync(csvPath); } catch {}

  } catch (error) {
    const durationMs = Date.now() - startTime;
    console.error(`\n❌ Sync failed after ${(durationMs / 1000).toFixed(1)}s:`, error.message);
    await recordSyncHistory(0, false, durationMs, error.message);
    process.exit(1);
  }
})();
