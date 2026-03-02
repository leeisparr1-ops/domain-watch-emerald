import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-system-secret",
};

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Auth: require system secret (called from cron)
  const systemSecret = req.headers.get("x-system-secret") || req.headers.get("Authorization")?.replace("Bearer ", "");
  const expectedSecret = Deno.env.get("SYNC_SECRET");
  if (!expectedSecret || systemSecret !== expectedSecret) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  if (!resendApiKey) {
    return new Response(JSON.stringify({ error: "RESEND_API_KEY not configured" }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const resend = new Resend(resendApiKey);

  try {
    // Get users with email notifications enabled
    const { data: users, error: usersError } = await supabase
      .from("user_settings")
      .select("user_id, notification_email")
      .eq("email_notifications_enabled", true);

    if (usersError) throw usersError;
    if (!users || users.length === 0) {
      return new Response(JSON.stringify({ message: "No users with email enabled", sent: 0 }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    console.log(`Processing weekly digest for ${users.length} users`);
    let sentCount = 0;

    for (const userSetting of users) {
      try {
        // Get top matches from the last 7 days
        const { data: matches, error: matchesError } = await supabase.rpc("get_pattern_matches", {
          p_user_id: userSetting.user_id,
          p_hide_ended: true,
          p_offset: 0,
          p_limit: 10,
        });

        if (matchesError) {
          console.error(`Error fetching matches for ${userSetting.user_id}:`, matchesError);
          continue;
        }

        const rows = (matches || []) as any[];
        const totalCount = rows.length > 0 ? Number(rows[0].total_count) : 0;

        if (totalCount === 0) continue;

        // Get email
        let email = userSetting.notification_email;
        if (!email) {
          const { data: authUser } = await supabase.auth.admin.getUserById(userSetting.user_id);
          email = authUser?.user?.email;
        }
        if (!email) continue;

        // Build email
        const domainRows = rows.slice(0, 10).map((m: any) => `
          <tr>
            <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;font-family:monospace;color:#1f2937;font-size:14px;">${m.domain_name}</td>
            <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;color:#6b7280;font-size:13px;">${m.pattern_description || "Pattern"}</td>
            <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;color:#16a34a;font-weight:bold;text-align:right;font-size:14px;">$${Number(m.price).toLocaleString()}</td>
          </tr>
        `).join("");

        const preheader = rows.slice(0, 3).map((m: any) => m.domain_name).join(", ");

        const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<style>body,table,td{font-family:Arial,Helvetica,sans-serif;}a{color:#16a34a;}</style></head>
<body style="margin:0;padding:0;background-color:#f4f4f5;">
<div style="display:none;font-size:1px;color:#f4f4f5;line-height:1px;max-height:0;opacity:0;overflow:hidden;">${preheader}${"&nbsp;&zwnj;".repeat(30)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;">
<tr><td align="center" style="padding:40px 10px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
  <tr><td style="background-color:#16a34a;padding:28px 30px;text-align:center;border-radius:8px 8px 0 0;">
    <h1 style="color:#fff;margin:0;font-size:26px;font-weight:bold;">ExpiredHawk</h1>
  </td></tr>
  <tr><td style="background-color:#fff;padding:32px 30px;border-radius:0 0 8px 8px;">
    <h2 style="color:#18181b;margin:0 0 8px 0;font-size:22px;">Your Weekly Domain Digest</h2>
    <p style="color:#3f3f46;font-size:15px;line-height:1.6;">You have <strong>${totalCount}</strong> active pattern match${totalCount !== 1 ? "es" : ""} waiting for you.</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0;border:1px solid #e5e7eb;border-radius:6px;">
      <tr style="background-color:#f9fafb;">
        <th style="padding:10px 12px;text-align:left;font-size:13px;color:#6b7280;border-bottom:1px solid #e5e7eb;">Domain</th>
        <th style="padding:10px 12px;text-align:left;font-size:13px;color:#6b7280;border-bottom:1px solid #e5e7eb;">Pattern</th>
        <th style="padding:10px 12px;text-align:right;font-size:13px;color:#6b7280;border-bottom:1px solid #e5e7eb;">Price</th>
      </tr>
      ${domainRows}
    </table>
    ${totalCount > 10 ? `<p style="color:#71717a;font-size:14px;font-style:italic;">...and ${totalCount - 10} more matches</p>` : ""}
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:20px 0;">
      <tr><td style="background-color:#16a34a;border-radius:6px;padding:12px 28px;">
        <a href="https://expiredhawk.com/dashboard" style="color:#fff;text-decoration:none;font-weight:bold;font-size:15px;">View All Matches</a>
      </td></tr>
    </table>
  </td></tr>
  <tr><td style="padding:24px 20px;text-align:center;font-size:12px;color:#71717a;border-top:1px solid #e4e4e7;">
    <p style="margin:0 0 6px;">ExpiredHawk – Domain Monitoring Made Simple</p>
    <p style="margin:0 0 6px;"><a href="https://expiredhawk.com/settings" style="color:#71717a;text-decoration:underline;">Manage email preferences</a></p>
  </td></tr>
</table>
</td></tr>
</table>
</body></html>`;

        const text = `Your Weekly Domain Digest\n\nYou have ${totalCount} active pattern match${totalCount !== 1 ? "es" : ""}.\n\n${rows.slice(0, 10).map((m: any) => `- ${m.domain_name} ($${Number(m.price).toLocaleString()}) - ${m.pattern_description || "Pattern"}`).join("\n")}\n${totalCount > 10 ? `\n...and ${totalCount - 10} more\n` : ""}\nView matches: https://expiredhawk.com/dashboard\n\n---\nExpiredHawk · United Kingdom`;

        await resend.emails.send({
          from: "ExpiredHawk <notifications@expiredhawk.com>",
          replyTo: "support@expiredhawk.com",
          to: [email],
          subject: `${totalCount} domain${totalCount !== 1 ? "s" : ""} matching your patterns this week`,
          html,
          text,
          headers: {
            "List-Unsubscribe": "<mailto:unsubscribe@expiredhawk.com?subject=unsubscribe>, <https://expiredhawk.com/settings>",
            "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
            "X-Entity-Ref-ID": crypto.randomUUID(),
            "Precedence": "bulk",
            "Feedback-ID": "weekly_digest:expiredhawk",
          },
        });

        sentCount++;
        console.log(`Sent weekly digest to ${email} (${totalCount} matches)`);
      } catch (userError) {
        console.error(`Error processing user ${userSetting.user_id}:`, userError);
      }
    }

    return new Response(
      JSON.stringify({ success: true, processed: users.length, sent: sentCount }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Weekly digest error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
