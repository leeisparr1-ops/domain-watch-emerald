#!/usr/bin/env node

/**
 * GitHub Actions script to sync Namecheap auction inventory via Playwright browser automation.
 * Downloads the CSV export from the public auctions page and syncs to the database.
 * 
 * Required secrets:
 * - SUPABASE_URL
 * - SYNC_SECRET (shared secret for authenticating with the edge function)
 */

const { chromium } = require('playwright');
const { createReadStream, unlinkSync, existsSync, mkdirSync, readFileSync } = require('fs');
const { join } = require('path');
const { createInterface } = require('readline');

// Node.js 18+ provides a built-in fetch() (Node 20 in GitHub Actions).
const fetch = global.fetch;
if (typeof fetch !== 'function') {
  console.error('❌ This script requires Node.js 18+ (global fetch missing).');
  process.exit(1);
}

// Namecheap auctions page URL
const NAMECHEAP_AUCTIONS_URL = 'https://www.namecheap.com/market/auctions/';
const EXPECTED_CSV_FILENAME = 'Namecheap_Market_Sales.csv';

// Processing configuration - optimized for ~1M records
const BATCH_SIZE = 1000;
const PARALLEL_REQUESTS = 5;
const BATCH_DELAY_MS = 50;
const TEMP_DIR = join(process.cwd(), '.temp-inventory');
const DOWNLOAD_TIMEOUT_MS = 600000; // 10 minutes for 170MB file

// Navigation config: Namecheap is highly dynamic and often never becomes "networkidle"
const PAGE_GOTO_TIMEOUT_MS = 120000; // 2 minutes
const PAGE_GOTO_RETRIES = 3;
const DOWNLOAD_BUTTON_TIMEOUT_MS = 45000; // 45s
const RETRY_BASE_DELAY_MS = 5000;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Get credentials from environment
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
 * Download CSV using Playwright browser automation
 */
async function downloadCsvWithPlaywright() {
  console.log('🌐 Launching browser...');
  console.log(`   PLAYWRIGHT_BROWSERS_PATH=${process.env.PLAYWRIGHT_BROWSERS_PATH || '(default)'}`);
  let resolvedExecutablePath;
  try {
    resolvedExecutablePath = chromium.executablePath();
    console.log(`   Chromium executablePath: ${resolvedExecutablePath}`);
  } catch (e) {
    console.log(`   Chromium executablePath unavailable: ${e?.message || e}`);
  }
  
  const launchOptions = {
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  };

  // Only set executablePath if it *actually exists*.
  // In some CI setups, Playwright may have downloaded only a headless shell or changed paths,
  // and forcing a non-existent path causes a hard failure.
  if (resolvedExecutablePath && existsSync(resolvedExecutablePath)) {
    launchOptions.executablePath = resolvedExecutablePath;
  } else if (resolvedExecutablePath) {
    console.log('   Note: resolved Chromium executablePath does not exist on disk; letting Playwright choose.');
  }

  console.log(`   Launch options: headless=${launchOptions.headless}, executablePath=${launchOptions.executablePath || '(default)'}`);

  const browser = await chromium.launch(launchOptions);
  
  const context = await browser.newContext({
    acceptDownloads: true,
    userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  });
  
  const page = await context.newPage();
  
  try {
    console.log(`   Navigating to ${NAMECHEAP_AUCTIONS_URL}...`);

    // Namecheap continuously streams resources; waiting for "networkidle" is flaky in CI.
    // Use domcontentloaded + retries/backoff instead.
    let lastNavError;
    for (let attempt = 1; attempt <= PAGE_GOTO_RETRIES; attempt++) {
      try {
        if (attempt > 1) {
          console.log(`   Retry navigation (attempt ${attempt}/${PAGE_GOTO_RETRIES})...`);
        }

        await page.goto(NAMECHEAP_AUCTIONS_URL, {
          waitUntil: 'domcontentloaded',
          timeout: PAGE_GOTO_TIMEOUT_MS,
        });

        lastNavError = undefined;
        break;
      } catch (e) {
        lastNavError = e;
        console.log(`   Navigation attempt ${attempt} failed: ${e?.message || e}`);
        if (attempt < PAGE_GOTO_RETRIES) {
          const backoff = RETRY_BASE_DELAY_MS * attempt;
          console.log(`   Waiting ${Math.round(backoff / 1000)}s before retry...`);
          await sleep(backoff);
        }
      }
    }

    if (lastNavError) throw lastNavError;

    // Give client-side JS time to render export UI
    await page.waitForTimeout(3000);
    
    // Look for the CSV download link/button - try multiple selectors
    console.log('   Looking for CSV download button...');
    
    // Try different selectors for the download button
    const downloadSelectors = [
      'text=Download as CSV',
      'text=Export all current domain auctions to CSV',
      'a:has-text("CSV")',
      'button:has-text("CSV")',
      '[data-testid*="csv"]',
      '[data-testid*="download"]',
      'a[href*=".csv"]',
    ];
    
    let downloadButton = null;

    try {
      const winner = await Promise.any(
        downloadSelectors.map((selector) => {
          const locator = page.locator(selector).first();
          return locator
            .waitFor({ state: 'visible', timeout: DOWNLOAD_BUTTON_TIMEOUT_MS })
            .then(() => ({ selector, locator }));
        })
      );

      downloadButton = winner.locator;
      console.log(`   Found download button with selector: ${winner.selector}`);
    } catch {
      downloadButton = null;
    }
    
    if (!downloadButton) {
      // Take screenshot for debugging
      const screenshotPath = join(TEMP_DIR, 'debug-screenshot.png');
      await page.screenshot({ path: screenshotPath, fullPage: true });
      console.log(`   Screenshot saved to: ${screenshotPath}`);
      throw new Error('Could not find CSV download button on page');
    }
    
    // Start download and wait for it
    console.log('   Clicking download button...');
    const downloadPromise = page.waitForEvent('download', { timeout: DOWNLOAD_TIMEOUT_MS });
    await downloadButton.click();
    
    console.log('   Waiting for download to start...');
    const download = await downloadPromise;
    
    // Get suggested filename
    const suggestedFilename = download.suggestedFilename();
    console.log(`   Download started: ${suggestedFilename}`);
    
    // Save to temp directory
    const csvPath = join(TEMP_DIR, suggestedFilename || EXPECTED_CSV_FILENAME);
    await download.saveAs(csvPath);
    
    // Verify file was downloaded
    if (!existsSync(csvPath)) {
      throw new Error('Download completed but file not found');
    }
    
    const stats = require('fs').statSync(csvPath);
    console.log(`   ✅ Downloaded ${(stats.size / 1024 / 1024).toFixed(2)}MB to ${csvPath}`);
    
    await browser.close();
    return csvPath;
    
  } catch (error) {
    // Take screenshot for debugging
    try {
      const screenshotPath = join(TEMP_DIR, 'error-screenshot.png');
      await page.screenshot({ path: screenshotPath, fullPage: true });
      console.log(`   Error screenshot saved to: ${screenshotPath}`);
    } catch {}
    
    await browser.close();
    throw error;
  }
}

/**
 * Parse CSV file and extract auction records
 * Uses streaming to handle large files efficiently
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
      
      // Skip empty lines
      if (!line.trim()) return;
      
      // Parse CSV line (handle quoted values)
      const values = parseCSVLine(line);
      
      // First non-empty line is headers
      if (!headers) {
        headers = values.map(h => h.toLowerCase().trim());
        console.log(`   Headers: ${headers.join(', ')}`);
        return;
      }
      
      // Create record from values
      const record = {};
      headers.forEach((header, i) => {
        record[header] = values[i] || '';
      });
      
      // Parse to our auction format
      const auction = parseNamecheapRecord(record);
      if (auction) {
        auctions.push(auction);
      }
      
      // Progress update every 100k lines
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

/**
 * Parse a single CSV line, handling quoted values
 */
function parseCSVLine(line) {
  const values = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        // Escaped quote
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
 * Parse a Namecheap CSV record to our auction format
 * Expected columns (based on typical Namecheap export):
 * - Domain, Price (USD), Bids, Time Left, etc.
 */
function parseNamecheapRecord(record) {
  // Try different column name variations
  const domain = record['domain'] || record['domain name'] || record['domainname'] || '';
  
  if (!domain || !domain.includes('.')) {
    return null;
  }
  
  // Parse price (remove $ and commas)
  const priceRaw = record['price'] || record['price (usd)'] || record['current price'] || record['min bid'] || '0';
  const price = parseFloat(priceRaw.replace(/[$,]/g, '')) || 0;
  
  // Parse bids
  const bids = parseInt(record['bids'] || record['bid count'] || '0', 10) || 0;
  
  // Parse end time - Namecheap uses various formats
  let endTime = null;
  const timeLeft = record['time left'] || record['timeleft'] || record['ends'] || record['end time'] || '';
  if (timeLeft) {
    endTime = parseTimeLeft(timeLeft);
  }
  
  // Extract TLD
  const parts = domain.split('.');
  const tld = parts.length > 1 ? `.${parts[parts.length - 1]}` : '';
  
  // Auction type - Namecheap has auctions and buy-now
  const auctionType = bids > 0 ? 'auction' : 'buy-now';
  
  return {
    domain_name: domain.toLowerCase(),
    price,
    bid_count: bids,
    traffic_count: 0, // Namecheap CSV doesn't include traffic
    end_time: endTime,
    inventory_source: 'namecheap',
    tld,
    auction_type: auctionType,
    valuation: 0, // Not available in CSV
    domain_age: 0, // Not available in CSV
  };
}

/**
 * Parse "time left" string to ISO date
 * Examples: "19 hours", "3 days", "1 month", "14 days"
 */
function parseTimeLeft(timeLeft) {
  const now = new Date();
  const lower = timeLeft.toLowerCase().trim();
  
  // Match patterns like "19 hours", "3 days", "1 month"
  const match = lower.match(/(\d+)\s*(hour|day|week|month|minute|min|hr)/);
  if (!match) {
    // If it's already an ISO date, return it
    if (/^\d{4}-\d{2}-\d{2}/.test(timeLeft)) {
      return timeLeft;
    }
    // Default to 7 days if unparseable
    return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
  }
  
  const amount = parseInt(match[1], 10);
  const unit = match[2];
  
  let msToAdd = 0;
  switch (unit) {
    case 'minute':
    case 'min':
      msToAdd = amount * 60 * 1000;
      break;
    case 'hour':
    case 'hr':
      msToAdd = amount * 60 * 60 * 1000;
      break;
    case 'day':
      msToAdd = amount * 24 * 60 * 60 * 1000;
      break;
    case 'week':
      msToAdd = amount * 7 * 24 * 60 * 60 * 1000;
      break;
    case 'month':
      msToAdd = amount * 30 * 24 * 60 * 60 * 1000;
      break;
    default:
      msToAdd = 7 * 24 * 60 * 60 * 1000; // Default 7 days
  }
  
  return new Date(now.getTime() + msToAdd).toISOString();
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
      errors: result.errors || 0
    };
  } catch (err) {
    return { success: false, error: err.message, count: 0 };
  }
}

/**
 * Send auctions to the edge function using parallel batch processing
 */
async function upsertAuctionsViaEdgeFunction(auctions, inventorySource) {
  let inserted = 0;
  let errors = 0;
  
  // Create all batches upfront
  const batches = [];
  for (let i = 0; i < auctions.length; i += BATCH_SIZE) {
    batches.push(auctions.slice(i, i + BATCH_SIZE));
  }
  
  console.log(`   Processing ${batches.length} batches of ${BATCH_SIZE} records (${PARALLEL_REQUESTS} parallel)...`);
  
  // Process batches in parallel waves
  for (let i = 0; i < batches.length; i += PARALLEL_REQUESTS) {
    const wave = batches.slice(i, i + PARALLEL_REQUESTS);
    
    // Send all batches in this wave in parallel
    const results = await Promise.all(
      wave.map(batch => sendBatch(batch, inventorySource))
    );
    
    // Aggregate results
    for (const result of results) {
      if (result.success) {
        inserted += result.count;
        errors += result.errors || 0;
      } else {
        errors++;
        // Log but don't spam - only first error per wave
        if (results.indexOf(result) === 0) {
          console.error(`\n   Batch error: ${result.error}`);
        }
      }
    }
    
    const processed = Math.min((i + PARALLEL_REQUESTS), batches.length);
    const percent = Math.round((processed / batches.length) * 100);
    process.stdout.write(`\r   Progress: ${percent}% | Inserted: ${inserted.toLocaleString()} | Errors: ${errors}`);
    
    // Small delay between waves to prevent overwhelming the database
    if (i + PARALLEL_REQUESTS < batches.length) {
      await new Promise(resolve => setTimeout(resolve, BATCH_DELAY_MS));
    }
  }
  
  console.log(''); // New line
  return { inserted, errors };
}

/**
 * Main function
 */
async function main() {
  console.log('🚀 Namecheap Auction Sync (Playwright + GitHub Actions)');
  console.log('========================================================');
  console.log(`Supabase URL: ${SUPABASE_URL.substring(0, 30)}...`);
  console.log(`Config: BATCH_SIZE=${BATCH_SIZE}, PARALLEL=${PARALLEL_REQUESTS}`);
  console.log(`Started at: ${new Date().toISOString()}`);
  
  const startTime = Date.now();
  let csvPath = null;
  
  try {
    // Step 1: Download CSV via browser automation
    csvPath = await downloadCsvWithPlaywright();
    
    // Step 2: Parse CSV file
    const auctions = await parseNamecheapCsv(csvPath);
    
    if (auctions.length === 0) {
      throw new Error('No valid auctions found in CSV');
    }
    
    // Step 3: Upsert to database
    console.log('\n📤 Uploading to database...');
    const { inserted, errors } = await upsertAuctionsViaEdgeFunction(auctions, 'namecheap');
    
    const duration = Date.now() - startTime;
    
    // Summary
    console.log('\n========================================================');
    console.log('📊 Summary:');
    console.log(`   ✅ Total auctions synced: ${inserted.toLocaleString()}`);
    console.log(`   ⚠️ Errors: ${errors}`);
    console.log(`   ⏱️ Duration: ${Math.round(duration / 1000 / 60)} minutes`);
    console.log(`   Finished at: ${new Date().toISOString()}`);
    
    // Cleanup
    if (csvPath && existsSync(csvPath)) {
      unlinkSync(csvPath);
      console.log('\n🧹 Cleaned up temp files');
    }
    
  } catch (error) {
    console.error(`\n❌ Sync failed: ${error.message}`);
    console.error(error.stack);
    
    // Cleanup on error too
    if (csvPath && existsSync(csvPath)) {
      unlinkSync(csvPath);
    }
    
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
