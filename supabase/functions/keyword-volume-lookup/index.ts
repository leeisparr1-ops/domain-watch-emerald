import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    const { keywords } = await req.json();
    if (!keywords || !Array.isArray(keywords) || keywords.length === 0) {
      return new Response(JSON.stringify({ error: "keywords array required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Limit to 100 keywords per request
    const cleanKeywords = keywords
      .map((k: string) => k.toLowerCase().trim())
      .filter((k: string) => k.length >= 2)
      .slice(0, 100);

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Check cache first
    const { data: cached } = await supabaseAdmin
      .from("keyword_volume_cache")
      .select("*")
      .in("keyword", cleanKeywords)
      .gt("expires_at", new Date().toISOString());

    const cachedMap: Record<string, any> = {};
    for (const row of cached || []) {
      cachedMap[row.keyword] = {
        volume: row.search_volume,
        cpc: row.cpc ? parseFloat(row.cpc) : null,
        competition: row.competition ? parseFloat(row.competition) : null,
        competition_level: row.competition_level,
        trend: row.trend_direction,
        monthly_searches: row.monthly_searches,
        source: "dataforseo_cached",
      };
    }

    // Find missing keywords
    const missing = cleanKeywords.filter((k: string) => !cachedMap[k]);

    if (missing.length > 0) {
      const login = Deno.env.get("DATAFORSEO_LOGIN");
      const password = Deno.env.get("DATAFORSEO_PASSWORD");

      if (!login || !password) {
        console.warn("DataForSEO credentials not configured, returning cache only");
      } else {
        // Fetch from DataForSEO Keywords Data API
        const authHeader = btoa(`${login}:${password}`);

        const payload = [
          {
            keywords: missing,
            language_code: "en",
            location_code: 2840, // United States
            date_from: getDateMonthsAgo(3),
            include_serp_info: false,
            include_clickstream_data: false,
          },
        ];

        const response = await fetch(
          "https://api.dataforseo.com/v3/keywords_data/google_ads/search_volume/live",
          {
            method: "POST",
            headers: {
              Authorization: `Basic ${authHeader}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
          }
        );

        if (!response.ok) {
          const errText = await response.text();
          console.error(`DataForSEO API error [${response.status}]: ${errText}`);
        } else {
          const data = await response.json();
          const results = data?.tasks?.[0]?.result || [];

          const upsertRows: any[] = [];

          for (const item of results) {
            if (!item?.keyword) continue;

            const keyword = item.keyword.toLowerCase();
            const volume = item.search_volume ?? 0;
            const cpc = item.cpc ?? null;
            // competition can be numeric (0-1) or string — normalize
            const rawComp = item.competition;
            const competition = typeof rawComp === "number" ? rawComp : null;
            const competitionLevel = item.competition_level ?? (typeof rawComp === "string" ? rawComp : null);

            // Determine trend from monthly searches
            const monthlySearches = item.monthly_searches || [];
            const trend = determineTrend(monthlySearches);

            cachedMap[keyword] = {
              volume,
              cpc,
              competition,
              competition_level: competitionLevel,
              trend,
              monthly_searches: monthlySearches,
              source: "dataforseo_live",
            };

            upsertRows.push({
              keyword,
              search_volume: volume,
              cpc,
              competition,
              competition_level: competitionLevel,
              trend_direction: trend,
              monthly_searches: monthlySearches,
              data_source: "dataforseo",
              fetched_at: new Date().toISOString(),
              expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            });
          }

          // Upsert into cache
          if (upsertRows.length > 0) {
            const { error: upsertErr } = await supabaseAdmin
              .from("keyword_volume_cache")
              .upsert(upsertRows, { onConflict: "keyword" });

            if (upsertErr) {
              console.error("Cache upsert error:", upsertErr);
            }
          }
        }
      }
    }

    // Build response for all requested keywords
    const result: Record<string, any> = {};
    for (const k of cleanKeywords) {
      result[k] = cachedMap[k] || {
        volume: 0,
        cpc: null,
        competition: null,
        competition_level: null,
        trend: null,
        monthly_searches: [],
        source: "not_found",
      };
    }

    return new Response(JSON.stringify({ keywords: result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("keyword-volume-lookup error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function getDateMonthsAgo(months: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() - months);
  return d.toISOString().slice(0, 10);
}

function determineTrend(monthlySearches: any[]): "rising" | "falling" | "stable" {
  if (!monthlySearches || monthlySearches.length < 3) return "stable";

  const sorted = [...monthlySearches].sort((a, b) => {
    const da = new Date(`${a.year}-${String(a.month).padStart(2, "0")}-01`);
    const db = new Date(`${b.year}-${String(b.month).padStart(2, "0")}-01`);
    return da.getTime() - db.getTime();
  });

  const recent3 = sorted.slice(-3).map((m) => m.search_volume || 0);
  const older3 = sorted.slice(0, 3).map((m) => m.search_volume || 0);

  const recentAvg = recent3.reduce((a: number, b: number) => a + b, 0) / recent3.length;
  const olderAvg = older3.reduce((a: number, b: number) => a + b, 0) / older3.length;

  if (olderAvg === 0) return "stable";
  const change = (recentAvg - olderAvg) / olderAvg;

  if (change > 0.15) return "rising";
  if (change < -0.15) return "falling";
  return "stable";
}
