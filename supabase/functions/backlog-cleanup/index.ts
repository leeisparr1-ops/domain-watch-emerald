import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * High-throughput self-chaining cleanup for ended auctions.
 * Designed to clear 1M+ stale rows safely without saturating the DB.
 *
 * Uses the `delete_ended_auctions_batch` RPC (FOR UPDATE SKIP LOCKED)
 * in a tight loop, then re-invokes itself if time is running low and
 * rows remain.
 *
 * Query params:
 *   older_than_hours (default 0) – only delete rows ended N hours ago
 *   batch_size (default 1000) – rows per RPC call
 *   max_seconds (default 120) – wall-clock budget before self-chaining
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Auth
  const syncSecret = Deno.env.get("SYNC_SECRET");
  const authHeader = req.headers.get("Authorization");
  const provided =
    authHeader?.replace("Bearer ", "") ||
    req.headers.get("X-Sync-Secret");

  if (!syncSecret || provided !== syncSecret) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const url = new URL(req.url);
  const olderThanHours = parseInt(url.searchParams.get("older_than_hours") || "0");
  const batchSize = Math.min(parseInt(url.searchParams.get("batch_size") || "1000"), 2000);
  const maxSeconds = Math.min(parseInt(url.searchParams.get("max_seconds") || "120"), 140);

  // Parse optional chain count from body
  let chainCount = 0;
  try {
    const body = await req.json();
    chainCount = body?.chain_count || 0;
  } catch {
    // no body
  }

  const startTime = Date.now();

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  let totalDeleted = 0;
  let batchCount = 0;
  let consecutiveErrors = 0;
  let lastRemainingEstimate: number | null = null;
  let shouldChain = false;

  console.log(
    `[backlog-cleanup] chain=${chainCount} olderThanHours=${olderThanHours} batchSize=${batchSize} maxSeconds=${maxSeconds}`
  );

  while (true) {
    // Time budget check
    const elapsed = (Date.now() - startTime) / 1000;
    if (elapsed >= maxSeconds) {
      console.log(`[backlog-cleanup] Time budget exhausted at ${elapsed.toFixed(1)}s`);
      shouldChain = true;
      break;
    }

    // Call the RPC
    const { data, error } = await supabase.rpc("delete_ended_auctions_batch", {
      batch_limit: batchSize,
      older_than_hours: olderThanHours,
    });

    if (error) {
      console.error(`[backlog-cleanup] RPC error: ${error.message}`);
      consecutiveErrors++;
      if (consecutiveErrors >= 5) {
        console.error("[backlog-cleanup] Too many consecutive errors, aborting");
        break;
      }
      await new Promise((r) => setTimeout(r, 1000 * consecutiveErrors));
      continue;
    }

    consecutiveErrors = 0;
    const row = Array.isArray(data) ? data[0] : data;
    const deletedCount = row?.deleted_count ?? 0;
    lastRemainingEstimate = row?.remaining_estimate ?? null;

    totalDeleted += deletedCount;
    batchCount++;

    if (deletedCount === 0) {
      console.log("[backlog-cleanup] No more rows to delete");
      break;
    }

    // Progress log every 20 batches
    if (batchCount % 20 === 0) {
      const rate = Math.round(totalDeleted / ((Date.now() - startTime) / 1000));
      console.log(
        `[backlog-cleanup] Batch ${batchCount}: deleted ${totalDeleted.toLocaleString()} total (${rate}/s)`
      );
    }

    // Small delay to let auth/reads breathe
    await new Promise((r) => setTimeout(r, 50));
  }

  const durationMs = Date.now() - startTime;
  const rate = durationMs > 0 ? Math.round((totalDeleted / durationMs) * 1000) : 0;

  console.log(
    `[backlog-cleanup] Done: deleted ${totalDeleted.toLocaleString()} in ${(durationMs / 1000).toFixed(1)}s (${rate}/s), batches=${batchCount}, chain=${chainCount}`
  );

  // Record in sync_history
  await supabase.from("sync_history").insert({
    inventory_source: "backlog_cleanup",
    auctions_count: totalDeleted,
    success: true,
    duration_ms: durationMs,
  });

  // Self-chain if we ran out of time but still had rows to delete
  if (shouldChain && totalDeleted > 0 && chainCount < 30) {
    console.log(`[backlog-cleanup] Self-chaining (chain=${chainCount + 1})...`);

    const chainUrl = `${supabaseUrl}/functions/v1/backlog-cleanup?older_than_hours=${olderThanHours}&batch_size=${batchSize}&max_seconds=${maxSeconds}`;

    const chainPromise = fetch(chainUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${syncSecret}`,
        Prefer: "respond-async",
      },
      body: JSON.stringify({ chain_count: chainCount + 1 }),
    }).catch((e) => console.error("[backlog-cleanup] Chain failed:", e));

    // Use waitUntil to ensure the chain request fires before this invocation ends
    if (typeof (globalThis as any).EdgeRuntime?.waitUntil === "function") {
      (globalThis as any).EdgeRuntime.waitUntil(chainPromise);
    } else {
      await chainPromise;
    }
  }

  return new Response(
    JSON.stringify({
      success: true,
      deleted: totalDeleted,
      batches: batchCount,
      durationMs,
      rate,
      chainCount,
      chained: shouldChain && totalDeleted > 0 && chainCount < 30,
      remainingEstimate: lastRemainingEstimate,
    }),
    {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    }
  );
});