/**
 * Sedo Auction Sync — fetches Sedo's public auction text feeds
 * and upserts into the auctions table via bulk-upsert-auctions edge function.
 *
 * Feed format: domain;start_unix;end_unix;price;currency;bid_count;
 * Currency: $US, EUR, &#163; (GBP)
 */

const SUPABASE_URL = process.env.SUPABASE_URL;
const SYNC_SECRET = process.env.SYNC_SECRET;

const SEDO_FEED_URL = 'https://sedo.com/txt/auctions_us.txt';
const BATCH_SIZE = 500;
const BATCH_DELAY_MS = 400;

// Approximate conversion rates (updated periodically)
const CURRENCY_TO_USD = {
  '$US': 1,
  'EUR': 1.08,
  '&#163;': 1.27, // GBP
  'GBP': 1.27,
};

function extractTld(domain) {
  const parts = domain.split('.');
  if (parts.length > 1) {
    // Handle ccSLDs like .co.uk, .com.au
    if (parts.length > 2 && parts[parts.length - 2].length <= 3) {
      return `.${parts.slice(-2).join('.')}`;
    }
    return `.${parts[parts.length - 1]}`;
  }
  return '';
}

function parseSedoLine(line) {
  const parts = line.split(';');
  if (parts.length < 6) return null;

  const domain = parts[0].trim().toLowerCase();
  if (!domain || !domain.includes('.')) return null;

  const startUnix = parseInt(parts[1]);
  const endUnix = parseInt(parts[2]);
  const rawPrice = parseInt(parts[3]) || 0;
  const currency = parts[4].trim();
  const bidCount = parseInt(parts[5]) || 0;

  // Convert price to USD
  const rate = CURRENCY_TO_USD[currency] || 1;
  const priceUsd = Math.round(rawPrice * rate);

  const endTime = endUnix ? new Date(endUnix * 1000).toISOString() : null;

  return {
    domain_name: domain,
    price: priceUsd,
    bid_count: bidCount,
    traffic_count: 0,
    end_time: endTime,
    auction_type: bidCount > 0 ? 'Bid' : 'auction',
    tld: extractTld(domain),
    inventory_source: 'sedo',
    domain_age: 0,
    valuation: 0,
  };
}

async function upsertBatch(auctions) {
  const url = `${SUPABASE_URL}/functions/v1/bulk-upsert-auctions`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-sync-secret': SYNC_SECRET,
    },
    body: JSON.stringify({
      auctions,
      skip_scoring: true,
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`bulk-upsert failed ${res.status}: ${text}`);
  }
  return res.json();
}

async function main() {
  console.log('🔄 Fetching Sedo auction feed...');
  const response = await fetch(SEDO_FEED_URL);
  if (!response.ok) {
    throw new Error(`Failed to fetch Sedo feed: ${response.status}`);
  }

  const text = await response.text();
  const lines = text.split('\n').filter(l => l.trim());
  console.log(`📋 Got ${lines.length} lines from Sedo feed`);

  const auctions = [];
  let skipped = 0;
  for (const line of lines) {
    const parsed = parseSedoLine(line);
    if (parsed) {
      auctions.push(parsed);
    } else {
      skipped++;
    }
  }

  console.log(`✅ Parsed ${auctions.length} auctions (${skipped} skipped)`);

  // Upsert in batches
  let totalUpserted = 0;
  let errors = 0;
  for (let i = 0; i < auctions.length; i += BATCH_SIZE) {
    const batch = auctions.slice(i, i + BATCH_SIZE);
    try {
      const result = await upsertBatch(batch);
      totalUpserted += batch.length;
      console.log(`  Batch ${Math.floor(i / BATCH_SIZE) + 1}: ${batch.length} upserted`);
    } catch (err) {
      console.error(`  Batch ${Math.floor(i / BATCH_SIZE) + 1} error:`, err.message);
      errors++;
    }
    if (i + BATCH_SIZE < auctions.length) {
      await new Promise(r => setTimeout(r, BATCH_DELAY_MS));
    }
  }

  // Log sync result via edge function (no service role key needed)
  console.log(`📊 Sync summary: ${totalUpserted} upserted, ${errors} errors`);

  console.log(`\n🏁 Sedo sync complete: ${totalUpserted} auctions synced, ${errors} errors`);
}

main().catch(err => {
  console.error('❌ Sedo sync failed:', err);
  process.exit(1);
});
