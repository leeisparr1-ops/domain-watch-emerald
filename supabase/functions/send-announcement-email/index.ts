import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const FOOTER_HTML = `
  <div style="text-align:center;padding:24px 20px;font-size:12px;color:#a1a1aa;">
    <p style="margin:0 0 8px 0;">ExpiredHawk – Domain Monitoring Made Simple</p>
    <p style="margin:0 0 8px 0;">
      <a href="https://expiredhawk.com/settings" style="color:#a1a1aa;text-decoration:underline;">Manage email preferences</a>
    </p>
    <p style="margin:0;color:#d4d4d8;">ExpiredHawk · United Kingdom</p>
  </div>
`;

const FOOTER_TEXT = `\n\n---\nExpiredHawk – Domain Monitoring Made Simple\nManage email preferences: https://expiredhawk.com/settings\nExpiredHawk · United Kingdom`;

function makeEmailHeaders(): Record<string, string> {
  return {
    "List-Unsubscribe": "<https://expiredhawk.com/settings>",
    "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    "X-Entity-Ref-ID": crypto.randomUUID(),
    "Precedence": "bulk",
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

      const text = `New Tools and Updates – ExpiredHawk\n\nHi there,\n\nWe have been busy building new tools to help you find better domains, faster.\n\nHere is what is new:\n\n- Domain Name Generator – Get AI-powered domain name ideas based on keywords, industry, and style preferences\n- Domain Valuation Estimator – Instantly estimate the market value of any domain based on length, TLD, age, and keyword strength\n- Pronounceability Scorer – Check how easy a domain is to say and remember, with detailed phonetic analysis\n- Bulk Pronounceability Checker – Score multiple domains at once and compare them side by side\n- TLD Comparison Tool – Compare pricing, popularity, and use cases across different TLDs\n\nWe have also improved spam risk detection on listed domains so you can avoid problematic picks.\n\nAll tools are free to use — head to expiredhawk.com/tools to try them out.\n\nAs always, if you have feedback or ideas, reply to this email or reach us at support@expiredhawk.com.\n\nHappy hunting,\n— The ExpiredHawk Team${FOOTER_TEXT}`;

      const announcementHtml = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;background-color:#f4f4f5;">
<div style="max-width:600px;margin:0 auto;padding:40px 20px;">
  <div style="background:linear-gradient(135deg,#22c55e 0%,#16a34a 100%);padding:40px 30px;border-radius:16px 16px 0 0;text-align:center;">
    <h1 style="color:white;margin:0;font-size:32px;">ExpiredHawk</h1>
    <p style="color:rgba(255,255,255,0.9);margin:8px 0 0 0;font-size:16px;">New Tools Inside</p>
  </div>
  
  <div style="background:white;padding:32px 30px;border-radius:0 0 16px 16px;box-shadow:0 4px 6px rgba(0,0,0,0.1);">
    <h2 style="color:#18181b;margin-top:0;font-size:22px;">New Tools and Updates</h2>
    
    <p style="color:#3f3f46;line-height:1.7;font-size:16px;">Hi there,</p>
    
    <p style="color:#3f3f46;line-height:1.7;font-size:16px;">
      We have been busy building new tools to help you find better domains, faster.
    </p>
    
    <h3 style="color:#18181b;font-size:18px;margin-top:24px;">Here is what is new:</h3>
    
    <div style="background:#f0fdf4;border-left:4px solid #22c55e;padding:16px 20px;border-radius:8px;margin:16px 0;">
      <p style="color:#3f3f46;margin:10px 0;font-size:15px;"><strong>Domain Name Generator</strong> — AI-powered domain name ideas based on your keywords, industry, and style</p>
      <p style="color:#3f3f46;margin:10px 0;font-size:15px;"><strong>Domain Valuation Estimator</strong> — Instantly estimate market value based on length, TLD, age, and keywords</p>
      <p style="color:#3f3f46;margin:10px 0;font-size:15px;"><strong>Pronounceability Scorer</strong> — Check how easy a domain is to say and remember</p>
      <p style="color:#3f3f46;margin:10px 0;font-size:15px;"><strong>Bulk Pronounceability Checker</strong> — Score multiple domains at once and compare side by side</p>
      <p style="color:#3f3f46;margin:10px 0;font-size:15px;"><strong>TLD Comparison Tool</strong> — Compare pricing, popularity, and use cases across TLDs</p>
    </div>
    
    <p style="color:#3f3f46;line-height:1.7;font-size:16px;">
      We have also improved <strong>spam risk detection</strong> on listed domains so you can avoid problematic picks.
    </p>
    
    <div style="text-align:center;margin:28px 0;">
      <a href="https://expiredhawk.com/tools" style="display:inline-block;background:linear-gradient(135deg,#22c55e,#16a34a);color:white;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:16px;">Try the New Tools</a>
    </div>
    
    <p style="color:#3f3f46;line-height:1.7;font-size:16px;">
      As always, if you have feedback or ideas, reply to this email or reach us at <a href="mailto:support@expiredhawk.com" style="color:#22c55e;font-weight:600;">support@expiredhawk.com</a>.
    </p>
    
    <p style="color:#3f3f46;line-height:1.7;font-size:16px;">Happy hunting,</p>
    <p style="color:#3f3f46;font-size:16px;margin-bottom:0;">— The ExpiredHawk Team</p>
  </div>
  
  ${FOOTER_HTML}
</div>
</body>
</html>`;

      try {
        console.log(`Sending announcement email to: ${user.email}`);

        const emailResponse: any = await resend.emails.send({
          from: "ExpiredHawk <notifications@expiredhawk.com>",
          replyTo: "support@expiredhawk.com",
          to: [user.email],
          subject: "New Tools to Help You Find Better Domains",
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
