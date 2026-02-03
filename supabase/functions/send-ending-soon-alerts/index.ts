import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * This function sends reminder notifications for auctions ending soon.
 * It targets domains that users have already been alerted about (in pattern_alerts)
 * but are now close to ending and haven't received an "ending soon" reminder.
 * 
 * Default: Alerts for auctions ending within the next 2 hours.
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

    // Parse optional threshold from request body (default: 2 hours)
    let thresholdHours = 2;
    try {
      const body = await req.json();
      if (body.thresholdHours && typeof body.thresholdHours === "number") {
        thresholdHours = Math.min(Math.max(body.thresholdHours, 0.5), 24); // Clamp between 0.5 and 24 hours
      }
    } catch {
      // No body or invalid JSON, use defaults
    }

    const now = new Date();
    const thresholdTime = new Date(now.getTime() + thresholdHours * 60 * 60 * 1000);
    const nowIso = now.toISOString();
    const thresholdIso = thresholdTime.toISOString();

    console.log(`Checking for auctions ending between now and ${thresholdIso} (${thresholdHours}h window)`);

    // Find auctions ending within the threshold that have pattern_alerts
    // but haven't had an "ending soon" reminder sent yet
    const { data: endingSoonAlerts, error: alertsError } = await supabase
      .from("pattern_alerts")
      .select(`
        id,
        user_id,
        pattern_id,
        auction_id,
        domain_name,
        alerted_at,
        auctions!inner (
          id,
          domain_name,
          price,
          end_time
        )
      `)
      .gte("auctions.end_time", nowIso)
      .lte("auctions.end_time", thresholdIso);

    if (alertsError) {
      console.error("Error fetching ending soon alerts:", alertsError);
      throw alertsError;
    }

    if (!endingSoonAlerts || endingSoonAlerts.length === 0) {
      console.log("No auctions ending soon with existing alerts");
      return new Response(JSON.stringify({
        success: true,
        message: "No auctions ending soon",
        duration_ms: Date.now() - startTime,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Found ${endingSoonAlerts.length} alerts for auctions ending soon`);

    // Check which ones have already received an ending-soon reminder
    // We track this by checking emailed_domains with a special pattern_id suffix
    const endingSoonPatternSuffix = ":ending-soon";
    
    const { data: alreadyReminded, error: remindedError } = await supabase
      .from("emailed_domains")
      .select("user_id, domain_name, pattern_id")
      .like("pattern_id", `%${endingSoonPatternSuffix}`);

    if (remindedError) {
      console.error("Error checking already reminded:", remindedError);
    }

    const remindedSet = new Set(
      (alreadyReminded || []).map(r => `${r.user_id}:${r.domain_name}`)
    );

    // Group by user
    const userAuctions = new Map<string, Array<{
      auction_id: string;
      domain_name: string;
      price: number;
      end_time: string;
      pattern_id: string;
    }>>();

    for (const alert of endingSoonAlerts) {
      const auction = alert.auctions as any;
      const key = `${alert.user_id}:${alert.domain_name}`;
      
      // Skip if already reminded for this domain
      if (remindedSet.has(key)) continue;

      const existing = userAuctions.get(alert.user_id) || [];
      existing.push({
        auction_id: alert.auction_id,
        domain_name: alert.domain_name,
        price: auction.price,
        end_time: auction.end_time,
        pattern_id: alert.pattern_id,
      });
      userAuctions.set(alert.user_id, existing);
    }

    console.log(`${userAuctions.size} users have auctions ending soon that need reminders`);

    let notificationsSent = 0;
    const recordsToInsert: Array<{
      user_id: string;
      domain_name: string;
      auction_id: string;
      pattern_id: string;
    }> = [];

    for (const [userId, auctions] of userAuctions) {
      if (auctions.length === 0) continue;

      // Sort by end_time (soonest first)
      auctions.sort((a, b) => new Date(a.end_time).getTime() - new Date(b.end_time).getTime());

      const topDomains = auctions.slice(0, 3).map(a => a.domain_name).join(", ");
      const moreCount = auctions.length > 3 ? ` +${auctions.length - 3} more` : "";
      
      // Calculate time remaining for the soonest auction
      const soonestEnd = new Date(auctions[0].end_time);
      const minutesRemaining = Math.round((soonestEnd.getTime() - now.getTime()) / (1000 * 60));
      const timeString = minutesRemaining >= 60 
        ? `${Math.floor(minutesRemaining / 60)}h ${minutesRemaining % 60}m`
        : `${minutesRemaining}m`;

      const iconUrl = "https://expiredhawk.lovable.app/icons/icon-192.png";

      // Send push notification
      try {
        await fetch(`${supabaseUrl}/functions/v1/send-push-notification`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            user_id: userId,
            payload: {
              title: `⏰ ${auctions.length} Auction${auctions.length > 1 ? 's' : ''} Ending Soon!`,
              body: `${topDomains}${moreCount} - ${timeString} remaining`,
              icon: iconUrl,
              badge: iconUrl,
              tag: "ending-soon",
              url: "/dashboard",
            },
          }),
        });
        notificationsSent++;
      } catch (pushError) {
        console.error(`Error sending push to user ${userId}:`, pushError);
      }

      // Send email notification
      try {
        await fetch(`${supabaseUrl}/functions/v1/send-email-notification`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "pattern_match",
            userId: userId,
            data: {
              matches: auctions.slice(0, 10).map(a => ({
                domain: a.domain_name,
                price: a.price,
                pattern: `⏰ Ending in ${timeString}`,
                pattern_id: a.pattern_id + endingSoonPatternSuffix,
                auction_id: a.auction_id,
                end_time: a.end_time,
              })),
              totalMatches: auctions.length,
            },
          }),
        });
      } catch (emailError) {
        console.error(`Error sending email to user ${userId}:`, emailError);
      }

      // Record these as reminded
      for (const auction of auctions) {
        recordsToInsert.push({
          user_id: userId,
          domain_name: auction.domain_name,
          auction_id: auction.auction_id,
          pattern_id: auction.pattern_id + endingSoonPatternSuffix,
        });
      }
    }

    // Record reminded domains to prevent duplicate reminders
    if (recordsToInsert.length > 0) {
      const { error: insertError } = await supabase
        .from("emailed_domains")
        .upsert(recordsToInsert, { onConflict: "user_id,domain_name", ignoreDuplicates: true });

      if (insertError) {
        console.error("Error recording reminded domains:", insertError);
      } else {
        console.log(`Recorded ${recordsToInsert.length} ending-soon reminders`);
      }
    }

    const duration = Date.now() - startTime;
    console.log(`Ending-soon check complete in ${duration}ms. Sent ${notificationsSent} notifications.`);

    return new Response(JSON.stringify({
      success: true,
      usersNotified: userAuctions.size,
      notificationsSent,
      auctionsReminded: recordsToInsert.length,
      duration_ms: duration,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Error in send-ending-soon-alerts:", error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : "Unknown error",
      duration_ms: Date.now() - startTime,
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
