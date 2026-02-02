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

interface UserMatches {
  user_id: string;
  matches: MatchedDomain[];
}

/**
 * This function runs after auction syncs to check ALL users' patterns
 * and send notifications. It uses service role key, no user auth required.
 */
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log("Starting pattern check for all users...");

    // Get all enabled patterns from all users
    const { data: allPatterns, error: patternsError } = await supabase
      .from("user_patterns")
      .select("*")
      .eq("enabled", true);

    if (patternsError) {
      throw patternsError;
    }

    if (!allPatterns || allPatterns.length === 0) {
      console.log("No active patterns found");
      return new Response(JSON.stringify({ 
        success: true,
        message: "No active patterns to check",
        duration_ms: Date.now() - startTime,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Found ${allPatterns.length} enabled patterns across all users`);

    // Get active auctions ending soon - limit to auctions ending within 7 days
    // and use the new index on (end_time, price) for faster queries
    const now = new Date();
    const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const nowIso = now.toISOString();
    const weekIso = weekFromNow.toISOString();
    
    const allAuctions: Auction[] = [];
    const batchSize = 1000;
    const maxBatches = 10; // Cap at 10k auctions for better performance
    
    for (let batch = 0; batch < maxBatches; batch++) {
      const { data: auctionBatch, error: auctionsError } = await supabase
        .from("auctions")
        .select("id, domain_name, price, tld, end_time, domain_age")
        .gte("end_time", nowIso)
        .lte("end_time", weekIso) // Only check auctions ending within 7 days
        .order("end_time", { ascending: true })
        .range(batch * batchSize, (batch + 1) * batchSize - 1);

      if (auctionsError) {
        console.error(`Batch ${batch} error:`, auctionsError);
        break;
      }

      if (!auctionBatch || auctionBatch.length === 0) {
        break;
      }

      allAuctions.push(...(auctionBatch as Auction[]));
      
      if (auctionBatch.length < batchSize) {
        break; // No more data
      }
    }

    const auctions = allAuctions;
    
    if (auctions.length === 0) {
      console.log("No active auctions found within the next 7 days");
      return new Response(JSON.stringify({ 
        success: true,
        message: "No active auctions within 7 days",
        duration_ms: Date.now() - startTime,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Checking ${allPatterns.length} patterns against ${auctions.length} auctions`);

    // Get all existing alerts to avoid duplicates
    const { data: existingAlerts, error: alertsError } = await supabase
      .from("pattern_alerts")
      .select("user_id, pattern_id, auction_id");

    if (alertsError) {
      console.error("Error fetching existing alerts:", alertsError);
    }

    const alertedSet = new Set(
      (existingAlerts || []).map(a => `${a.user_id}:${a.pattern_id}:${a.auction_id}`)
    );

    // Group patterns by user
    const patternsByUser = new Map<string, UserPattern[]>();
    for (const pattern of allPatterns as UserPattern[]) {
      const existing = patternsByUser.get(pattern.user_id) || [];
      existing.push(pattern);
      patternsByUser.set(pattern.user_id, existing);
    }

    const userMatchesMap = new Map<string, MatchedDomain[]>();
    const newAlerts: { user_id: string; pattern_id: string; auction_id: string; domain_name: string }[] = [];
    const matchedPatternIds = new Set<string>();

    // Check each pattern against auctions
    for (const [userId, patterns] of patternsByUser) {
      for (const pattern of patterns) {
        // Use safe regex validation
        const { regex, error: regexError } = createSafeRegex(pattern.pattern, "i");
        if (!regex) {
          console.error(`Unsafe or invalid regex pattern: ${pattern.pattern} - ${regexError}`);
          continue;
        }
          
        for (const auction of auctions as Auction[]) {
          // Skip if already alerted
          const key = `${userId}:${pattern.id}:${auction.id}`;
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
          const match: MatchedDomain = {
            auction_id: auction.id,
            domain_name: auction.domain_name,
            price: auction.price,
            end_time: auction.end_time,
            pattern_id: pattern.id,
            pattern_description: pattern.description || pattern.pattern,
          };

          const userMatches = userMatchesMap.get(userId) || [];
          userMatches.push(match);
          userMatchesMap.set(userId, userMatches);

          newAlerts.push({
            user_id: userId,
            pattern_id: pattern.id,
            auction_id: auction.id,
            domain_name: auction.domain_name,
          });

          matchedPatternIds.add(pattern.id);
        }
      }
    }

    console.log(`Found ${newAlerts.length} new matches for ${userMatchesMap.size} users`);

    // Record new alerts
    if (newAlerts.length > 0) {
      // Insert in batches to avoid size limits
      const batchSize = 500;
      for (let i = 0; i < newAlerts.length; i += batchSize) {
        const batch = newAlerts.slice(i, i + batchSize);
        const { error: insertError } = await supabase
          .from("pattern_alerts")
          .upsert(batch, { onConflict: "user_id,pattern_id,auction_id" });

        if (insertError) {
          console.error("Error inserting alerts batch:", insertError);
        }
      }

      // Update last_matched_at for patterns that matched
      for (const patternId of matchedPatternIds) {
        await supabase
          .from("user_patterns")
          .update({ last_matched_at: new Date().toISOString() })
          .eq("id", patternId);
      }
    }

    // Send notifications to each user with matches
    let notificationsSent = 0;
    for (const [userId, matches] of userMatchesMap) {
      if (matches.length === 0) continue;

      const topMatches = matches.slice(0, 3).map(m => m.domain_name).join(", ");
      const moreCount = matches.length > 3 ? ` +${matches.length - 3} more` : "";
      
      // Use absolute production URL for push notification icons
      const iconUrl = "https://expiredhawk.lovable.app/icons/icon-192.png";

      // Send push notification
      try {
        await fetch(`${supabaseUrl}/functions/v1/send-push-notification`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            user_id: userId,
            payload: {
              title: `🎯 ${matches.length} Domain${matches.length > 1 ? 's' : ''} Match Your Patterns!`,
              body: `${topMatches}${moreCount}`,
              icon: iconUrl,
              badge: iconUrl,
              image: iconUrl,
              tag: "pattern-match",
              url: "/dashboard",
            },
          }),
        });
        notificationsSent++;
      } catch (pushError) {
        console.error(`Error sending push to user ${userId}:`, pushError);
      }

      // Send email notification (the function handles checking if email is enabled)
      try {
        await fetch(`${supabaseUrl}/functions/v1/send-email-notification`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "pattern_match",
            userId: userId,
            data: {
              matches: matches.slice(0, 10).map(m => ({
                domain: m.domain_name,
                price: m.price,
                pattern: m.pattern_description,
                pattern_id: m.pattern_id,
                auction_id: m.auction_id,
                end_time: m.end_time,
              })),
              totalMatches: matches.length,
            },
          }),
        });
      } catch (emailError) {
        console.error(`Error sending email to user ${userId}:`, emailError);
      }
    }

    const duration = Date.now() - startTime;
    console.log(`Pattern check complete in ${duration}ms. Sent ${notificationsSent} push notifications.`);

    return new Response(JSON.stringify({ 
      success: true,
      message: `Checked ${allPatterns.length} patterns, found ${newAlerts.length} new matches`,
      usersNotified: userMatchesMap.size,
      totalNewMatches: newAlerts.length,
      notificationsSent,
      duration_ms: duration,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Error in check-all-patterns:", error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "Unknown error",
      duration_ms: Date.now() - startTime,
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
