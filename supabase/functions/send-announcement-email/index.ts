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
    "Feedback-ID": "announcement:expiredhawk",
  };
}

function preheaderHtml(text: string): string {
  return `<div style="display:none;font-size:1px;color:#f4f4f5;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">${text}${"&nbsp;&zwnj;".repeat(30)}</div>`;
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

      const text = `ExpiredHawk Update — AI Domain Advisor & More\n\nHi there,\n\nWe've been working hard on some big upgrades, and here's what's new:\n\nAI Domain Advisor (Our Biggest Update)\nOur new flagship tool gives you deep-dive analysis on any domain — Market Positioning, SEO & Marketing potential, Risk Assessment, and a Flip Score so you can instantly gauge investment potential. It even has a chat interface so you can ask follow-up questions about any domain.\n\nOther Tool Improvements\n- Name Generator — Now links directly to GoDaddy so you can register available domains in one click\n- Brandability Scorer — Radar chart visualization showing exactly where a domain excels\n- Bulk Pronounceability Checker — Score and compare multiple domains side by side\n\nNotifications — Work in Progress\nWe're still actively improving our email and push notification system to make alerts faster and more reliable. Stay tuned for updates here.\n\nAll tools are free to use — head to expiredhawk.com/tools to try them out.\n\nAs always, if you have feedback or ideas, reply to this email or reach us at support@expiredhawk.com.\n\nHappy hunting,\n— The ExpiredHawk Team${FOOTER_TEXT}`;

      const announcementHtml = `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><meta name="x-apple-disable-message-reformatting"><meta name="format-detection" content="telephone=no,address=no,email=no,date=no"></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;background-color:#f4f4f5;">
${preheaderHtml("Your new AI-powered co-pilot for domain analysis is here.")}
<div style="max-width:600px;margin:0 auto;padding:40px 20px;">
  <div style="background:linear-gradient(135deg,#22c55e 0%,#16a34a 100%);padding:40px 30px;border-radius:16px 16px 0 0;text-align:center;">
    <h1 style="color:white;margin:0;font-size:32px;">ExpiredHawk</h1>
    <p style="color:rgba(255,255,255,0.9);margin:8px 0 0 0;font-size:16px;">AI Domain Advisor & More</p>
  </div>
  
  <div style="background:white;padding:32px 30px;border-radius:0 0 16px 16px;box-shadow:0 4px 6px rgba(0,0,0,0.1);">
    <p style="color:#3f3f46;line-height:1.7;font-size:16px;">Hi there,</p>
    
    <p style="color:#3f3f46;line-height:1.7;font-size:16px;">
      We've been working hard on some big upgrades, and here's what's new:
    </p>
    
    <h3 style="color:#18181b;font-size:18px;margin-top:24px;">&#129302; AI Domain Advisor (Our Biggest Update)</h3>
    <p style="color:#3f3f46;line-height:1.7;font-size:16px;">
      Our new flagship tool gives you deep-dive analysis on any domain — Market Positioning, SEO & Marketing potential, Risk Assessment, and a <strong>Flip Score</strong> so you can instantly gauge investment potential. It even has a <strong>chat interface</strong> so you can ask follow-up questions about any domain.
    </p>
    
    <h3 style="color:#18181b;font-size:18px;margin-top:24px;">&#128295; Other Tool Improvements</h3>
    <div style="background:#f0fdf4;border-left:4px solid #22c55e;padding:16px 20px;border-radius:8px;margin:16px 0;">
      <p style="color:#3f3f46;margin:10px 0;font-size:15px;"><strong>Name Generator</strong> — Now links directly to GoDaddy so you can register available domains in one click</p>
      <p style="color:#3f3f46;margin:10px 0;font-size:15px;"><strong>Brandability Scorer</strong> — Radar chart visualization showing exactly where a domain excels</p>
      <p style="color:#3f3f46;margin:10px 0;font-size:15px;"><strong>Bulk Pronounceability Checker</strong> — Score and compare multiple domains side by side</p>
    </div>
    
    <h3 style="color:#18181b;font-size:18px;margin-top:24px;">&#128276; Notifications — Work in Progress</h3>
    <p style="color:#3f3f46;line-height:1.7;font-size:16px;">
      We're still actively improving our email and push notification system to make alerts faster and more reliable. Stay tuned for updates here.
    </p>
    
    <div style="text-align:center;margin:28px 0;">
      <a href="https://expiredhawk.com/tools" style="display:inline-block;background:linear-gradient(135deg,#22c55e,#16a34a);color:white;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:16px;">Try the AI Domain Advisor</a>
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
          subject: "ExpiredHawk Update — AI Domain Advisor & More",
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
