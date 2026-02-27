import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import Stripe from "https://esm.sh/stripe@18.5.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth: require SYNC_SECRET for cron calls
    const authHeader = req.headers.get("Authorization");
    const syncSecret = Deno.env.get("SYNC_SECRET");
    if (!authHeader || authHeader !== `Bearer ${syncSecret}`) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // ── Gather stats ──

    // 1. Total registered users
    const { data: usersData } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
    const allUsers = usersData?.users ?? [];
    const totalUsers = allUsers.length;

    // Users signed up in last 7 days
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const newUsers = allUsers.filter(u => new Date(u.created_at) >= oneWeekAgo);

    // 2. Active Stripe subscriptions
    const activeSubs = await stripe.subscriptions.list({ status: "active", limit: 100 });
    const basicProductId = "prod_Tq9uBfPZRydPoT";
    const advancedProductId = "prod_Tq9u0B65mJOkIU";

    let basicCount = 0;
    let advancedCount = 0;
    const subscriberDetails: { email: string; plan: string; ends: string }[] = [];

    for (const sub of activeSubs.data) {
      const productId = sub.items.data[0]?.price?.product;
      const plan = productId === advancedProductId ? "Advanced" : productId === basicProductId ? "Basic" : "Unknown";
      if (plan === "Basic") basicCount++;
      if (plan === "Advanced") advancedCount++;

      // Get customer email
      const customer = await stripe.customers.retrieve(sub.customer as string);
      const email = (customer as any).email || "unknown";
      const ends = new Date(sub.current_period_end * 1000).toISOString().split("T")[0];
      subscriberDetails.push({ email, plan, ends });
    }

    // 3. Total patterns & favorites
    const { count: patternCount } = await supabaseAdmin
      .from("user_patterns").select("*", { count: "exact", head: true });
    const { count: favoriteCount } = await supabaseAdmin
      .from("favorites").select("*", { count: "exact", head: true });

    // 4. Total auctions
    const { count: auctionCount } = await supabaseAdmin
      .from("auctions").select("*", { count: "exact", head: true });

    // 5. Portfolio domains
    const { count: portfolioCount } = await supabaseAdmin
      .from("portfolio_domains").select("*", { count: "exact", head: true });

    // ── Build email ──
    const now = new Date().toISOString().split("T")[0];
    const weekAgoStr = oneWeekAgo.toISOString().split("T")[0];

    const subscriberRows = subscriberDetails.length > 0
      ? subscriberDetails.map(s =>
          `<tr><td style="padding:6px 12px;border-bottom:1px solid #eee">${s.email}</td><td style="padding:6px 12px;border-bottom:1px solid #eee">${s.plan}</td><td style="padding:6px 12px;border-bottom:1px solid #eee">${s.ends}</td></tr>`
        ).join("")
      : `<tr><td colspan="3" style="padding:12px;text-align:center;color:#888">No active subscribers</td></tr>`;

    const newUserRows = newUsers.length > 0
      ? newUsers.map(u =>
          `<tr><td style="padding:6px 12px;border-bottom:1px solid #eee">${u.email || "no email"}</td><td style="padding:6px 12px;border-bottom:1px solid #eee">${new Date(u.created_at).toISOString().split("T")[0]}</td></tr>`
        ).join("")
      : `<tr><td colspan="2" style="padding:12px;text-align:center;color:#888">No new sign-ups this week</td></tr>`;

    const mrr = (basicCount * 4.99 + advancedCount * 9.99).toFixed(2);

    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:Arial,sans-serif;background:#ffffff;padding:20px;color:#333">
  <div style="max-width:600px;margin:0 auto">
    <h1 style="color:#1a1a2e;border-bottom:3px solid #e94560;padding-bottom:12px">
      🦅 Expired Hawk — Weekly Report
    </h1>
    <p style="color:#666;font-size:14px">Report for ${weekAgoStr} → ${now}</p>

    <div style="background:#f8f9fa;border-radius:8px;padding:20px;margin:20px 0">
      <h2 style="margin-top:0;color:#1a1a2e;font-size:18px">📊 Overview</h2>
      <table style="width:100%;border-collapse:collapse">
        <tr><td style="padding:8px 0;font-weight:bold">Total Users</td><td style="text-align:right;font-size:20px;color:#e94560">${totalUsers}</td></tr>
        <tr><td style="padding:8px 0;font-weight:bold">New Sign-ups (7d)</td><td style="text-align:right;font-size:20px;color:#e94560">${newUsers.length}</td></tr>
        <tr><td style="padding:8px 0;font-weight:bold">Paid Subscribers</td><td style="text-align:right;font-size:20px;color:#e94560">${activeSubs.data.length}</td></tr>
        <tr><td style="padding:8px 0;font-weight:bold">MRR</td><td style="text-align:right;font-size:20px;color:#27ae60">$${mrr}</td></tr>
        <tr><td style="padding:8px 0;font-weight:bold">Active Auctions</td><td style="text-align:right;font-size:20px">${auctionCount ?? 0}</td></tr>
        <tr><td style="padding:8px 0;font-weight:bold">Total Patterns</td><td style="text-align:right;font-size:20px">${patternCount ?? 0}</td></tr>
        <tr><td style="padding:8px 0;font-weight:bold">Total Favorites</td><td style="text-align:right;font-size:20px">${favoriteCount ?? 0}</td></tr>
        <tr><td style="padding:8px 0;font-weight:bold">Portfolio Domains</td><td style="text-align:right;font-size:20px">${portfolioCount ?? 0}</td></tr>
      </table>
    </div>

    <div style="background:#f8f9fa;border-radius:8px;padding:20px;margin:20px 0">
      <h2 style="margin-top:0;color:#1a1a2e;font-size:18px">💳 Subscriber Breakdown</h2>
      <p style="margin:4px 0 12px;color:#666;font-size:13px">Basic: ${basicCount} · Advanced: ${advancedCount}</p>
      <table style="width:100%;border-collapse:collapse;font-size:14px">
        <thead><tr style="background:#e94560;color:white">
          <th style="padding:8px 12px;text-align:left">Email</th>
          <th style="padding:8px 12px;text-align:left">Plan</th>
          <th style="padding:8px 12px;text-align:left">Renews</th>
        </tr></thead>
        <tbody>${subscriberRows}</tbody>
      </table>
    </div>

    <div style="background:#f8f9fa;border-radius:8px;padding:20px;margin:20px 0">
      <h2 style="margin-top:0;color:#1a1a2e;font-size:18px">🆕 New Sign-ups This Week</h2>
      <table style="width:100%;border-collapse:collapse;font-size:14px">
        <thead><tr style="background:#1a1a2e;color:white">
          <th style="padding:8px 12px;text-align:left">Email</th>
          <th style="padding:8px 12px;text-align:left">Signed Up</th>
        </tr></thead>
        <tbody>${newUserRows}</tbody>
      </table>
    </div>

    <p style="text-align:center;color:#999;font-size:12px;margin-top:30px">
      Automated report from Expired Hawk · ${now}
    </p>
  </div>
</body>
</html>`;

    // ── Send via Resend ──
    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) throw new Error("RESEND_API_KEY not configured");

    const emailRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${resendKey}`,
      },
      body: JSON.stringify({
        from: "Expired Hawk <reports@expiredhawk.com>",
        to: ["support@expiredhawk.com"],
        subject: `Weekly Report — ${now} | ${totalUsers} users, $${mrr} MRR`,
        html,
      }),
    });

    const emailResult = await emailRes.json();
    console.log("[WEEKLY-REPORT] Email sent:", JSON.stringify(emailResult));

    return new Response(JSON.stringify({ success: true, stats: { totalUsers, newUsers: newUsers.length, subscribers: activeSubs.data.length, mrr } }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[WEEKLY-REPORT] Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
