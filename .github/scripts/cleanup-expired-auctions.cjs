#!/usr/bin/env node

/**
 * GitHub Actions script to clean up expired auctions before syncing.
 * Calls the delete_ended_auctions_batch RPC in a loop until count is under the threshold.
 *
 * Required secrets:
 * - SUPABASE_URL
 * - SUPABASE_ANON_KEY
 */

const SUPABASE_URL = (process.env.SUPABASE_URL || '').trim();
const SUPABASE_ANON_KEY = (process.env.SUPABASE_ANON_KEY || '').trim();

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_ANON_KEY');
  process.exit(1);
}

const BATCH_SIZE = 5000;
const MAX_ITERATIONS = 300; // safety cap: 300 × 5000 = 1.5M max
const DELAY_MS = 1000;
const TARGET_COUNT = 2_200_000; // aim well below the 2.5M gate

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function rpc(fnName, args = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fnName}`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(args),
  });
  if (!res.ok) throw new Error(`RPC ${fnName} failed: ${res.status} ${await res.text()}`);
  return res.json();
}

(async () => {
  console.log('🧹 Pre-sync cleanup: removing expired auctions...');
  const startTime = Date.now();
  let totalDeleted = 0;

  // First check current count
  const currentCount = await rpc('get_auction_count');
  console.log(`   Current auction count estimate: ${Number(currentCount).toLocaleString()}`);

  if (Number(currentCount) <= TARGET_COUNT) {
    console.log('   ✅ Already under target, no cleanup needed.');
    process.exit(0);
  }

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    try {
      const result = await rpc('delete_ended_auctions_batch', {
        batch_limit: BATCH_SIZE,
        older_than_hours: 24,
      });

      const row = Array.isArray(result) ? result[0] : result;
      const deleted = row?.deleted_count || 0;
      totalDeleted += deleted;

      if (deleted === 0) {
        console.log(`   No more expired auctions to delete.`);
        break;
      }

      if ((i + 1) % 10 === 0) {
        console.log(`   Batch ${i + 1}: deleted ${deleted}, total so far: ${totalDeleted.toLocaleString()}`);
        // Re-check count periodically
        const count = await rpc('get_auction_count');
        console.log(`   Estimated count: ${Number(count).toLocaleString()}`);
        if (Number(count) <= TARGET_COUNT) {
          console.log(`   ✅ Under target (${TARGET_COUNT.toLocaleString()}), stopping.`);
          break;
        }
      }

      await sleep(DELAY_MS);
    } catch (err) {
      console.error(`   ⚠️ Batch ${i + 1} error: ${err.message}`);
      await sleep(3000); // longer pause on error
    }
  }

  const elapsed = ((Date.now() - startTime) / 1000 / 60).toFixed(1);
  console.log(`\n✅ Cleanup complete: deleted ${totalDeleted.toLocaleString()} expired auctions in ${elapsed} minutes`);
})();
