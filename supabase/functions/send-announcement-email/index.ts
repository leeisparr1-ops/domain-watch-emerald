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

function makeEmailHeaders(): Record<string, string> {
  return {
    "List-Unsubscribe": "<https://expiredhawk.com/settings>",
    "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    "X-Entity-Ref-ID": crypto.randomUUID(),
    "Precedence": "bulk",
    "Feedback-ID": "announcement:expiredhawk",
    "X-Mailer": "ExpiredHawk Notifications",
  };
}

function preheaderHtml(text: string): string {
  return `<div style="display:none;font-size:1px;color:#f4f4f5;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all;">${text}${"&nbsp;&zwnj;".repeat(30)}</div>`;
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log("Fetching all users to send announcement emails...");

    const { data: usersData, error: usersError } = await supabase.auth.admin.listUsers();

    if (usersError) {
      throw new Error(`Failed to fetch users: ${usersError.message}`);
    }

    const users = usersData?.users || [];
    console.log(`Found ${users.length} users to send announcement emails to`);

    const results: { email: string; success: boolean; error?: string }[] = [];
    let successCount = 0;
    let failCount = 0;

    for (const user of users) {
      if (!user.email) {
        console.log(`Skipping user ${user.id} - no email`);
        continue;
      }

      // Check if user has opted out of email notifications
      const { data: settings } = await supabase
        .from("user_settings")
        .select("email_notifications_enabled")
        .eq("user_id", user.id)
        .maybeSingle();

      if (settings?.email_notifications_enabled === false) {
        console.log(`Skipping user ${user.email} - email notifications disabled`);
        continue;
      }

      const text = `ExpiredHawk Update - February 2026\n\nHi there,\n\nWe have been shipping fast and wanted to share what is new and what is coming next.\n\nWhat We Have Built\n\nAlgorithmic Valuations on Every Listing\nEvery domain in the dashboard now shows an Algo Valuation alongside the current price. You will see a clear indicator when a domain is priced below our valuation - making it easier to spot deals at a glance.\n\nAI Domain Advisor - Deep-Linked from Dashboard\nYou can now jump straight from any listing to a full AI-powered analysis. Get Market Positioning, SEO potential, Risk Assessment, and a Flip Score - all from one click on the dashboard.\n\nName Generator - Keyword Combinations\nThe Name Generator now produces full-keyword domain ideas (like GoSolar, SolarHub, TryCrypto) alongside invented brandables. This gives you a much wider range of registrable options.\n\n2.7M+ Domain Database\nOur multi-source sync engine now processes over 2.7 million domain rows, keeping the dashboard stocked with fresh inventory.\n\nWhat We Are Building Next\n\n- Smarter valuations powered by our curated dataset of verified comparable sales\n- Enhanced pattern matching and alert accuracy\n- Portfolio tracking improvements with renewal cost forecasting\n- Continued notification reliability improvements\n\nAll tools remain free to use - head to expiredhawk.com/tools to explore.\n\nAs always, if you have feedback or ideas, reply to this email or reach us at support@expiredhawk.com.\n\nHappy hunting,\n- The ExpiredHawk Team${FOOTER_TEXT}`;

      const announcementHtml = `<!DOCTYPE html>
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
${preheaderHtml("Algo valuations, AI Advisor deep-links, keyword name generation and more.")}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f4f4f5;">
<tr><td align="center" style="padding:40px 10px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;">
  <tr><td style="background-color:#16a34a;padding:28px 30px;text-align:center;border-radius:8px 8px 0 0;">
    <h1 style="color:#ffffff;margin:0;font-size:26px;font-weight:bold;">ExpiredHawk</h1>
    <p style="color:#ffffff;margin:8px 0 0 0;font-size:14px;opacity:0.9;">February 2026 Update</p>
  </td></tr>
  <tr><td style="background-color:#ffffff;padding:32px 30px;border-radius:0 0 8px 8px;">
    <p style="color:#3f3f46;line-height:1.7;font-size:15px;">Hi there,</p>
    <p style="color:#3f3f46;line-height:1.7;font-size:15px;">
      We have been shipping fast and wanted to share what is new and what is coming next.
    </p>

    <h2 style="color:#18181b;font-size:19px;margin:28px 0 16px 0;border-bottom:2px solid #e4e4e7;padding-bottom:8px;">What We Have Built</h2>

    <h3 style="color:#18181b;font-size:16px;margin:20px 0 6px 0;">Algorithmic Valuations on Every Listing</h3>
    <p style="color:#3f3f46;line-height:1.7;font-size:15px;">
      Every domain in the dashboard now shows an <strong>Algo Valuation</strong> alongside the current price. You will see a clear indicator when a domain is priced below our valuation &ndash; making it easier to spot deals at a glance.
    </p>

    <h3 style="color:#18181b;font-size:16px;margin:20px 0 6px 0;">AI Domain Advisor &ndash; Deep-Linked from Dashboard</h3>
    <p style="color:#3f3f46;line-height:1.7;font-size:15px;">
      You can now jump straight from any listing to a full AI-powered analysis. Get Market Positioning, SEO potential, Risk Assessment, and a <strong>Flip Score</strong> &ndash; all from one click on the dashboard.
    </p>

    <h3 style="color:#18181b;font-size:16px;margin:20px 0 6px 0;">Name Generator &ndash; Keyword Combinations</h3>
    <p style="color:#3f3f46;line-height:1.7;font-size:15px;">
      The Name Generator now produces full-keyword domain ideas (like GoSolar, SolarHub, TryCrypto) alongside invented brandables. This gives you a much wider range of registrable options.
    </p>

    <h3 style="color:#18181b;font-size:16px;margin:20px 0 6px 0;">2.7M+ Domain Database</h3>
    <p style="color:#3f3f46;line-height:1.7;font-size:15px;">
      Our multi-source sync engine now processes over 2.7 million domain rows, keeping the dashboard stocked with fresh inventory.
    </p>

    <h2 style="color:#18181b;font-size:19px;margin:28px 0 16px 0;border-bottom:2px solid #e4e4e7;padding-bottom:8px;">What We Are Building Next</h2>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr><td style="padding:6px 0;color:#3f3f46;font-size:15px;">Smarter valuations powered by our curated dataset of <strong>verified comparable sales</strong></td></tr>
      <tr><td style="padding:6px 0;color:#3f3f46;font-size:15px;">Enhanced pattern matching and alert accuracy</td></tr>
      <tr><td style="padding:6px 0;color:#3f3f46;font-size:15px;">Portfolio tracking improvements with renewal cost forecasting</td></tr>
      <tr><td style="padding:6px 0;color:#3f3f46;font-size:15px;">Continued notification reliability improvements</td></tr>
    </table>

    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:28px 0;">
      <tr><td style="background-color:#16a34a;border-radius:6px;padding:12px 28px;">
        <a href="https://expiredhawk.com/tools" style="color:#ffffff;text-decoration:none;font-weight:bold;font-size:15px;display:inline-block;">Explore the Tools</a>
      </td></tr>
    </table>

    <p style="color:#3f3f46;line-height:1.7;font-size:15px;">
      As always, if you have feedback or ideas, reply to this email or reach us at <a href="mailto:support@expiredhawk.com" style="color:#16a34a;font-weight:bold;">support@expiredhawk.com</a>.
    </p>
    <p style="color:#3f3f46;line-height:1.7;font-size:15px;">Happy hunting,</p>
    <p style="color:#3f3f46;font-size:15px;margin-bottom:0;">&ndash; The ExpiredHawk Team</p>
  </td></tr>
  ${FOOTER_HTML}
</table>
</td></tr>
</table>
</body>
</html>`;

      try {
        console.log(`Sending announcement email to: ${user.email}`);

        const emailResponse: any = await resend.emails.send({
          from: "ExpiredHawk <notifications@expiredhawk.com>",
          replyTo: "support@expiredhawk.com",
          to: [user.email],
          subject: "ExpiredHawk Update - February 2026",
          html: announcementHtml,
          text,
          headers: makeEmailHeaders(),
        });

        if (emailResponse?.error) {
          console.error(`Failed to send to ${user.email}:`, emailResponse.error);
          results.push({ email: user.email, success: false, error: emailResponse.error?.message });
          failCount++;
        } else {
          console.log(`Announcement email sent to ${user.email}`);
          results.push({ email: user.email, success: true });
          successCount++;
        }

        await new Promise(resolve => setTimeout(resolve, 600));
      } catch (err: any) {
        console.error(`Error sending to ${user.email}:`, err.message);
        results.push({ email: user.email, success: false, error: err.message });
        failCount++;
      }
    }

    console.log(`Announcement emails complete. Success: ${successCount}, Failed: ${failCount}`);

    return new Response(
      JSON.stringify({
        success: true,
        totalUsers: users.length,
        successCount,
        failCount,
        results
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in send-announcement-email:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
