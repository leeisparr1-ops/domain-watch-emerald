import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

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
  const msgId = `<${crypto.randomUUID()}@expiredhawk.com>`;
  return {
    "List-Unsubscribe": "<mailto:unsubscribe@expiredhawk.com?subject=unsubscribe>, <https://expiredhawk.com/settings>",
    "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    "X-Entity-Ref-ID": crypto.randomUUID(),
    "Message-ID": msgId,
    "Feedback-ID": "welcome:expiredhawk",
    "X-Mailer": "ExpiredHawk Notifications",
    "X-Priority": "3",
  };
}

function preheaderHtml(text: string): string {
  return `<div style="display:none;font-size:1px;color:#f4f4f5;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all;">${text}${"&nbsp;&zwnj;".repeat(30)}</div>`;
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

    const text = `Welcome to ExpiredHawk, ${firstName}\n\nYou have joined the smartest way to discover valuable expired domains before anyone else.\n\nGet Started in 3 Steps:\n1. Create your first search pattern - Keywords, TLDs, or regex\n2. Enable notifications - Email or push alerts\n3. Sit back - We will alert you when domains match\n\nYour free account includes 5 search patterns. Need more? Upgrade anytime.\n\nGo to Dashboard: https://expiredhawk.com/dashboard\n\nQuestions? Reply to this email or reach out at support@expiredhawk.com${FOOTER_TEXT}`;

    const html = `<!DOCTYPE html>
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
${preheaderHtml(`Welcome ${firstName} — set up your first search pattern and start finding valuable domains.`)}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f4f4f5;">
<tr><td align="center" style="padding:40px 10px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;">
  <tr><td style="background-color:#16a34a;padding:28px 30px;text-align:center;border-radius:8px 8px 0 0;">
    <h1 style="color:#ffffff;margin:0;font-size:26px;font-weight:bold;">ExpiredHawk</h1>
    <p style="color:#ffffff;margin:8px 0 0 0;font-size:14px;opacity:0.9;">Domain Monitoring Made Simple</p>
  </td></tr>
  <tr><td style="background-color:#ffffff;padding:32px 30px;border-radius:0 0 8px 8px;">
    <h2 style="color:#18181b;margin:0 0 16px 0;font-size:22px;">Hey ${firstName},</h2>
    <p style="color:#3f3f46;font-size:15px;line-height:1.6;">
      Welcome to ExpiredHawk. You have joined the smartest way to discover valuable expired domains before anyone else.
    </p>
    <p style="color:#18181b;font-size:15px;font-weight:bold;margin:20px 0 10px 0;">Get Started in 3 Steps:</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr><td style="padding:8px 0;color:#3f3f46;font-size:15px;">1. <strong>Create your first search pattern</strong> &ndash; Keywords, TLDs, or regex</td></tr>
      <tr><td style="padding:8px 0;color:#3f3f46;font-size:15px;">2. <strong>Enable notifications</strong> &ndash; Email or push alerts</td></tr>
      <tr><td style="padding:8px 0;color:#3f3f46;font-size:15px;">3. <strong>Sit back</strong> &ndash; We will alert you when domains match</td></tr>
    </table>
    <p style="color:#3f3f46;font-size:15px;line-height:1.6;margin:20px 0;">
      Your free account includes <strong>5 search patterns</strong>. Need more? Upgrade anytime to unlock unlimited patterns and premium features.
    </p>
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:24px 0;">
      <tr><td style="background-color:#16a34a;border-radius:6px;padding:12px 28px;">
        <a href="https://expiredhawk.com/dashboard" style="color:#ffffff;text-decoration:none;font-weight:bold;font-size:15px;display:inline-block;">Go to Dashboard</a>
      </td></tr>
    </table>
    <hr style="border:none;border-top:1px solid #e4e4e7;margin:24px 0;">
    <p style="color:#71717a;font-size:14px;line-height:1.6;margin:0;">
      Questions? Just reply to this email or reach out at <a href="mailto:support@expiredhawk.com" style="color:#16a34a;">support@expiredhawk.com</a>
    </p>
  </td></tr>
  ${FOOTER_HTML}
</table>
</td></tr>
</table>
</body>
</html>`;

    const emailResponse: any = await resend.emails.send({
      from: "ExpiredHawk <notifications@expiredhawk.com>",
      replyTo: "support@expiredhawk.com",
      to: [email],
      subject: "Welcome to ExpiredHawk",
      text,
      html,
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
