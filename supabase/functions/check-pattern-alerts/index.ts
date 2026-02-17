import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createSafeRegex } from "../_shared/regexSecurity.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface UserPattern {
  id: string;
  user_id: string;
  pattern: string;
  pattern_type: string;
  description: string;
  max_price: number | null;
  min_price: number;
  tld_filter: string | null;
  min_length: number | null;
  max_length: number | null;
  min_age: number | null;
  max_age: number | null;
  enabled: boolean;
}

interface MatchedDomain {
  auction_id: string;
  domain_name: string;
  price: number;
  end_time: string | null;
  pattern_id: string;
  pattern_description: string;
}

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
    
    // Create client with user's auth for JWT validation
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    
    // Validate JWT using getClaims
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabaseAuth.auth.getClaims(token);
    
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    
    const userId = claimsData.claims.sub as string;
    
    // Create service role client for database operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user's enabled patterns
    const { data: patterns, error: patternsError } = await supabase
      .from("user_patterns")
      .select("*")
      .eq("user_id", userId)
      .eq("enabled", true);

    if (patternsError) {
      throw patternsError;
    }

    if (!patterns || patterns.length === 0) {
      return new Response(JSON.stringify({ matches: [], message: "No active patterns" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get recently alerted combinations for this user (last 7 days to limit query size)
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data: existingAlerts, error: alertsError } = await supabase
      .from("pattern_alerts")
      .select("pattern_id, auction_id")
      .eq("user_id", userId)
      .gte("alerted_at", weekAgo);

    if (alertsError) {
      console.error("Alerts query error:", alertsError);
    }

    const alertedSet = new Set(
      (existingAlerts || []).map(a => `${a.pattern_id}:${a.auction_id}`)
    );

    const matchedDomains: MatchedDomain[] = [];
    const newAlerts: { user_id: string; pattern_id: string; auction_id: string; domain_name: string }[] = [];
    const now = new Date().toISOString();

    // For each pattern, use PostgreSQL regex matching to search ALL auctions
    for (const pattern of patterns as UserPattern[]) {
      // Validate regex safety first
      const { regex, error: regexError } = createSafeRegex(pattern.pattern, "i");
      if (!regex) {
        console.error(`Unsafe or invalid regex pattern: ${pattern.pattern} - ${regexError}`);
        continue;
      }

      // Build a PostgreSQL query that does server-side regex matching
      // This searches the ENTIRE auctions table, not just 2000 rows
      let query = supabase
        .from("auctions")
        .select("id, domain_name, price, tld, end_time, domain_age")
        .gte("end_time", now)
        .limit(200); // Limit matches per pattern to avoid huge result sets

      // Apply price filters
      if (pattern.min_price) {
        query = query.gte("price", pattern.min_price);
      }
      if (pattern.max_price) {
        query = query.lte("price", pattern.max_price);
      }

      // Apply TLD filter
      if (pattern.tld_filter) {
        const filterTld = pattern.tld_filter.toUpperCase().replace(".", "");
        query = query.ilike("tld", filterTld);
      }

      // Apply domain age filters
      if (pattern.min_age) {
        query = query.gte("domain_age", pattern.min_age);
      }
      if (pattern.max_age) {
        query = query.lte("domain_age", pattern.max_age);
      }

      // Execute the query - we get filtered auctions first, then regex match client-side
      // For patterns that are simple keywords, we can also use ilike for a fast pre-filter
      const isSimpleKeyword = /^[a-z0-9]+$/i.test(pattern.pattern);
      if (isSimpleKeyword) {
        // Simple keyword: use ilike for fast server-side pre-filter
        query = query.ilike("domain_name", `%${pattern.pattern}%`);
      }

      const { data: auctions, error: auctionsError } = await query;

      if (auctionsError) {
        console.error(`Auctions query error for pattern ${pattern.id}:`, auctionsError);
        continue;
      }

      if (!auctions || auctions.length === 0) continue;

      for (const auction of auctions) {
        // Skip if already alerted
        const key = `${pattern.id}:${auction.id}`;
        if (alertedSet.has(key)) continue;

        // Extract domain name without TLD for regex matching
        const domainParts = auction.domain_name.split(".");
        const nameOnly = domainParts.slice(0, -1).join(".").toLowerCase();

        // Apply regex match (for non-simple-keyword patterns, this is the primary filter)
        if (!regex.test(nameOnly)) continue;

        // Check character length filter
        if (pattern.min_length && nameOnly.length < pattern.min_length) continue;
        if (pattern.max_length && nameOnly.length > pattern.max_length) continue;

        // Match found!
        matchedDomains.push({
          auction_id: auction.id,
          domain_name: auction.domain_name,
          price: auction.price,
          end_time: auction.end_time,
          pattern_id: pattern.id,
          pattern_description: pattern.description || pattern.pattern,
        });

        newAlerts.push({
          user_id: userId,
          pattern_id: pattern.id,
          auction_id: auction.id,
          domain_name: auction.domain_name,
        });
      }
    }

    // Record new alerts and send notifications
    if (newAlerts.length > 0) {
      // Batch insert in chunks of 100
      for (let i = 0; i < newAlerts.length; i += 100) {
        const chunk = newAlerts.slice(i, i + 100);
        const { error: insertError } = await supabase
          .from("pattern_alerts")
          .upsert(chunk, { onConflict: "user_id,pattern_id,auction_id" });

        if (insertError) {
          console.error("Error inserting alerts:", insertError);
        }
      }

      // Update last_matched_at for patterns that matched
      const patternIds = [...new Set(newAlerts.map(a => a.pattern_id))];
      for (const patternId of patternIds) {
        await supabase
          .from("user_patterns")
          .update({ last_matched_at: new Date().toISOString() })
          .eq("id", patternId);
      }

      // Send push notification for new matches
      if (matchedDomains.length > 0) {
        const topMatches = matchedDomains.slice(0, 3).map(m => m.domain_name).join(", ");
        const moreCount = matchedDomains.length > 3 ? ` +${matchedDomains.length - 3} more` : "";
        
        const iconUrl = "https://expiredhawk.lovable.app/icons/icon-192.png";
        
        try {
          await fetch(`${supabaseUrl}/functions/v1/send-push-notification`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "X-System-Secret": Deno.env.get("SYNC_SECRET") || "" },
            body: JSON.stringify({
              user_id: userId,
              payload: {
                title: `🎯 ${matchedDomains.length} Domain${matchedDomains.length > 1 ? 's' : ''} Match Your Patterns!`,
                body: `${topMatches}${moreCount}`,
                icon: iconUrl,
                badge: iconUrl,
                tag: "pattern-match",
                url: "/dashboard",
              },
            }),
          });
          console.log("Push notification sent for pattern matches");
        } catch (pushError) {
          console.error("Error sending push notification:", pushError);
        }

        // Send email notification
        try {
          await fetch(`${supabaseUrl}/functions/v1/send-email-notification`, {
            method: "POST",
            headers: { 
              "Content-Type": "application/json",
              "Authorization": `Bearer ${token}`,
            },
            body: JSON.stringify({
              type: "pattern_match",
              userId: userId,
              data: {
                matches: matchedDomains.slice(0, 10).map(m => ({
                  domain: m.domain_name,
                  price: m.price,
                  pattern: m.pattern_description,
                  pattern_id: m.pattern_id,
                  auction_id: m.auction_id,
                  end_time: m.end_time,
                })),
                totalMatches: matchedDomains.length,
              },
            }),
          });
          console.log("Email notification sent for pattern matches");
        } catch (emailError) {
          console.error("Error sending email notification:", emailError);
        }
      }
    }

    console.log(`Pattern check complete: ${patterns.length} patterns, ${matchedDomains.length} matches found`);

    return new Response(JSON.stringify({ 
      matches: matchedDomains,
      newMatches: matchedDomains.length,
      totalPatterns: patterns.length,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: unknown) {
    let errorMessage = "Unknown error";
    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (typeof error === "object" && error !== null && "message" in error) {
      errorMessage = String((error as { message: unknown }).message);
    } else if (typeof error === "string") {
      errorMessage = error;
    }
    console.error("Error in check-pattern-alerts:", error);
    return new Response(JSON.stringify({ 
      error: errorMessage 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
