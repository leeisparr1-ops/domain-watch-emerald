import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { domain } = await req.json();
    if (!domain || typeof domain !== "string" || domain.length > 253) {
      return new Response(JSON.stringify({ error: "Invalid domain" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const login = Deno.env.get("DATAFORSEO_LOGIN");
    const password = Deno.env.get("DATAFORSEO_PASSWORD");
    if (!login || !password) {
      return new Response(JSON.stringify({ error: "DataForSEO credentials not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const cred = btoa(`${login}:${password}`);
    const response = await fetch("https://api.dataforseo.com/v3/backlinks/summary/live", {
      method: "POST",
      headers: {
        Authorization: `Basic ${cred}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify([
        {
          target: domain,
          include_subdomains: true,
          internal_list_limit: 0,
          backlinks_filters: ["dofollow", "=", true],
        },
      ]),
    });

    const data = await response.json();

    if (!response.ok || data?.status_code !== 20000) {
      console.error("DataForSEO error:", JSON.stringify(data));
      return new Response(JSON.stringify({ error: "Failed to fetch backlink data" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const result = data?.tasks?.[0]?.result?.[0];
    if (!result) {
      return new Response(
        JSON.stringify({
          rank: 0,
          backlinks: 0,
          referring_domains: 0,
          dofollow: 0,
          nofollow: 0,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        rank: result.rank ?? 0,
        backlinks: result.backlinks ?? 0,
        referring_domains: result.referring_domains ?? 0,
        dofollow: result.referring_links_types?.anchor ?? result.backlinks ?? 0,
        nofollow: result.backlinks_nofollow ?? 0,
        referring_ips: result.referring_ips ?? 0,
        broken_backlinks: result.broken_backlinks ?? 0,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("fetch-backlink-summary error:", err);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
