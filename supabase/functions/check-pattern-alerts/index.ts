import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
  enabled: boolean;
}

interface Auction {
  id: string;
  domain_name: string;
  price: number;
  tld: string | null;
  end_time: string | null;
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
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from token
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get user's enabled patterns
    const { data: patterns, error: patternsError } = await supabase
      .from("user_patterns")
      .select("*")
      .eq("user_id", user.id)
      .eq("enabled", true);

    if (patternsError) {
      throw patternsError;
    }

    if (!patterns || patterns.length === 0) {
      return new Response(JSON.stringify({ matches: [], message: "No active patterns" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get active auctions
    const now = new Date().toISOString();
    const { data: auctions, error: auctionsError } = await supabase
      .from("auctions")
      .select("id, domain_name, price, tld, end_time")
      .gte("end_time", now)
      .limit(10000);

    if (auctionsError) {
      throw auctionsError;
    }

    // Get already-alerted combinations for this user
    const { data: existingAlerts, error: alertsError } = await supabase
      .from("pattern_alerts")
      .select("pattern_id, auction_id")
      .eq("user_id", user.id);

    if (alertsError) {
      throw alertsError;
    }

    const alertedSet = new Set(
      (existingAlerts || []).map(a => `${a.pattern_id}:${a.auction_id}`)
    );

    const matchedDomains: MatchedDomain[] = [];
    const newAlerts: { user_id: string; pattern_id: string; auction_id: string; domain_name: string }[] = [];

    // Check each pattern against auctions
    for (const pattern of patterns as UserPattern[]) {
      try {
        const regex = new RegExp(pattern.pattern, "i");
        
        for (const auction of auctions as Auction[]) {
          // Skip if already alerted
          const key = `${pattern.id}:${auction.id}`;
          if (alertedSet.has(key)) continue;

          // Extract domain name without TLD
          const domainParts = auction.domain_name.split(".");
          const nameOnly = domainParts.slice(0, -1).join(".").toLowerCase();

          // Check regex match
          if (!regex.test(nameOnly)) continue;

          // Check price filter
          if (pattern.min_price && auction.price < pattern.min_price) continue;
          if (pattern.max_price && auction.price > pattern.max_price) continue;

          // Check TLD filter
          if (pattern.tld_filter && auction.tld) {
            const filterTld = pattern.tld_filter.toUpperCase().replace(".", "");
            const auctionTld = auction.tld.toUpperCase().replace(".", "");
            if (filterTld !== auctionTld) continue;
          }

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
            user_id: user.id,
            pattern_id: pattern.id,
            auction_id: auction.id,
            domain_name: auction.domain_name,
          });
        }
      } catch (regexError) {
        console.error(`Invalid regex pattern: ${pattern.pattern}`, regexError);
      }
    }

    // Record new alerts to prevent duplicate notifications
    if (newAlerts.length > 0) {
      const { error: insertError } = await supabase
        .from("pattern_alerts")
        .upsert(newAlerts, { onConflict: "user_id,pattern_id,auction_id" });

      if (insertError) {
        console.error("Error inserting alerts:", insertError);
      }

      // Update last_matched_at for patterns that matched
      const patternIds = [...new Set(newAlerts.map(a => a.pattern_id))];
      for (const patternId of patternIds) {
        await supabase
          .from("user_patterns")
          .update({ last_matched_at: new Date().toISOString() })
          .eq("id", patternId);
      }
    }

    return new Response(JSON.stringify({ 
      matches: matchedDomains,
      newMatches: matchedDomains.length,
      totalPatterns: patterns.length,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Error in check-pattern-alerts:", error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "Unknown error" 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
