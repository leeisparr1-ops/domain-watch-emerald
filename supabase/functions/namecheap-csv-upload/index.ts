import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface ParsedAuction {
  domain_name: string;
  price: number;
  bid_count: number;
  end_time: string | null;
  inventory_source: string;
  tld: string;
  auction_type: string;
  traffic_count: number;
  valuation: number;
  domain_age: number;
}

function parseTimeLeft(timeLeft: string): string | null {
  if (!timeLeft || timeLeft.trim() === "" || timeLeft === "-") {
    return null;
  }

  const now = new Date();
  let totalMs = 0;

  const dayMatch = timeLeft.match(/(\d+)d/);
  const hourMatch = timeLeft.match(/(\d+)h/);
  const minMatch = timeLeft.match(/(\d+)m/);

  if (dayMatch) totalMs += parseInt(dayMatch[1]) * 24 * 60 * 60 * 1000;
  if (hourMatch) totalMs += parseInt(hourMatch[1]) * 60 * 60 * 1000;
  if (minMatch) totalMs += parseInt(minMatch[1]) * 60 * 1000;

  if (totalMs === 0) return null;

  return new Date(now.getTime() + totalMs).toISOString();
}

function extractTld(domain: string): string {
  const parts = domain.split(".");
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : "";
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

function parseCSVChunk(csvLines: string[], headers: string[]): ParsedAuction[] {
  // Find column indices (flexible matching)
  const domainIdx = headers.findIndex(
    (h) => h.includes("domain") && !h.includes("age")
  );
  const priceIdx = headers.findIndex(
    (h) => h.includes("price") || h.includes("bid")
  );
  const bidsIdx = headers.findIndex((h) => h.includes("bids") || h === "bids");
  const timeLeftIdx = headers.findIndex(
    (h) => h.includes("time") || h.includes("left") || h.includes("end")
  );

  const auctions: ParsedAuction[] = [];

  for (const line of csvLines) {
    try {
      const values = parseCSVLine(line);
      if (values.length < 2) continue;

      const domainName = values[domainIdx >= 0 ? domainIdx : 0]?.trim();
      if (!domainName || !domainName.includes(".")) continue;

      const priceStr = values[priceIdx >= 0 ? priceIdx : 1] || "0";
      const price = parseFloat(priceStr.replace(/[$,]/g, "")) || 0;

      const bidCount = parseInt(values[bidsIdx >= 0 ? bidsIdx : 2] || "0") || 0;

      const timeLeftStr = values[timeLeftIdx >= 0 ? timeLeftIdx : 3] || "";
      const endTime = parseTimeLeft(timeLeftStr);

      auctions.push({
        domain_name: domainName.toLowerCase(),
        price,
        bid_count: bidCount,
        end_time: endTime,
        inventory_source: "namecheap",
        tld: extractTld(domainName),
        auction_type: "auction",
        traffic_count: 0,
        valuation: 0,
        domain_age: 0,
      });
    } catch (err) {
      console.error(`Error parsing line:`, err);
    }
  }

  return auctions;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: roleData, error: roleError } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (roleError || !roleData) {
      console.error("Admin check failed:", roleError?.message || "Not admin");
      return new Response(JSON.stringify({ error: "Admin access required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { action, jobId, csvChunk, headers, chunkIndex, totalChunks, totalRows } = body;

    // Action: create-job - Create a new processing job
    if (action === "create-job") {
      const { data: job, error: jobError } = await adminClient
        .from("csv_upload_jobs")
        .insert({
          user_id: user.id,
          status: "processing",
          total_rows: totalRows || 0,
          processed_rows: 0,
          inserted_rows: 0,
          error_count: 0,
          inventory_source: "namecheap",
        })
        .select()
        .single();

      if (jobError) {
        console.error("Failed to create job:", jobError.message);
        return new Response(JSON.stringify({ error: "Failed to create job" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ success: true, jobId: job.id }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Action: process-chunk - Process a chunk of CSV data
    if (action === "process-chunk") {
      if (!jobId || !csvChunk || !headers) {
        return new Response(JSON.stringify({ error: "Missing required fields" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const csvLines = csvChunk.split(/\r?\n/).filter((line: string) => line.trim());
      const auctions = parseCSVChunk(csvLines, headers);

      console.log(`Processing chunk ${chunkIndex}/${totalChunks}: ${auctions.length} auctions`);

      const BATCH_SIZE = 100;
      const BATCH_DELAY_MS = 50;
      let inserted = 0;
      let errors = 0;

      for (let i = 0; i < auctions.length; i += BATCH_SIZE) {
        const batch = auctions.slice(i, i + BATCH_SIZE);

        const { error } = await adminClient.from("auctions").upsert(batch, {
          onConflict: "domain_name",
          ignoreDuplicates: false,
        });

        if (error) {
          console.error(`Batch error: ${error.message}`);
          errors++;
        } else {
          inserted += batch.length;
        }

        if (i + BATCH_SIZE < auctions.length) {
          await new Promise((resolve) => setTimeout(resolve, BATCH_DELAY_MS));
        }
      }

      // Update job progress
      const { data: currentJob } = await adminClient
        .from("csv_upload_jobs")
        .select("processed_rows, inserted_rows, error_count")
        .eq("id", jobId)
        .single();

      if (currentJob) {
        await adminClient
          .from("csv_upload_jobs")
          .update({
            processed_rows: currentJob.processed_rows + csvLines.length,
            inserted_rows: currentJob.inserted_rows + inserted,
            error_count: currentJob.error_count + errors,
          })
          .eq("id", jobId);
      }

      return new Response(
        JSON.stringify({
          success: true,
          chunkIndex,
          inserted,
          errors,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Action: complete-job - Mark job as completed
    if (action === "complete-job") {
      if (!jobId) {
        return new Response(JSON.stringify({ error: "Missing jobId" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: job } = await adminClient
        .from("csv_upload_jobs")
        .select("*")
        .eq("id", jobId)
        .single();

      if (job) {
        await adminClient
          .from("csv_upload_jobs")
          .update({
            status: job.error_count > 0 ? "completed" : "completed",
          })
          .eq("id", jobId);

        // Log to sync_history
        await adminClient.from("sync_history").insert({
          inventory_source: "namecheap",
          auctions_count: job.inserted_rows,
          success: job.error_count === 0,
          error_message: job.error_count > 0 ? `${job.error_count} batch errors` : null,
        });
      }

      return new Response(JSON.stringify({ success: true, job }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Action: get-status - Get job status
    if (action === "get-status") {
      if (!jobId) {
        return new Response(JSON.stringify({ error: "Missing jobId" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: job, error: jobError } = await adminClient
        .from("csv_upload_jobs")
        .select("*")
        .eq("id", jobId)
        .single();

      if (jobError || !job) {
        return new Response(JSON.stringify({ error: "Job not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ success: true, job }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error processing request:", errorMessage);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
