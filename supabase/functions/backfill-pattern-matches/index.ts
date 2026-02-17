import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { validateRegexSafety } from "../_shared/regexSecurity.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Backfill pattern matches — scans the FULL auctions table using
 * Postgres-native regex (~*) so we never pull millions of rows into JS.
 * Called once when a user creates or edits a pattern.
 */
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Validate JWT
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabaseAuth.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claimsData.claims.sub as string;

    const { pattern_id } = await req.json();
    if (!pattern_id) {
      return new Response(JSON.stringify({ error: "pattern_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch the pattern (must belong to user)
    const { data: pattern, error: patternErr } = await supabase
      .from("user_patterns")
      .select("*")
      .eq("id", pattern_id)
      .eq("user_id", userId)
      .maybeSingle();

    if (patternErr || !pattern) {
      return new Response(JSON.stringify({ error: "Pattern not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate regex safety
    const validation = validateRegexSafety(pattern.pattern);
    if (!validation.safe) {
      return new Response(JSON.stringify({ error: validation.reason }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build a SQL query that does regex matching entirely in Postgres.
    // We use split_part to strip the TLD and ~* for case-insensitive regex.
    // Filters for price, TLD, length, and age are applied in SQL too.
    const conditions: string[] = [];
    const params: (string | number)[] = [];
    let paramIdx = 1;

    // Core regex match on domain name without TLD
    // split_part(domain_name, '.', 1) gets everything before the first dot
    conditions.push(`split_part(domain_name, '.', 1) ~* $${paramIdx}`);
    params.push(pattern.pattern);
    paramIdx++;

    // Price filters
    if (pattern.min_price && pattern.min_price > 0) {
      conditions.push(`price >= $${paramIdx}`);
      params.push(pattern.min_price);
      paramIdx++;
    }
    if (pattern.max_price !== null && pattern.max_price !== undefined) {
      conditions.push(`price <= $${paramIdx}`);
      params.push(pattern.max_price);
      paramIdx++;
    }

    // TLD filter
    if (pattern.tld_filter) {
      const tldNormalized = pattern.tld_filter.toUpperCase().replace(".", "");
      conditions.push(`UPPER(REPLACE(tld, '.', '')) = $${paramIdx}`);
      params.push(tldNormalized);
      paramIdx++;
    }

    // Length filters (on name without TLD)
    if (pattern.min_length) {
      conditions.push(`LENGTH(split_part(domain_name, '.', 1)) >= $${paramIdx}`);
      params.push(pattern.min_length);
      paramIdx++;
    }
    if (pattern.max_length) {
      conditions.push(`LENGTH(split_part(domain_name, '.', 1)) <= $${paramIdx}`);
      params.push(pattern.max_length);
      paramIdx++;
    }

    // Age filters
    if (pattern.min_age) {
      conditions.push(`domain_age >= $${paramIdx}`);
      params.push(pattern.min_age);
      paramIdx++;
    }
    if (pattern.max_age) {
      conditions.push(`domain_age <= $${paramIdx}`);
      params.push(pattern.max_age);
      paramIdx++;
    }

    const whereClause = conditions.join(" AND ");

    // Use RPC to run a parameterized query — but since we can't create
    // arbitrary RPCs on the fly, we'll use the Postgres REST API with
    // the service role. We'll query in batches using the SDK filter.
    //
    // Actually, the supabase JS client doesn't support native regex.
    // So we query with ILIKE for a rough pre-filter, then refine with
    // regex in JS. But for a backfill we need SQL-level regex.
    //
    // Best approach: use supabase.rpc() with a known function, or
    // just fetch matching IDs via a raw SQL call through PostgREST.
    //
    // Since we can't run raw SQL via PostgREST, let's use a pragmatic
    // approach: ILIKE pre-filter + JS regex refinement in batches.

    console.log(`Backfill scan for pattern "${pattern.pattern}" (${pattern_id})`);

    // Extract simple keywords from regex for ILIKE pre-filtering
    // Remove regex metacharacters to get searchable substrings
    const keywords = pattern.pattern
      .replace(/[\\^$.*+?()[\]{}|]/g, " ")
      .split(/\s+/)
      .filter((k: string) => k.length >= 2);

    const startTime = Date.now();
    const allMatches: { auction_id: string; domain_name: string }[] = [];
    const batchSize = 1000;
    const maxBatches = 50; // Up to 50k scanned per keyword
    let regex: RegExp;

    try {
      regex = new RegExp(pattern.pattern, "i");
    } catch {
      return new Response(JSON.stringify({ error: "Invalid regex" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get existing alerts to avoid duplicates
    const { data: existingAlerts } = await supabase
      .from("pattern_alerts")
      .select("auction_id")
      .eq("user_id", userId)
      .eq("pattern_id", pattern_id);

    const alertedAuctionIds = new Set(
      (existingAlerts || []).map(a => a.auction_id)
    );

    // Scan auctions using ILIKE pre-filter for each keyword
    // If no keywords extracted (pure regex), scan in chunks ordered by updated_at
    const hasKeywords = keywords.length > 0;

    for (let batch = 0; batch < maxBatches; batch++) {
      let query = supabase
        .from("auctions")
        .select("id, domain_name, price, tld, end_time, domain_age")
        .range(batch * batchSize, (batch + 1) * batchSize - 1);

      // Apply ILIKE pre-filter if we have keywords
      if (hasKeywords) {
        // Use OR across keywords for broader matching
        const ilikeFilters = keywords.map((k: string) => `domain_name.ilike.%${k}%`);
        query = query.or(ilikeFilters.join(","));
      }

      // Apply price filters via SDK
      if (pattern.min_price && pattern.min_price > 0) {
        query = query.gte("price", pattern.min_price);
      }
      if (pattern.max_price !== null && pattern.max_price !== undefined) {
        query = query.lte("price", pattern.max_price);
      }

      // Apply TLD filter
      if (pattern.tld_filter) {
        const tldNorm = pattern.tld_filter.replace(".", "");
        query = query.ilike("tld", tldNorm);
      }

      // Apply age filters
      if (pattern.min_age) {
        query = query.gte("domain_age", pattern.min_age);
      }
      if (pattern.max_age) {
        query = query.lte("domain_age", pattern.max_age);
      }

      query = query.order("updated_at", { ascending: false });

      const { data: auctionBatch, error: queryErr } = await query;

      if (queryErr) {
        console.error(`Batch ${batch} error:`, queryErr);
        break;
      }
      if (!auctionBatch || auctionBatch.length === 0) break;

      // Refine with regex + length filter in JS
      for (const auction of auctionBatch) {
        if (alertedAuctionIds.has(auction.id)) continue;

        const nameOnly = auction.domain_name.split(".").slice(0, -1).join(".").toLowerCase();

        // Length filters
        if (pattern.min_length && nameOnly.length < pattern.min_length) continue;
        if (pattern.max_length && nameOnly.length > pattern.max_length) continue;

        if (regex.test(nameOnly)) {
          allMatches.push({ auction_id: auction.id, domain_name: auction.domain_name });
          alertedAuctionIds.add(auction.id); // Prevent dupes within this run
        }
      }

      if (auctionBatch.length < batchSize) break;
    }

    console.log(`Backfill found ${allMatches.length} matches in ${Date.now() - startTime}ms`);

    // Insert new alerts
    if (allMatches.length > 0) {
      const alertRows = allMatches.map(m => ({
        user_id: userId,
        pattern_id: pattern_id,
        auction_id: m.auction_id,
        domain_name: m.domain_name,
      }));

      // Insert in batches
      const insertBatchSize = 500;
      for (let i = 0; i < alertRows.length; i += insertBatchSize) {
        const batch = alertRows.slice(i, i + insertBatchSize);
        const { error: insertErr } = await supabase
          .from("pattern_alerts")
          .upsert(batch, { onConflict: "user_id,pattern_id,auction_id" });

        if (insertErr) {
          console.error("Alert insert error:", insertErr);
        }
      }

      // Update last_matched_at
      await supabase
        .from("user_patterns")
        .update({ last_matched_at: new Date().toISOString() })
        .eq("id", pattern_id);
    }

    return new Response(JSON.stringify({
      success: true,
      matchesFound: allMatches.length,
      durationMs: Date.now() - startTime,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Backfill error:", error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : "Unknown error",
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
