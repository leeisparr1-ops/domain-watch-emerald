import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

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
    "Feedback-ID": "welcome:expiredhawk",
  };
}

function preheaderHtml(text: string): string {
  return `<div style="display:none;font-size:1px;color:#f4f4f5;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">${text}${"&nbsp;&zwnj;".repeat(30)}</div>`;
}

interface WelcomeEmailRequest {
  email: string;
  name?: string;
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, name }: WelcomeEmailRequest = await req.json();

    if (!email) {
      throw new Error("Email is required");
    }

    console.log(`Sending welcome email to: ${email}`);

    const firstName = name?.split(' ')[0] || 'there';

    const text = `Welcome to ExpiredHawk, ${firstName}\n\nYou have joined the smartest way to discover valuable expired domains before anyone else.\n\nGet Started in 3 Steps:\n1. Create your first search pattern – Keywords, TLDs, or regex\n2. Enable notifications – Email or push alerts\n3. Sit back – We will alert you when domains match\n\nYour free account includes 5 search patterns. Need more? Upgrade anytime.\n\nGo to Dashboard: https://expiredhawk.com/dashboard\n\nQuestions? Reply to this email or reach out at support@expiredhawk.com${FOOTER_TEXT}`;

    const emailResponse: any = await resend.emails.send({
      from: "ExpiredHawk <notifications@expiredhawk.com>",
      replyTo: "support@expiredhawk.com",
      to: [email],
      subject: "Welcome to ExpiredHawk",
      text,
      html: `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><meta name="x-apple-disable-message-reformatting"><meta name="format-detection" content="telephone=no,address=no,email=no,date=no"></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;background-color:#f4f4f5;">
  ${preheaderHtml(`Welcome ${firstName} — set up your first search pattern and start finding valuable domains.`)}
  <div style="max-width:600px;margin:0 auto;padding:40px 20px;">
    <div style="background:linear-gradient(135deg,#22c55e 0%,#16a34a 100%);padding:40px 30px;border-radius:16px 16px 0 0;text-align:center;">
      <h1 style="color:white;margin:0;font-size:32px;font-weight:bold;">ExpiredHawk</h1>
      <p style="color:rgba(255,255,255,0.9);margin:10px 0 0 0;font-size:16px;">Domain Monitoring Made Simple</p>
    </div>
    
    <div style="background:white;padding:40px 30px;border-radius:0 0 16px 16px;box-shadow:0 4px 6px rgba(0,0,0,0.1);">
      <h2 style="color:#18181b;margin:0 0 20px 0;font-size:24px;">Hey ${firstName},</h2>
      
      <p style="color:#3f3f46;font-size:16px;line-height:1.6;margin:0 0 20px 0;">
        Welcome to ExpiredHawk. You have joined the smartest way to discover valuable expired domains before anyone else.
      </p>
      
      <div style="background:#f0fdf4;border-left:4px solid #22c55e;padding:20px;border-radius:8px;margin:24px 0;">
        <h3 style="color:#166534;margin:0 0 12px 0;font-size:16px;">Get Started in 3 Steps:</h3>
        <ol style="color:#15803d;margin:0;padding-left:20px;line-height:1.8;">
          <li><strong>Create your first search pattern</strong> – Keywords, TLDs, or regex</li>
          <li><strong>Enable notifications</strong> – Email or push alerts</li>
          <li><strong>Sit back</strong> – We will alert you when domains match</li>
        </ol>
      </div>
      
      <p style="color:#3f3f46;font-size:16px;line-height:1.6;margin:20px 0;">
        Your free account includes <strong>5 search patterns</strong>. Need more? Upgrade anytime to unlock unlimited patterns and premium features.
      </p>
      
      <div style="text-align:center;margin:32px 0;">
        <a href="https://expiredhawk.com/dashboard" style="display:inline-block;background:linear-gradient(135deg,#22c55e 0%,#16a34a 100%);color:white;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:16px;">
          Go to Dashboard
        </a>
      </div>
      
      <hr style="border:none;border-top:1px solid #e4e4e7;margin:32px 0;">
      
      <p style="color:#71717a;font-size:14px;line-height:1.6;margin:0;">
        Questions? Just reply to this email or reach out at <a href="mailto:support@expiredhawk.com" style="color:#22c55e;">support@expiredhawk.com</a>
      </p>
    </div>
    
    ${FOOTER_HTML}
  </div>
</body>
</html>`,
      headers: makeEmailHeaders(),
    });

    if (emailResponse?.error) {
      console.error("Resend returned an error:", emailResponse.error);
      throw new Error(emailResponse.error?.message || "Email provider error");
    }

    console.log("Welcome email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, id: emailResponse.data?.id }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error sending welcome email:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
