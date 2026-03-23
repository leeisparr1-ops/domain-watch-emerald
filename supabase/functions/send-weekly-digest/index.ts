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

  // Parse body early for test_email check
  let reqBody: any = {};
  try {
    reqBody = await req.json();
  } catch { /* no body */ }

  // Auth: require system secret (called from cron or test)
  const isTestMode = !!reqBody?.test_email;
  const systemSecret = req.headers.get("x-system-secret") || req.headers.get("Authorization")?.replace("Bearer ", "");
  const expectedSecret = Deno.env.get("SYNC_SECRET");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const isAuthed = expectedSecret && (systemSecret === expectedSecret || systemSecret === serviceRoleKey);
  if (!isAuthed) {
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

  const testEmail: string | null = reqBody?.test_email || null;

  try {
    // Get users with email notifications enabled
    const { data: users, error: usersError } = await supabase
      .from("user_settings")
      .select("user_id, notification_email")
      .eq("email_notifications_enabled", true);

    if (usersError) throw usersError;
    if (!testEmail && (!users || users.length === 0)) {
      return new Response(JSON.stringify({ message: "No users with email enabled", sent: 0 }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Fetch real trending market data (shared across all users)
    let trendingSection = "";
    let trendingText = "";
    try {
      const { data: trendData } = await supabase
        .from("trending_market_data")
        .select("hot_niches, market_signals, generated_at, trending_keywords")
        .eq("id", "latest")
        .maybeSingle();

      if (trendData && trendData.generated_at) {
        const ageMs = Date.now() - new Date(trendData.generated_at as string).getTime();
        const isFresh = ageMs < 7 * 24 * 60 * 60 * 1000; // <7 days old

        if (isFresh) {
          const niches = (trendData.hot_niches as any[]) || [];
          const signals = (trendData.market_signals as string[]) || [];
          // Only show top 5 niches with heat >= 40 (real signal, not noise)
          const topNiches = niches
            .filter((n: any) => n.heat >= 40 && n.label)
            .sort((a: any, b: any) => b.heat - a.heat)
            .slice(0, 5);

          if (topNiches.length >= 2) {
            const nicheRows = topNiches.map((n: any) => {
              const heatColor = n.heat >= 80 ? "#dc2626" : n.heat >= 60 ? "#ea580c" : "#ca8a04";
              const heatLabel = n.heat >= 80 ? "Hot" : n.heat >= 60 ? "Warm" : "Rising";
              const keywords = (n.emerging_keywords || []).slice(0, 3).join(", ");
              return `<tr>
                <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;color:#1f2937;font-size:14px;">${n.label}</td>
                <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:center;">
                  <span style="display:inline-block;padding:2px 8px;border-radius:10px;font-size:11px;font-weight:bold;color:#fff;background-color:${heatColor};">${heatLabel} ${n.heat}</span>
                </td>
                <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;color:#6b7280;font-size:12px;">${keywords || "-"}</td>
              </tr>`;
            }).join("");

            trendingSection = `
              <div style="margin:24px 0 0 0;">
                <h3 style="color:#18181b;margin:0 0 8px 0;font-size:17px;">Trending Niches Today</h3>
                <p style="color:#6b7280;font-size:13px;margin:0 0 12px 0;">AI-analyzed market trends based on real auction and search data.</p>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:6px;">
                  <tr style="background-color:#f9fafb;">
                    <th style="padding:8px 12px;text-align:left;font-size:12px;color:#6b7280;border-bottom:1px solid #e5e7eb;">Niche</th>
                    <th style="padding:8px 12px;text-align:center;font-size:12px;color:#6b7280;border-bottom:1px solid #e5e7eb;">Heat</th>
                    <th style="padding:8px 12px;text-align:left;font-size:12px;color:#6b7280;border-bottom:1px solid #e5e7eb;">Keywords</th>
                  </tr>
                  ${nicheRows}
                </table>
              </div>`;

            trendingText = `\n\nTrending Niches:\n${topNiches.map((n: any) => `- ${n.label} (Heat: ${n.heat}/100)${n.emerging_keywords?.length ? ` — ${n.emerging_keywords.slice(0, 3).join(", ")}` : ""}`).join("\n")}`;
          }

          // Trending keywords section
          const trendingKws = (trendData.trending_keywords as Record<string, any>) || {};
          const kwEntries = Object.entries(trendingKws)
            .filter(([_, v]: [string, any]) => v.heat > 1.2)
            .sort(([, a]: [string, any], [, b]: [string, any]) => b.heat - a.heat)
            .slice(0, 8);

          if (kwEntries.length >= 3) {
            const kwPills = kwEntries.map(([kw, data]: [string, any]) => {
              const bgColor = data.heat >= 2.0 ? "#fef2f2" : data.heat >= 1.6 ? "#fff7ed" : "#fefce8";
              const textColor = data.heat >= 2.0 ? "#dc2626" : data.heat >= 1.6 ? "#ea580c" : "#ca8a04";
              const heatLabel = data.heat >= 2.0 ? "Breakout" : data.heat >= 1.6 ? "Hot" : "Rising";
              return `<td style="padding:4px;">
                <div style="display:inline-block;padding:6px 12px;border-radius:20px;background-color:${bgColor};border:1px solid ${textColor}20;font-size:13px;">
                  <span style="color:#1f2937;font-weight:600;">${kw}</span>
                  <span style="color:${textColor};font-size:11px;margin-left:4px;">${heatLabel} ${data.heat.toFixed(1)}x</span>
                </div>
              </td>`;
            });

            // Wrap pills into rows of 2
            let kwRows = "";
            for (let i = 0; i < kwPills.length; i += 2) {
              kwRows += `<tr>${kwPills[i]}${kwPills[i + 1] || "<td></td>"}</tr>`;
            }

            trendingSection += `
              <div style="margin:20px 0 0 0;">
                <h3 style="color:#18181b;margin:0 0 8px 0;font-size:17px;">Trending Keywords</h3>
                <p style="color:#6b7280;font-size:13px;margin:0 0 12px 0;">Keywords with high heat scores from investor communities and search data.</p>
                <table role="presentation" cellpadding="0" cellspacing="0">${kwRows}</table>
              </div>`;

            trendingText += `\n\nTrending Keywords:\n${kwEntries.map(([kw, data]: [string, any]) => `- ${kw} (${data.heat.toFixed(1)}x heat)`).join("\n")}`;
          }

          // Top market signal as a tip
          if (signals.length > 0) {
            trendingSection += `
              <p style="margin:12px 0 0 0;padding:10px 14px;background-color:#f0fdf4;border-left:3px solid #16a34a;border-radius:4px;font-size:13px;color:#15803d;">
                <strong>Market Signal:</strong> ${signals[0]}
              </p>`;
            trendingText += `\n\nMarket Signal: ${signals[0]}`;
          }
        }
      }
    } catch (trendError) {
      console.warn("Could not fetch trending data for digest:", trendError);
      // Non-fatal — continue without trending section
    }

    // Test mode: send preview digest to test_email with sample data
    if (testEmail) {
      const sampleMatches = [
        { domain_name: "cloudstack.com", pattern_description: "Tech keywords", price: 125 },
        { domain_name: "petbuddy.net", pattern_description: "Pet niche", price: 45 },
        { domain_name: "greenleaf.org", pattern_description: "Eco brands", price: 88 },
      ];
      const totalCount = sampleMatches.length;
      const domainRows = sampleMatches.map((m) => `
        <tr>
          <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;font-family:monospace;color:#1f2937;font-size:14px;">${m.domain_name}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;color:#6b7280;font-size:13px;">${m.pattern_description}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;color:#16a34a;font-weight:bold;text-align:right;font-size:14px;">$${m.price}</td>
        </tr>
      `).join("");

      const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<style>body,table,td{font-family:Arial,Helvetica,sans-serif;}a{color:#16a34a;}</style></head>
<body style="margin:0;padding:0;background-color:#f4f4f5;">
<div style="display:none;font-size:1px;color:#f4f4f5;line-height:1px;max-height:0;opacity:0;overflow:hidden;">TEST DIGEST - Sample data${"&nbsp;&zwnj;".repeat(30)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;">
<tr><td align="center" style="padding:40px 10px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
  <tr><td style="background-color:#16a34a;padding:28px 30px;text-align:center;border-radius:8px 8px 0 0;">
    <h1 style="color:#fff;margin:0;font-size:26px;font-weight:bold;">ExpiredHawk</h1>
  </td></tr>
  <tr><td style="background-color:#fff;padding:32px 30px;border-radius:0 0 8px 8px;">
    <p style="background-color:#fef3c7;padding:8px 12px;border-radius:4px;font-size:12px;color:#92400e;margin:0 0 16px 0;"><strong>TEST EMAIL</strong> — This is a preview of the weekly digest template.</p>
    <h2 style="color:#18181b;margin:0 0 8px 0;font-size:22px;">Your Weekly Domain Digest</h2>
    <p style="color:#3f3f46;font-size:15px;line-height:1.6;">You have <strong>${totalCount}</strong> active pattern matches waiting for you.</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0;border:1px solid #e5e7eb;border-radius:6px;">
      <tr style="background-color:#f9fafb;">
        <th style="padding:10px 12px;text-align:left;font-size:13px;color:#6b7280;border-bottom:1px solid #e5e7eb;">Domain</th>
        <th style="padding:10px 12px;text-align:left;font-size:13px;color:#6b7280;border-bottom:1px solid #e5e7eb;">Pattern</th>
        <th style="padding:10px 12px;text-align:right;font-size:13px;color:#6b7280;border-bottom:1px solid #e5e7eb;">Price</th>
      </tr>
      ${domainRows}
    </table>
    ${trendingSection}
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:20px 0;">
      <tr><td style="background-color:#16a34a;border-radius:6px;padding:12px 28px;">
        <a href="https://expiredhawk.com/dashboard" style="color:#fff;text-decoration:none;font-weight:bold;font-size:15px;">View All Matches</a>
      </td></tr>
    </table>
  </td></tr>
  <tr><td style="padding:24px 20px;text-align:center;font-size:12px;color:#71717a;border-top:1px solid #e4e4e7;">
    <p style="margin:0 0 6px;">ExpiredHawk - Domain Monitoring Made Simple</p>
    <p style="margin:0 0 6px;"><a href="https://expiredhawk.com/settings" style="color:#71717a;text-decoration:underline;">Manage email preferences</a></p>
  </td></tr>
</table>
</td></tr>
</table>
</body></html>`;

      await resend.emails.send({
        from: "ExpiredHawk <notifications@expiredhawk.com>",
        replyTo: "support@expiredhawk.com",
        to: [testEmail],
        subject: "[TEST] Your Daily Domain Digest",
        html,
        text: `TEST DIGEST\n\nSample matches:\n${sampleMatches.map(m => `- ${m.domain_name} ($${m.price}) - ${m.pattern_description}`).join("\n")}\n${trendingText}\n\nView matches: https://expiredhawk.com/dashboard`,
        headers: {
          "X-Entity-Ref-ID": crypto.randomUUID(),
        },
      });

      return new Response(
        JSON.stringify({ success: true, test: true, sent_to: testEmail, has_trending: trendingSection.length > 0 }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log(`Processing daily digest for ${users!.length} users`);
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

        const isFresh = ageMs < 3 * 24 * 60 * 60 * 1000; // <3 days old

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
    ${trendingSection}
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

        const text = `Your Weekly Domain Digest\n\nYou have ${totalCount} active pattern match${totalCount !== 1 ? "es" : ""}.\n\n${rows.slice(0, 10).map((m: any) => `- ${m.domain_name} ($${Number(m.price).toLocaleString()}) - ${m.pattern_description || "Pattern"}`).join("\n")}\n${totalCount > 10 ? `\n...and ${totalCount - 10} more\n` : ""}${trendingText}\n\nView matches: https://expiredhawk.com/dashboard\n\n---\nExpiredHawk · United Kingdom`;

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
