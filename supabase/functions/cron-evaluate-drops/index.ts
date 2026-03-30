import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// System user UUID for shared/cron scans (not tied to a real user)
const SYSTEM_USER_ID = "00000000-0000-0000-0000-000000000000";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // Auth: require SYNC_SECRET or service role key
    const syncSecret = Deno.env.get("SYNC_SECRET");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;

    const authHeader = req.headers.get("Authorization")?.replace("Bearer ", "");
    const systemSecret = req.headers.get("x-system-secret") || req.headers.get("X-System-Secret");
    const cronSource = req.headers.get("x-cron-source");

    const isAuthorized =
      authHeader === serviceKey ||
      authHeader === syncSecret ||
      systemSecret === syncSecret ||
      // Allow internal pg_cron triggers
      cronSource === "pg_cron";

    if (!isAuthorized) {
      console.error(`Auth failed. syncSecret set: ${!!syncSecret}, serviceKey set: ${!!serviceKey}, authHeader set: ${!!authHeader}, systemSecret set: ${!!systemSecret}`);
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(supabaseUrl, serviceKey);

    // Check if there's already an active scan running
    const { data: activeScans } = await adminClient
      .from("drop_scans")
      .select("id, status, created_at")
      .in("status", ["pre-screening", "evaluating", "processing"])
      .order("created_at", { ascending: false })
      .limit(1);

    if (activeScans && activeScans.length > 0) {
      const active = activeScans[0];
      const ageMs = Date.now() - new Date(active.created_at).getTime();
      const ageHours = ageMs / (1000 * 60 * 60);

      // If the active scan is less than 12 hours old, skip
      if (ageHours < 12) {
        console.log(`Active scan ${active.id} is ${ageHours.toFixed(1)}h old (status: ${active.status}), skipping`);
        return new Response(JSON.stringify({
          success: true,
          skipped: true,
          reason: `Active scan running (${active.status}, ${ageHours.toFixed(1)}h old)`,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // If older than 12 hours, mark it as stale/error and proceed
      console.log(`Stale scan ${active.id} (${ageHours.toFixed(1)}h old), marking as error`);
      await adminClient.from("drop_scans").update({
        status: "error",
        csv_data: null,
      }).eq("id", active.id);
    }

    // Determine CSV URL - prefer storage bucket, fallback to static file
    let csvUrl: string;

    // Check if there's a CSV in the drops-csv storage bucket
    const { data: files } = await adminClient.storage
      .from("drops-csv")
      .list("", { limit: 1, sortBy: { column: "created_at", order: "desc" } });

    if (files && files.length > 0) {
      // Use the latest uploaded CSV from storage
      const latestFile = files[0];
      const { data: urlData } = adminClient.storage
        .from("drops-csv")
        .getPublicUrl(latestFile.name);
      csvUrl = `${urlData.publicUrl}?v=${Date.now()}`;
      console.log(`Using storage CSV: ${latestFile.name}`);
    } else {
      // Fallback to the static file in the repo
      const appUrl = "https://expiredhawk.lovable.app";
      csvUrl = `${appUrl}/store/daily-drops.csv?v=${Date.now()}`;
      console.log(`No storage CSV found, using static fallback`);
    }

    // Create a new shared scan record
    const scanId = crypto.randomUUID();
    const { error: insertErr } = await adminClient.from("drop_scans").insert({
      id: scanId,
      user_id: SYSTEM_USER_ID,
      filename: "daily-drops.csv",
      status: "processing",
      total_domains: 0,
      filtered_domains: 0,
      evaluated_domains: 0,
      resume_from: 0,
    });

    if (insertErr) {
      throw new Error(`Failed to create scan record: ${insertErr.message}`);
    }

    console.log(`Created daily drop scan: ${scanId}, CSV: ${csvUrl}`);

    // Trigger evaluate-drops with the CSV URL
    const evalUrl = `${supabaseUrl}/functions/v1/evaluate-drops`;
    const evalResp = await fetch(evalUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${serviceKey}`,
      },
      body: JSON.stringify({
        scanId,
        csvUrl,
      }),
    });

    const evalResult = await evalResp.json();
    console.log(`Evaluate-drops triggered:`, evalResult);

    return new Response(JSON.stringify({
      success: true,
      scanId,
      csvUrl: csvUrl.split("?")[0], // strip cache-buster for logging
      evalResult,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("cron-evaluate-drops error:", e);
    return new Response(JSON.stringify({
      error: e instanceof Error ? e.message : "Unknown error",
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
