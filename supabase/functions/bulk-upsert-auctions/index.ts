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
  auctions: AuctionData[];
  inventory_source: string;
}

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

    // Parse request body
    const body: SyncRequest = await req.json();
    const { auctions, inventory_source } = body;

    if (!Array.isArray(auctions) || auctions.length === 0) {
      return new Response(
        JSON.stringify({ error: "No auctions provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Received ${auctions.length} auctions for ${inventory_source}`);

    // Create Supabase client with service role key (bypasses RLS)
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Upsert auctions in batches of 500 to avoid timeouts
    const BATCH_SIZE = 500;
    let inserted = 0;
    let errors = 0;

    for (let i = 0; i < auctions.length; i += BATCH_SIZE) {
      const batch = auctions.slice(i, i + BATCH_SIZE);

      const { error } = await supabase
        .from("auctions")
        .upsert(batch, {
          onConflict: "domain_name",
          ignoreDuplicates: false,
        });

      if (error) {
        console.error(`Batch error at ${i}: ${error.message}`);
        errors++;
      } else {
        inserted += batch.length;
      }
    }

    console.log(`Upserted ${inserted} auctions, ${errors} batch errors`);

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
