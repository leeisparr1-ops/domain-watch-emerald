import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-sync-secret",
};

interface AuctionData {
  domain_name: string;
  price: number;
  bid_count: number;
  traffic_count: number;
  end_time: string | null;
  inventory_source: string;
  tld: string;
  auction_type: string;
  valuation: number;
  domain_age: number;
}

interface SyncRequest {
  auctions?: AuctionData[];
  inventory_source?: string;
  skip_scoring?: boolean;
  record_sync_history?: boolean;
  auctions_count?: number;
  success?: boolean;
  duration_ms?: number;
  error_message?: string | null;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const isRetryableDbError = (message: string) => {
  const msg = message.toLowerCase();
  return (
    msg.includes("statement timeout") ||
    msg.includes("upstream request timeout") ||
    msg.includes("canceling statement") ||
    msg.includes("deadlock") ||
    msg.includes("could not serialize")
  );
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate the sync secret
    const syncSecret = req.headers.get("x-sync-secret");
    const expectedSecret = Deno.env.get("SYNC_SECRET");

    if (!expectedSecret) {
      console.error("SYNC_SECRET not configured");
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!syncSecret || syncSecret !== expectedSecret) {
      console.error("Invalid or missing sync secret");
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Supabase client with service role key (bypasses RLS)
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Parse request body
    const body: SyncRequest = await req.json();

    // Lightweight sync_history recording mode (used by GitHub scripts)
    if (body.record_sync_history) {
      const source = body.inventory_source || "unknown";
      await supabase.from("sync_history").insert({
        inventory_source: source,
        auctions_count: body.auctions_count || 0,
        success: body.success ?? true,
        duration_ms: body.duration_ms || 0,
        error_message: body.error_message || null,
      });

      return new Response(
        JSON.stringify({ success: true, recorded: true, inventory_source: source }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const auctions = body.auctions || [];
    const inventory_source = body.inventory_source || "unknown";

    if (!Array.isArray(auctions) || auctions.length === 0) {
      return new Response(
        JSON.stringify({ error: "No auctions provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Received ${auctions.length} auctions for ${inventory_source}`);

    // Timeout-safe upsert strategy: split and retry only when necessary.
    const BATCH_SIZE = 200;
    const MIN_SPLIT_BATCH = 50;
    const BATCH_DELAY_MS = 75;
    let inserted = 0;
    let errors = 0;
    let consecutiveErrors = 0;

    const upsertWithSplitRetry = async (
      rows: AuctionData[],
      depth = 0,
    ): Promise<{ inserted: number; failed: number }> => {
      const { error } = await supabase
        .from("auctions")
        .upsert(rows, {
          onConflict: "domain_name",
          ignoreDuplicates: false,
        });

      if (!error) {
        return { inserted: rows.length, failed: 0 };
      }

      const retryable = isRetryableDbError(error.message);
      if (retryable && rows.length > MIN_SPLIT_BATCH) {
        const mid = Math.floor(rows.length / 2);
        const left = rows.slice(0, mid);
        const right = rows.slice(mid);

        console.warn(
          `Retryable batch error at depth ${depth} (size=${rows.length}): ${error.message}. Splitting...`,
        );

        await sleep(Math.min(1000, 120 + depth * 150));
        const leftResult = await upsertWithSplitRetry(left, depth + 1);
        const rightResult = await upsertWithSplitRetry(right, depth + 1);

        return {
          inserted: leftResult.inserted + rightResult.inserted,
          failed: leftResult.failed + rightResult.failed,
        };
      }

      console.error(`Non-retryable batch error (size=${rows.length}): ${error.message}`);
      return { inserted: 0, failed: rows.length };
    };

    for (let i = 0; i < auctions.length; i += BATCH_SIZE) {
      const batch = auctions.slice(i, i + BATCH_SIZE);

      const result = await upsertWithSplitRetry(batch);
      inserted += result.inserted;
      errors += result.failed;

      if (result.failed >= batch.length) {
        consecutiveErrors++;
        const backoff = Math.min(consecutiveErrors * 1200, 6000);
        await sleep(backoff);
        if (consecutiveErrors >= 6) {
          console.error(`Aborting: ${consecutiveErrors} consecutive failed batches — DB likely saturated`);
          break;
        }
      } else {
        consecutiveErrors = 0;
      }
      
      // Always pause between batches to allow auth/other queries to complete
      if (i + BATCH_SIZE < auctions.length) {
        await sleep(BATCH_DELAY_MS);
      }
    }

    console.log(`Upserted ${inserted} auctions, ${errors} failed rows`);

    // Avoid score-trigger storm on high-volume sources to keep auth responsive.
    const highVolumeSources = new Set(["namecheap", "allListings"]);
    const shouldTriggerScores =
      !body.skip_scoring &&
      !highVolumeSources.has(inventory_source) &&
      inserted > 0 &&
      auctions.length <= 1000;

    if (shouldTriggerScores) {
      try {
        const domainNames = auctions.map((a) => a.domain_name);
        const scoreUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/compute-domain-scores`;
        fetch(scoreUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-sync-secret": expectedSecret,
          },
          body: JSON.stringify({ mode: "batch", domain_names: domainNames }),
        }).catch((e) => console.error("Score trigger failed:", e));
      } catch (e) {
        console.error("Score trigger error:", e);
      }
    } else {
      console.log(`Skipping score trigger for source=${inventory_source}, skip_scoring=${body.skip_scoring ?? false}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        inserted,
        errors,
        inventory_source,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error processing request:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
