import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const FOOTER_HTML = `
<tr><td style="padding:24px 20px;text-align:center;font-size:12px;color:#71717a;border-top:1px solid #e4e4e7;">
  <p style="margin:0 0 6px 0;">ExpiredHawk &ndash; Domain Monitoring Made Simple</p>
  <p style="margin:0 0 6px 0;"><a href="https://expiredhawk.com/settings" style="color:#71717a;text-decoration:underline;">Manage email preferences</a></p>
  <p style="margin:0;">ExpiredHawk &middot; United Kingdom</p>
</td></tr>`;

const FOOTER_TEXT = `\n\n---\nExpiredHawk – Domain Monitoring Made Simple\nManage email preferences: https://expiredhawk.com/settings\nExpiredHawk · United Kingdom`;

function makeEmailHeaders(category: string): Record<string, string> {
  return {
    "List-Unsubscribe": "<https://expiredhawk.com/settings>",
    "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    "X-Entity-Ref-ID": crypto.randomUUID(),
    "Feedback-ID": `${category}:expiredhawk`,
    "X-Mailer": "ExpiredHawk Notifications",
  };
}

function preheaderHtml(text: string): string {
  return `<div style="display:none;font-size:1px;color:#f4f4f5;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all;">${text}${"&nbsp;&zwnj;".repeat(30)}</div>`;
}

function wrapHtml(bodyContent: string, preheader?: string): string {
  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<meta name="x-apple-disable-message-reformatting">
<meta name="format-detection" content="telephone=no,address=no,email=no,date=no">
<!--[if mso]><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml><![endif]-->
<style>body,table,td{font-family:Arial,Helvetica,sans-serif;}a{color:#16a34a;}</style>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:Arial,Helvetica,sans-serif;">
${preheader ? preheaderHtml(preheader) : ""}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f4f4f5;">
<tr><td align="center" style="padding:40px 10px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;">
  <tr><td style="background-color:#16a34a;padding:28px 30px;text-align:center;border-radius:8px 8px 0 0;">
    <h1 style="color:#ffffff;margin:0;font-size:26px;font-weight:bold;">ExpiredHawk</h1>
  </td></tr>
  <tr><td style="background-color:#ffffff;padding:32px 30px;border-radius:0 0 8px 8px;">
    ${bodyContent}
  </td></tr>
  ${FOOTER_HTML}
</table>
</td></tr>
</table>
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
      subject = "ExpiredHawk - Test Notification";
      text = `ExpiredHawk - Test Notification\n\nYour email notifications are configured correctly. You will receive alerts when:\n- A domain matches one of your keyword patterns\n- New auctions appear for your tracked keywords\n\nManage your preferences: https://expiredhawk.com/settings${FOOTER_TEXT}`;
      html = wrapHtml(`
        <h2 style="color:#18181b;margin:0 0 16px 0;font-size:22px;">Test Successful</h2>
        <p style="color:#3f3f46;line-height:1.6;font-size:15px;">
          Your email notifications are configured correctly. You will receive alerts when:
        </p>
        <ul style="color:#3f3f46;line-height:1.8;font-size:15px;padding-left:20px;">
          <li>A domain matches one of your keyword patterns</li>
          <li>New auctions appear for your tracked keywords</li>
        </ul>
        <p style="color:#71717a;font-size:14px;margin-bottom:0;">
          You can manage your notification preferences in your <a href="https://expiredhawk.com/settings" style="color:#16a34a;">account settings</a>.
        </p>
      `, "Your email notifications are working correctly.");
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

      let domainRows = "";
      let domainListText = "";
      if (matches.length > 0) {
        domainRows = matches.map(m => `
          <tr>
            <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;font-family:monospace;color:#1f2937;font-size:14px;">${m.domain}</td>
            <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;color:#6b7280;font-size:13px;">${m.pattern}</td>
            <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;color:#16a34a;font-weight:bold;text-align:right;font-size:14px;">$${m.price.toLocaleString()}</td>
          </tr>
        `).join("");
        domainListText = matches.map(m => `- ${m.domain} ($${m.price.toLocaleString()}) - Pattern: ${m.pattern}`).join("\n");
      } else if (payload.matchedDomains) {
        domainRows = payload.matchedDomains.slice(0, 10).map(d => `<tr><td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;" colspan="3">${d}</td></tr>`).join("");
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

      subject = `${totalMatches} domain${totalMatches > 1 ? 's' : ''} matched your patterns`;
      text = `${totalMatches} domain${totalMatches > 1 ? 's' : ''} matched your patterns\n\n${domainListText}\n${moreCount > 0 ? `\n...and ${moreCount} more\n` : ""}\nView all matches: https://expiredhawk.com/dashboard${FOOTER_TEXT}`;
      const preheaderText = matches.slice(0, 3).map(m => m.domain).join(", ");
      html = wrapHtml(`
        <h2 style="color:#18181b;margin:0 0 16px 0;font-size:22px;">${totalMatches} Domain${totalMatches > 1 ? 's' : ''} Found</h2>
        <p style="color:#3f3f46;font-size:15px;line-height:1.6;">
          New domains matching your patterns are available for auction.
        </p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:16px 0;border:1px solid #e5e7eb;border-radius:6px;">
          <tr style="background-color:#f9fafb;">
            <th style="padding:10px 12px;text-align:left;font-size:13px;color:#6b7280;border-bottom:1px solid #e5e7eb;">Domain</th>
            <th style="padding:10px 12px;text-align:left;font-size:13px;color:#6b7280;border-bottom:1px solid #e5e7eb;">Pattern</th>
            <th style="padding:10px 12px;text-align:right;font-size:13px;color:#6b7280;border-bottom:1px solid #e5e7eb;">Price</th>
          </tr>
          ${domainRows}
        </table>
        ${moreCount > 0 ? `<p style="color:#71717a;font-size:14px;font-style:italic;">...and ${moreCount} more domains</p>` : ""}
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:20px 0;">
          <tr><td style="background-color:#16a34a;border-radius:6px;padding:12px 28px;">
            <a href="https://expiredhawk.com/dashboard" style="color:#ffffff;text-decoration:none;font-weight:bold;font-size:15px;display:inline-block;">View All Matches</a>
          </td></tr>
        </table>
      `, preheaderText);
    }

    console.log("Sending email to:", recipientEmail);

    const category = payload.type === "test" ? "test" : "pattern_match";
    const emailResponse: any = await resend.emails.send({
      from: "ExpiredHawk <notifications@expiredhawk.com>",
      replyTo: "support@expiredhawk.com",
      to: [recipientEmail],
      subject,
      html,
      text,
      headers: makeEmailHeaders(category),
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
