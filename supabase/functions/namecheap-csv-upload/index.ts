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
  // Parse formats like "2d 5h", "5h 30m", "30m", etc.
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

function parseCSV(csvContent: string): ParsedAuction[] {
  const lines = csvContent.split(/\r?\n/).filter((line) => line.trim());
  if (lines.length < 2) return [];

  // Parse header to find column indices
  const headerLine = lines[0].toLowerCase();
  const headers = parseCSVLine(headerLine);

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

  console.log("CSV headers found:", headers);
  console.log(
    `Column indices - domain: ${domainIdx}, price: ${priceIdx}, bids: ${bidsIdx}, timeLeft: ${timeLeftIdx}`
  );

  const auctions: ParsedAuction[] = [];

  for (let i = 1; i < lines.length; i++) {
    try {
      const values = parseCSVLine(lines[i]);
      if (values.length < 2) continue;

      const domainName = values[domainIdx >= 0 ? domainIdx : 0]?.trim();
      if (!domainName || !domainName.includes(".")) continue;

      // Parse price - remove currency symbols and commas
      const priceStr = values[priceIdx >= 0 ? priceIdx : 1] || "0";
      const price = parseFloat(priceStr.replace(/[$,]/g, "")) || 0;

      // Parse bid count
      const bidCount = parseInt(values[bidsIdx >= 0 ? bidsIdx : 2] || "0") || 0;

      // Parse time left to end_time
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
      console.error(`Error parsing line ${i}:`, err);
    }
  }

  return auctions;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get auth token from request
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

    // Create client with user's token to verify identity
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

    // Check if user is admin using service role client
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

    // Parse the CSV from request body
    const { csvContent } = await req.json();
    if (!csvContent || typeof csvContent !== "string") {
      return new Response(JSON.stringify({ error: "No CSV content provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Processing CSV with ${csvContent.length} characters`);

    // Parse CSV
    const auctions = parseCSV(csvContent);
    console.log(`Parsed ${auctions.length} auctions from CSV`);

    if (auctions.length === 0) {
      return new Response(
        JSON.stringify({ error: "No valid auctions found in CSV" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Process in batches using service role client
    const BATCH_SIZE = 50;
    const BATCH_DELAY_MS = 100;
    let inserted = 0;
    let errors = 0;

    for (let i = 0; i < auctions.length; i += BATCH_SIZE) {
      const batch = auctions.slice(i, i + BATCH_SIZE);

      const { error } = await adminClient.from("auctions").upsert(batch, {
        onConflict: "domain_name",
        ignoreDuplicates: false,
      });

      if (error) {
        console.error(`Batch error at ${i}: ${error.message}`);
        errors++;
      } else {
        inserted += batch.length;
      }

      // Progress log every 10000 records
      if (i > 0 && i % 10000 === 0) {
        console.log(`Progress: ${i}/${auctions.length} processed`);
      }

      if (i + BATCH_SIZE < auctions.length) {
        await new Promise((resolve) => setTimeout(resolve, BATCH_DELAY_MS));
      }
    }

    // Log to sync_history
    await adminClient.from("sync_history").insert({
      inventory_source: "namecheap",
      auctions_count: inserted,
      success: errors === 0,
      error_message: errors > 0 ? `${errors} batch errors` : null,
    });

    console.log(`Upload complete: ${inserted} inserted, ${errors} batch errors`);

    return new Response(
      JSON.stringify({
        success: true,
        total_parsed: auctions.length,
        inserted,
        errors,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error processing CSV:", errorMessage);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
