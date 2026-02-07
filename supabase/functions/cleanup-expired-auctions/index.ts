import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// ULTRA SMALL batches + delays to avoid competing with auth under high load
const BATCH_SIZE = 25;
const MAX_BATCHES = 100;
const BATCH_DELAY_MS = 200;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const url = new URL(req.url);
    const daysOld = parseInt(url.searchParams.get("days") || "0");
    const maxBatches = Math.min(
      parseInt(url.searchParams.get("maxBatches") || String(MAX_BATCHES)),
      MAX_BATCHES
    );
    // Source-aware cleanup: delete stale records by inventory_source + updated_at
    const source = url.searchParams.get("source"); // e.g. "namecheap"
    const staleDays = parseInt(url.searchParams.get("staleDays") || "3");

    let totalDeleted = 0;
    let batchCount = 0;
    let consecutiveErrors = 0;

    // ------- Mode 1: Source-aware stale cleanup (by updated_at) -------
    if (source) {
      const staleCutoff = new Date();
      staleCutoff.setDate(staleCutoff.getDate() - staleDays);
      const staleCutoffISO = staleCutoff.toISOString();

      console.log(
        `Source cleanup: deleting '${source}' auctions not updated since ${staleCutoffISO} (${staleDays} days)`
      );

      while (batchCount < maxBatches && consecutiveErrors < 3) {
        const { data: staleAuctions, error: selectError } = await supabase
          .from("auctions")
          .select("id")
          .eq("inventory_source", source)
          .lt("updated_at", staleCutoffISO)
          .limit(BATCH_SIZE);

        if (selectError) {
          console.error("Error selecting stale auctions:", selectError);
          consecutiveErrors++;
          await new Promise((r) => setTimeout(r, 300));
          continue;
        }

        if (!staleAuctions || staleAuctions.length === 0) {
          console.log("No more stale auctions to delete");
          break;
        }

        const idsToDelete = staleAuctions.map((row) => row.id);
        const { error: delError } = await supabase
          .from("auctions")
          .delete()
          .in("id", idsToDelete);

        if (delError) {
          console.error("Error deleting stale batch:", delError);
          consecutiveErrors++;
          await new Promise((r) => setTimeout(r, 300));
          continue;
        }

        consecutiveErrors = 0;
        totalDeleted += idsToDelete.length;
        batchCount++;

        if (batchCount % 20 === 0) {
          console.log(
            `Progress: Batch ${batchCount}, deleted ${totalDeleted} stale '${source}' auctions`
          );
        }

        await new Promise((r) => setTimeout(r, BATCH_DELAY_MS));

        if (idsToDelete.length < BATCH_SIZE) break;
      }

      const durationMs = Date.now() - startTime;
      const result = {
        success: true,
        deleted: totalDeleted,
        batches: batchCount,
        durationMs,
        source,
        staleDays,
        message: `Deleted ${totalDeleted} stale '${source}' auctions in ${batchCount} batches`,
      };
      console.log("Source cleanup complete:", result);
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ------- Mode 2: Legacy end_time-based cleanup -------
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);
    const cutoffISO = cutoffDate.toISOString();

    console.log(
      `Cleaning up auctions ended before ${cutoffISO} (${daysOld} days ago) — excluding namecheap`
    );

    while (batchCount < maxBatches && consecutiveErrors < 3) {
      // First try RPC-based batch delete (faster if available)
      const { data, error: deleteError } = await supabase
        .rpc("delete_expired_auctions_batch", {
          cutoff_time: cutoffISO,
          batch_limit: BATCH_SIZE,
        })
        .single();

      // Fallback to regular delete if RPC not available
      if (deleteError?.code === "PGRST202") {
        const { data: expiredAuctions, error: selectError } = await supabase
          .from("auctions")
          .select("id")
          .lt("end_time", cutoffISO)
          .neq("inventory_source", "namecheap")
          .limit(BATCH_SIZE);

        if (selectError) {
          console.error("Error selecting expired auctions:", selectError);
          consecutiveErrors++;
          await new Promise((r) => setTimeout(r, 300));
          continue;
        }

        if (!expiredAuctions || expiredAuctions.length === 0) {
          console.log("No more expired auctions to delete");
          break;
        }

        const idsToDelete = expiredAuctions.map((row) => row.id);

        const { error: delError } = await supabase
          .from("auctions")
          .delete()
          .in("id", idsToDelete);

        if (delError) {
          console.error("Error deleting batch:", delError);
          consecutiveErrors++;
          await new Promise((r) => setTimeout(r, 300));
          continue;
        }

        consecutiveErrors = 0;
        totalDeleted += idsToDelete.length;
        batchCount++;

        if (batchCount % 20 === 0) {
          console.log(
            `Progress: Batch ${batchCount}, deleted ${totalDeleted} auctions`
          );
        }

        await new Promise((r) => setTimeout(r, BATCH_DELAY_MS));

        if (idsToDelete.length < BATCH_SIZE) break;
        continue;
      }

      if (deleteError) {
        console.error("Error with RPC delete:", deleteError);
        consecutiveErrors++;
        await new Promise((r) => setTimeout(r, 300));
        continue;
      }

      const deletedCount =
        (data as { deleted_count?: number })?.deleted_count || 0;
      if (deletedCount === 0) {
        console.log("No more expired auctions to delete");
        break;
      }

      consecutiveErrors = 0;
      totalDeleted += deletedCount;
      batchCount++;

      if (batchCount % 20 === 0) {
        console.log(
          `Progress: Batch ${batchCount}, deleted ${totalDeleted} auctions`
        );
      }

      await new Promise((r) => setTimeout(r, BATCH_DELAY_MS));
    }

    const durationMs = Date.now() - startTime;

    const result = {
      success: true,
      deleted: totalDeleted,
      batches: batchCount,
      durationMs,
      cutoffDate: cutoffISO,
      message: `Deleted ${totalDeleted} expired auctions in ${batchCount} batches`,
    };

    console.log("Cleanup complete:", result);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Cleanup failed:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : String(error),
        durationMs: Date.now() - startTime,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
