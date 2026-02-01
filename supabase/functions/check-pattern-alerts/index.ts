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

interface Auction {
  id: string;
  domain_name: string;
  price: number;
  tld: string | null;
  end_time: string | null;
  domain_age: number | null;
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

    // Get active auctions
    const now = new Date().toISOString();
    const { data: auctions, error: auctionsError } = await supabase
      .from("auctions")
      .select("id, domain_name, price, tld, end_time, domain_age")
      .gte("end_time", now)
      .limit(10000);

    if (auctionsError) {
      throw auctionsError;
    }

    // Get already-alerted combinations for this user
    const { data: existingAlerts, error: alertsError } = await supabase
      .from("pattern_alerts")
      .select("pattern_id, auction_id")
      .eq("user_id", userId);

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
      // Use safe regex validation
      const { regex, error: regexError } = createSafeRegex(pattern.pattern, "i");
      if (!regex) {
        console.error(`Unsafe or invalid regex pattern: ${pattern.pattern} - ${regexError}`);
        continue;
      }
        
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

        // Check character length filter (domain name without TLD)
        if (pattern.min_length && nameOnly.length < pattern.min_length) continue;
        if (pattern.max_length && nameOnly.length > pattern.max_length) continue;

        // Check domain age filter (in years)
        if (pattern.min_age && (!auction.domain_age || auction.domain_age < pattern.min_age)) continue;
        if (pattern.max_age && auction.domain_age && auction.domain_age > pattern.max_age) continue;

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

    // Record new alerts and send push notifications
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

      // Send push notification for new matches
      if (matchedDomains.length > 0) {
        const topMatches = matchedDomains.slice(0, 3).map(m => m.domain_name).join(", ");
        const moreCount = matchedDomains.length > 3 ? ` +${matchedDomains.length - 3} more` : "";
        
        // Use absolute URL for icon - expiredhawk.lovable.app is the production domain
        const iconUrl = "https://expiredhawk.lovable.app/icons/icon-192.png";
        
        // Send push notification
        try {
          await fetch(`${supabaseUrl}/functions/v1/send-push-notification`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
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
