#!/usr/bin/env node

/**
 * GitHub Actions script to clean up expired auctions before syncing.
 * Calls the existing cleanup-expired-auctions backend function using SYNC_SECRET
 * and loops until the database is back under the safe threshold.
 *
 * Required secrets:
 * - SUPABASE_URL
 * - SYNC_SECRET
 */

const { appendFileSync } = require('fs');

const SUPABASE_URL = (process.env.SUPABASE_URL || '').trim();
const SYNC_SECRET = (process.env.SYNC_SECRET || '').trim();

if (!SUPABASE_URL || !SYNC_SECRET) {
  console.error('❌ Missing SUPABASE_URL or SYNC_SECRET');
  process.exit(1);
}

const TARGET_COUNT = 2_200_000;
const DAYS_OLD = 1;
const MAX_BATCHES_PER_RUN = 500;
const MAX_RUNS = 10;
const DELAY_MS = 1500;
const REQUEST_TIMEOUT_MS = 5 * 60 * 1000;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function setGithubOutput(name, value) {
  const outputPath = process.env.GITHUB_OUTPUT;
  if (!outputPath) return;
  appendFileSync(outputPath, `${name}=${value}\n`);
}

async function invokeCleanup(runNumber) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(
      `${SUPABASE_URL}/functions/v1/cleanup-expired-auctions?days=${DAYS_OLD}&maxBatches=${MAX_BATCHES_PER_RUN}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${SYNC_SECRET}`,
        },
        signal: controller.signal,
      }
    );

    const text = await response.text();
    let payload = {};

    if (text) {
      try {
        payload = JSON.parse(text);
      } catch {
        payload = { raw: text };
      }
    }

    if (!response.ok) {
      throw new Error(`Cleanup run ${runNumber} failed: ${response.status} ${text}`);
    }

    return payload;
  } finally {
    clearTimeout(timeout);
  }
}

(async () => {
  console.log('🧹 Pre-sync cleanup: removing expired auctions via backend function...');
  const startTime = Date.now();
  let totalDeleted = 0;
  let totalHarvested = 0;
  let latestEstimate = null;
  let healthy = false;

  for (let run = 1; run <= MAX_RUNS; run++) {
    const result = await invokeCleanup(run);
    const deleted = Number(result.deleted || 0);
    const harvested = Number(result.harvested || 0);
    const estimate = typeof result.auctionCountEstimate === 'number'
      ? result.auctionCountEstimate
      : null;

    totalDeleted += deleted;
    totalHarvested += harvested;
    latestEstimate = estimate;

    console.log(
      `   Run ${run}: deleted ${deleted.toLocaleString()}, harvested ${harvested.toLocaleString()}, estimated count: ${estimate === null ? 'unknown' : estimate.toLocaleString()}`
    );

    if (estimate !== null && estimate <= TARGET_COUNT) {
      healthy = true;
      console.log(`   ✅ Database is under target (${TARGET_COUNT.toLocaleString()}).`);
      break;
    }

    if (deleted === 0) {
      // If nothing was deleted AND we couldn't get an estimate, assume healthy
      // (no expired rows to clean = DB is in good shape)
      if (estimate === null) {
        healthy = true;
        console.log('   ✅ No expired auctions found and estimate unavailable — assuming healthy.');
      } else {
        console.log('   No more expired auctions were deleted in this pass.');
      }
      break;
    }

    if (run < MAX_RUNS) {
      await sleep(DELAY_MS);
    }
  }

  setGithubOutput('healthy', healthy ? 'true' : 'false');
  if (latestEstimate !== null) {
    setGithubOutput('auction_count_estimate', String(latestEstimate));
  }

  const elapsed = ((Date.now() - startTime) / 1000 / 60).toFixed(1);
  console.log(
    `\n✅ Cleanup complete: deleted ${totalDeleted.toLocaleString()} expired auctions, harvested ${totalHarvested.toLocaleString()} sales in ${elapsed} minutes`
  );

  if (!healthy) {
    console.log('⏸️ Database is still above target; sync jobs will be skipped until the next run.');
  }
})().catch((error) => {
  setGithubOutput('healthy', 'false');
  console.error(`❌ Pre-sync cleanup failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
