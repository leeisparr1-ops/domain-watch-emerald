import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface MatchedDomain {
  domain: string;
  price: number;
  pattern: string;
  end_time: string | null;
}

interface EmailNotificationRequest {
  type: "pattern_match" | "test";
  email?: string;
  userId?: string;
  patternName?: string;
  matchedDomains?: string[];
  data?: {
    matches: MatchedDomain[];
    totalMatches: number;
  };
}

serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const payload: EmailNotificationRequest = await req.json();
    console.log("Email notification request:", payload);

    let recipientEmail = payload.email;
    let userId = payload.userId;
    
    // Try to get user from auth header if not provided
    if (!userId) {
      const authHeader = req.headers.get("Authorization");
      if (authHeader) {
        const token = authHeader.replace("Bearer ", "");
        const { data: { user } } = await supabase.auth.getUser(token);
        if (user) {
          userId = user.id;
        }
      }
    }
    
    // If userId provided, fetch email from user settings or auth
    if (userId && !recipientEmail) {
      const { data: settings } = await supabase
        .from("user_settings")
        .select("notification_email, email_notifications_enabled")
        .eq("user_id", userId)
        .maybeSingle();

      // If no settings record exists, create one with email enabled by default
      if (!settings) {
        console.log(`No settings found for user ${userId}, creating default settings with email enabled`);
        const { data: authUser } = await supabase.auth.admin.getUserById(userId);
        const userEmail = authUser?.user?.email;
        
        if (userEmail) {
          await supabase.from("user_settings").upsert({
            user_id: userId,
            email_notifications_enabled: true,
            notification_email: userEmail,
            notification_frequency_hours: 2,
            subscription_plan: 'free',
          }, { onConflict: 'user_id' });
          
          recipientEmail = userEmail;
          console.log(`Created default settings for user ${userId}, email: ${userEmail}`);
        }
      } else if (settings.email_notifications_enabled === false) {
        // Only skip if explicitly disabled (not null/undefined)
        console.log("Email notifications explicitly disabled for user");
        return new Response(
          JSON.stringify({ message: "Email notifications disabled" }),
          { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      } else {
        // Use notification_email from settings if available
        recipientEmail = settings.notification_email;
        
        // Fallback to auth email if notification_email is not set
        if (!recipientEmail) {
          const { data: authUser } = await supabase.auth.admin.getUserById(userId);
          recipientEmail = authUser?.user?.email;
          console.log(`No notification_email set, using auth email: ${recipientEmail}`);
        }
      }

      // Rate limit: Check last email sent using user's configured frequency preference
      if (payload.type === "pattern_match") {
        const { data: rateLimitCheck } = await supabase
          .from("user_settings")
          .select("last_email_sent_at, notification_frequency_hours")
          .eq("user_id", userId)
          .maybeSingle();
        
        const frequencyHours = rateLimitCheck?.notification_frequency_hours || 2;
        
        if (rateLimitCheck?.last_email_sent_at) {
          const lastEmailTime = new Date(rateLimitCheck.last_email_sent_at).getTime();
          const frequencyMs = frequencyHours * 60 * 60 * 1000;
          
          if (Date.now() - lastEmailTime < frequencyMs) {
            console.log(`Rate limited: User ${userId} already received email within ${frequencyHours} hours (last: ${rateLimitCheck.last_email_sent_at})`);
            return new Response(
              JSON.stringify({ message: `Rate limited - email already sent within ${frequencyHours} hours` }),
              { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
            );
          }
        }
      }
    }

    if (!recipientEmail) {
      throw new Error("No email address found for notification");
    }

    let subject = "";
    let html = "";

    if (payload.type === "test") {
      subject = "🔔 ExpiredHawk Test Notification";
      html = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); padding: 30px; border-radius: 12px; text-align: center; margin-bottom: 20px;">
            <h1 style="color: white; margin: 0; font-size: 28px;">🦅 ExpiredHawk</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">Email Notifications Active</p>
          </div>
          <div style="background: #f9fafb; padding: 24px; border-radius: 12px; border: 1px solid #e5e7eb;">
            <h2 style="color: #1f2937; margin-top: 0;">✅ Test Successful!</h2>
            <p style="color: #4b5563; line-height: 1.6;">
              Your email notifications are configured correctly. You'll receive alerts when:
            </p>
            <ul style="color: #4b5563; line-height: 1.8;">
              <li>A domain matches one of your keyword patterns</li>
              <li>New auctions appear for your tracked keywords</li>
            </ul>
            <p style="color: #6b7280; font-size: 14px; margin-bottom: 0;">
              You can manage your notification preferences in your account settings.
            </p>
          </div>
          <p style="color: #9ca3af; font-size: 12px; text-align: center; margin-top: 20px;">
            © ExpiredHawk - Domain Monitoring Made Simple
          </p>
        </div>
      `;
    } else if (payload.type === "pattern_match") {
      // Support both old and new data formats
      const matches = payload.data?.matches || [];
      const totalMatches = payload.data?.totalMatches || payload.matchedDomains?.length || matches.length;
      
      let domainList = "";
      if (matches.length > 0) {
        domainList = matches.map(m => `
          <li style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb; display: flex; justify-content: space-between; align-items: center;">
            <div>
              <strong style="color: #1f2937; font-family: monospace;">${m.domain}</strong>
              <br><span style="color: #6b7280; font-size: 12px;">Pattern: ${m.pattern}</span>
            </div>
            <div style="text-align: right;">
              <strong style="color: #059669;">$${m.price.toLocaleString()}</strong>
            </div>
          </li>
        `).join("");
      } else if (payload.matchedDomains) {
        domainList = payload.matchedDomains.slice(0, 10).map(d => `<li style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">${d}</li>`).join("");
      }
      
      const moreCount = totalMatches - (matches.length || (payload.matchedDomains?.slice(0, 10).length || 0));
      const patternDisplay = payload.patternName || (matches.length > 0 ? matches[0].pattern : "Your Patterns");
      
      subject = `🎯 ${totalMatches} Domain${totalMatches > 1 ? 's' : ''} Match Your Patterns!`;
      html = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); padding: 30px; border-radius: 12px; text-align: center; margin-bottom: 20px;">
            <h1 style="color: white; margin: 0; font-size: 28px;">🦅 ExpiredHawk</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">Pattern Match Alert</p>
          </div>
          <div style="background: #f9fafb; padding: 24px; border-radius: 12px; border: 1px solid #e5e7eb;">
            <h2 style="color: #1f2937; margin-top: 0;">🎯 ${totalMatches} Domain${totalMatches > 1 ? 's' : ''} Found!</h2>
            <p style="color: #4b5563;">
              New domains matching your patterns are available for auction.
            </p>
            <ul style="list-style: none; padding: 0; margin: 16px 0; background: white; border-radius: 8px; border: 1px solid #e5e7eb;">
              ${domainList}
            </ul>
            ${moreCount > 0 ? `<p style="color: #6b7280; font-style: italic;">...and ${moreCount} more domains</p>` : ""}
            <a href="https://expiredhawk.com/dashboard" style="display: inline-block; background: #22c55e; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; margin-top: 16px;">
              View All Matches →
            </a>
          </div>
          <p style="color: #9ca3af; font-size: 12px; text-align: center; margin-top: 20px;">
            © ExpiredHawk - Domain Monitoring Made Simple
          </p>
        </div>
      `;
    }

    console.log("Sending email to:", recipientEmail);

    // Resend's SDK can return { data, error } without throwing.
    // If we don't handle that, we can incorrectly mark emails as sent and
    // update last_email_sent_at, which then rate-limits future (valid) attempts.
    const emailResponse: any = await resend.emails.send({
      from: "ExpiredHawk <notifications@expiredhawk.com>",
      to: [recipientEmail],
      subject,
      html,
    });

    if (emailResponse?.error) {
      console.error("Resend returned an error:", emailResponse.error);
      throw new Error(emailResponse.error?.message || "Email provider error");
    }

    console.log("Email sent successfully:", emailResponse);

    // Update last_email_sent_at for rate limiting (only after confirmed success)
    if (payload.type === "pattern_match" && userId) {
      const { error: updateError } = await supabase
        .from("user_settings")
        .update({ last_email_sent_at: new Date().toISOString() })
        .eq("user_id", userId);

      if (updateError) {
        console.error("Error updating last_email_sent_at:", updateError);
      } else {
        console.log(`Updated last_email_sent_at for user ${userId}`);
      }
    }

    return new Response(JSON.stringify({ success: true, ...emailResponse }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error sending email notification:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
