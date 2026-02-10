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

    console.log("Fetching all users to send welcome emails...");

    const { data: usersData, error: usersError } = await supabase.auth.admin.listUsers();

    if (usersError) {
      throw new Error(`Failed to fetch users: ${usersError.message}`);
    }

    const users = usersData?.users || [];
    console.log(`Found ${users.length} users to send welcome emails to`);

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

      const text = `Welcome to ExpiredHawk\n\nThank you for joining. You have joined the smartest way to discover and monitor expired domain auctions.\n\nGet Started in 3 Steps:\n1. Create patterns – Set up keyword patterns to match domains you are interested in\n2. Enable notifications – Get instant alerts when matching domains appear\n3. Discover opportunities – Browse the latest auctions and find your perfect domain\n\nOur system automatically syncs with major domain auction platforms, so you will never miss an opportunity again.\n\nGo to your dashboard: https://expiredhawk.com/dashboard\n\nQuestions? Email us at support@expiredhawk.com${FOOTER_TEXT}`;

      const welcomeHtml = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;background-color:#f4f4f5;">
<div style="max-width:600px;margin:0 auto;padding:40px 20px;">
  <div style="background:linear-gradient(135deg,#22c55e 0%,#16a34a 100%);padding:40px 30px;border-radius:16px 16px 0 0;text-align:center;">
    <h1 style="color:white;margin:0;font-size:32px;">ExpiredHawk</h1>
    <p style="color:rgba(255,255,255,0.95);margin:15px 0 0 0;font-size:18px;">Welcome aboard</p>
  </div>
  
  <div style="background:white;padding:32px 30px;border-radius:0 0 16px 16px;box-shadow:0 4px 6px rgba(0,0,0,0.1);">
    <h2 style="color:#18181b;margin-top:0;font-size:24px;">Thank You for Joining ExpiredHawk</h2>
    
    <p style="color:#3f3f46;line-height:1.7;font-size:16px;">
      We are glad to have you as part of the ExpiredHawk community. You have joined the smartest way to discover and monitor expired domain auctions.
    </p>
    
    <div style="background:#f0fdf4;border-left:4px solid #22c55e;padding:20px;border-radius:8px;margin:24px 0;">
      <h3 style="color:#166534;margin-top:0;font-size:18px;">Get Started in 3 Steps:</h3>
      <ol style="color:#15803d;line-height:2;padding-left:20px;margin-bottom:0;">
        <li><strong>Create patterns</strong> – Set up keyword patterns to match domains you are interested in</li>
        <li><strong>Enable notifications</strong> – Get instant alerts when matching domains appear</li>
        <li><strong>Discover opportunities</strong> – Browse the latest auctions and find your perfect domain</li>
      </ol>
    </div>
    
    <p style="color:#3f3f46;line-height:1.7;font-size:16px;">
      Our system automatically syncs with major domain auction platforms, so you will never miss an opportunity again.
    </p>
    
    <div style="text-align:center;margin-top:30px;">
      <a href="https://expiredhawk.com/dashboard" style="display:inline-block;background:linear-gradient(135deg,#22c55e 0%,#16a34a 100%);color:white;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:16px;">
        Go to Your Dashboard
      </a>
    </div>
  </div>
  
  <div style="text-align:center;margin-top:24px;padding:20px;">
    <p style="color:#71717a;font-size:14px;margin-bottom:8px;">
      Questions? We are here to help.
    </p>
    <a href="mailto:support@expiredhawk.com" style="color:#22c55e;text-decoration:none;font-weight:500;">support@expiredhawk.com</a>
  </div>
  
  ${FOOTER_HTML}
</div>
</body>
</html>`;

      try {
        console.log(`Sending welcome email to: ${user.email}`);

        const emailResponse: any = await resend.emails.send({
          from: "ExpiredHawk <notifications@expiredhawk.com>",
          replyTo: "support@expiredhawk.com",
          to: [user.email],
          subject: "Welcome to ExpiredHawk – Thank You for Joining",
          html: welcomeHtml,
          text,
          headers: makeEmailHeaders(),
        });

        if (emailResponse?.error) {
          console.error(`Failed to send to ${user.email}:`, emailResponse.error);
          results.push({ email: user.email, success: false, error: emailResponse.error?.message });
          failCount++;
        } else {
          console.log(`Welcome email sent to ${user.email}`);
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

    console.log(`Welcome emails complete. Success: ${successCount}, Failed: ${failCount}`);

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
    console.error("Error in send-welcome-emails:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
