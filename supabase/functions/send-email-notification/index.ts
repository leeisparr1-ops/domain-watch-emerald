import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const FOOTER_HTML = `
  <div style="text-align: center; padding: 24px 20px; font-size: 12px; color: #a1a1aa;">
    <p style="margin: 0 0 8px 0;">ExpiredHawk – Domain Monitoring Made Simple</p>
    <p style="margin: 0 0 8px 0;">
      <a href="https://expiredhawk.com/settings" style="color: #a1a1aa; text-decoration: underline;">Manage email preferences</a>
    </p>
    <p style="margin: 0; color: #d4d4d8;">
      ExpiredHawk · United Kingdom
    </p>
  </div>
`;

const FOOTER_TEXT = `\n\n---\nExpiredHawk – Domain Monitoring Made Simple\nManage email preferences: https://expiredhawk.com/settings\nExpiredHawk · United Kingdom`;

function makeEmailHeaders(): Record<string, string> {
  return {
    "List-Unsubscribe": "<https://expiredhawk.com/settings>",
    "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    "X-Entity-Ref-ID": crypto.randomUUID(),
  };
}

function wrapHtml(bodyContent: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;background-color:#f4f4f5;">
<div style="max-width:600px;margin:0 auto;padding:40px 20px;">
${bodyContent}
${FOOTER_HTML}
</div>
</body>
</html>`;
}

interface MatchedDomain {
  domain: string;
  price: number;
  pattern: string;
  pattern_id?: string;
  auction_id?: string;
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
        console.log("Email notifications explicitly disabled for user");
        return new Response(
          JSON.stringify({ message: "Email notifications disabled" }),
          { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      } else {
        recipientEmail = settings.notification_email;

        if (!recipientEmail) {
          const { data: authUser } = await supabase.auth.admin.getUserById(userId);
          recipientEmail = authUser?.user?.email;
          console.log(`No notification_email set, using auth email: ${recipientEmail}`);
        }
      }

      // Rate limit check
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
            console.log(`Rate limited: User ${userId} already received email within ${frequencyHours} hours`);
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
    let text = "";

    if (payload.type === "test") {
      subject = "ExpiredHawk – Test Notification";
      text = `ExpiredHawk – Test Notification\n\nYour email notifications are configured correctly. You will receive alerts when:\n- A domain matches one of your keyword patterns\n- New auctions appear for your tracked keywords\n\nManage your preferences: https://expiredhawk.com/settings${FOOTER_TEXT}`;
      html = wrapHtml(`
        <div style="background:linear-gradient(135deg,#22c55e 0%,#16a34a 100%);padding:30px;border-radius:16px 16px 0 0;text-align:center;">
          <h1 style="color:white;margin:0;font-size:28px;">ExpiredHawk</h1>
          <p style="color:rgba(255,255,255,0.9);margin:10px 0 0 0;">Email Notifications Active</p>
        </div>
        <div style="background:white;padding:32px 30px;border-radius:0 0 16px 16px;box-shadow:0 4px 6px rgba(0,0,0,0.1);">
          <h2 style="color:#18181b;margin-top:0;">Test Successful</h2>
          <p style="color:#3f3f46;line-height:1.6;">
            Your email notifications are configured correctly. You will receive alerts when:
          </p>
          <ul style="color:#3f3f46;line-height:1.8;">
            <li>A domain matches one of your keyword patterns</li>
            <li>New auctions appear for your tracked keywords</li>
          </ul>
          <p style="color:#71717a;font-size:14px;margin-bottom:0;">
            You can manage your notification preferences in your <a href="https://expiredhawk.com/settings" style="color:#22c55e;">account settings</a>.
          </p>
        </div>
      `);
    } else if (payload.type === "pattern_match") {
      let matches = payload.data?.matches || [];

      // Filter out domains already emailed to this user
      if (userId && matches.length > 0) {
        const domainNames = matches.map(m => m.domain);
        const { data: alreadyEmailed } = await supabase
          .from("emailed_domains")
          .select("domain_name")
          .eq("user_id", userId)
          .in("domain_name", domainNames);

        if (alreadyEmailed && alreadyEmailed.length > 0) {
          const emailedSet = new Set(alreadyEmailed.map(e => e.domain_name));
          const beforeCount = matches.length;
          matches = matches.filter(m => !emailedSet.has(m.domain));
          console.log(`Filtered ${beforeCount - matches.length} already-emailed domains, ${matches.length} remaining`);
        }
      }

      if (matches.length === 0) {
        console.log("All domains in this batch have already been emailed to user");
        return new Response(
          JSON.stringify({ message: "No new domains to email (all already sent)" }),
          { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      const totalMatches = matches.length;

      let domainList = "";
      let domainListText = "";
      if (matches.length > 0) {
        domainList = matches.map(m => `
          <li style="padding:12px 16px;border-bottom:1px solid #e5e7eb;display:flex;justify-content:space-between;align-items:center;">
            <div>
              <strong style="color:#1f2937;font-family:monospace;">${m.domain}</strong>
              <br><span style="color:#6b7280;font-size:12px;">Pattern: ${m.pattern}</span>
            </div>
            <div style="text-align:right;">
              <strong style="color:#059669;">$${m.price.toLocaleString()}</strong>
            </div>
          </li>
        `).join("");
        domainListText = matches.map(m => `- ${m.domain} ($${m.price.toLocaleString()}) – Pattern: ${m.pattern}`).join("\n");
      } else if (payload.matchedDomains) {
        domainList = payload.matchedDomains.slice(0, 10).map(d => `<li style="padding:8px 0;border-bottom:1px solid #e5e7eb;">${d}</li>`).join("");
        domainListText = payload.matchedDomains.slice(0, 10).map(d => `- ${d}`).join("\n");
      }

      const moreCount = totalMatches - (matches.length || (payload.matchedDomains?.slice(0, 10).length || 0));

      // Store matches for recording after successful send
      (req as any).__matchesToRecord = matches.filter(m => m.auction_id && m.pattern_id).map(m => ({
        user_id: userId,
        domain_name: m.domain,
        auction_id: m.auction_id,
        pattern_id: m.pattern_id,
      }));

      subject = `${totalMatches} domain${totalMatches > 1 ? 's' : ''} matched your patterns – ExpiredHawk`;
      text = `${totalMatches} domain${totalMatches > 1 ? 's' : ''} matched your patterns\n\n${domainListText}\n${moreCount > 0 ? `\n...and ${moreCount} more\n` : ""}\nView all matches: https://expiredhawk.com/dashboard${FOOTER_TEXT}`;
      html = wrapHtml(`
        <div style="background:linear-gradient(135deg,#22c55e 0%,#16a34a 100%);padding:30px;border-radius:16px 16px 0 0;text-align:center;">
          <h1 style="color:white;margin:0;font-size:28px;">ExpiredHawk</h1>
          <p style="color:rgba(255,255,255,0.9);margin:10px 0 0 0;">Pattern Match Alert</p>
        </div>
        <div style="background:white;padding:32px 30px;border-radius:0 0 16px 16px;box-shadow:0 4px 6px rgba(0,0,0,0.1);">
          <h2 style="color:#18181b;margin-top:0;">${totalMatches} Domain${totalMatches > 1 ? 's' : ''} Found</h2>
          <p style="color:#3f3f46;">
            New domains matching your patterns are available for auction.
          </p>
          <ul style="list-style:none;padding:0;margin:16px 0;background:#f9fafb;border-radius:8px;border:1px solid #e5e7eb;">
            ${domainList}
          </ul>
          ${moreCount > 0 ? `<p style="color:#71717a;font-style:italic;">...and ${moreCount} more domains</p>` : ""}
          <a href="https://expiredhawk.com/dashboard" style="display:inline-block;background:linear-gradient(135deg,#22c55e 0%,#16a34a 100%);color:white;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:16px;margin-top:16px;">
            View All Matches
          </a>
        </div>
      `);
    }

    console.log("Sending email to:", recipientEmail);

    const emailResponse: any = await resend.emails.send({
      from: "ExpiredHawk <notifications@expiredhawk.com>",
      replyTo: "support@expiredhawk.com",
      to: [recipientEmail],
      subject,
      html,
      text,
      headers: makeEmailHeaders(),
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

      // Record emailed domains to prevent duplicates
      const matchesToRecord = (req as any).__matchesToRecord;
      if (matchesToRecord && matchesToRecord.length > 0) {
        const { error: recordError } = await supabase
          .from("emailed_domains")
          .upsert(matchesToRecord, { onConflict: "user_id,domain_name", ignoreDuplicates: true });

        if (recordError) {
          console.error("Error recording emailed domains:", recordError);
        } else {
          console.log(`Recorded ${matchesToRecord.length} emailed domains for user ${userId}`);
        }
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
