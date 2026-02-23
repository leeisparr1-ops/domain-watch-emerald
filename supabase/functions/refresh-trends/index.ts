import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const systemPrompt = `You are a domain aftermarket intelligence analyst with access to current search trend data (similar to Google Trends). Your job is to identify the CURRENT trending keywords, hot niches, and market signals in the domain name investment space.

Focus on:
1. Keywords that are driving high aftermarket sales RIGHT NOW
2. Emerging industry niches with growing demand  
3. New technology/business terms entering mainstream vocabulary
4. Seasonal or event-driven keyword spikes
5. Search volume momentum — keywords with RISING search interest (like Google Trends "Breakout" or "+250%")
6. Cross-reference domain sales data with search interest to identify undervalued keyword segments

Return data that a domain investment scoring engine can use to weight keyword demand. Weight keywords higher when both search volume AND domain sales are rising together.`;

    const userPrompt = `Generate a comprehensive trend report for the domain aftermarket as of February 2026.

Return structured data with:
1. trending_keywords: Object mapping keyword → heat multiplier (1.0 = baseline, 2.5 = maximum heat). Include 80-120 keywords across all major niches. Focus on NEW or ACCELERATING terms, not evergreen ones. Factor in:
   - Google Trends-style search volume momentum (breakout terms get 2.0+)
   - Domain aftermarket sale frequency and average prices
   - Venture capital / startup funding trends driving keyword demand
   - Social media buzz and news cycle momentum
2. hot_niches: Array of { niche, label, heat (1-100), emerging_keywords[], declining_keywords[] }. Heat should reflect BOTH search interest growth AND domain sale activity.
3. market_signals: Array of short strings describing key market movements (e.g. ".ai domains averaging $45k in Q1 2026", "search interest for 'agentic' up 340% YoY")

Be specific and data-driven. Reference real market patterns. Include search volume trend indicators where relevant.`;

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "return_trend_report",
                description: "Return structured domain market trend data",
                parameters: {
                  type: "object",
                  properties: {
                    trending_keywords: {
                      type: "object",
                      description: "Map of keyword → heat multiplier (1.0-2.5)",
                      additionalProperties: { type: "number" },
                    },
                    hot_niches: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          niche: { type: "string" },
                          label: { type: "string" },
                          heat: { type: "number", description: "1-100" },
                          emerging_keywords: { type: "array", items: { type: "string" } },
                          declining_keywords: { type: "array", items: { type: "string" } },
                        },
                        required: ["niche", "label", "heat", "emerging_keywords"],
                        additionalProperties: false,
                      },
                    },
                    market_signals: {
                      type: "array",
                      items: { type: "string" },
                    },
                  },
                  required: ["trending_keywords", "hot_niches", "market_signals"],
                  additionalProperties: false,
                },
              },
            },
          ],
          tool_choice: {
            type: "function",
            function: { name: "return_trend_report" },
          },
        }),
      }
    );

    if (!response.ok) {
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];

    let trendData;
    if (toolCall) {
      trendData = JSON.parse(toolCall.function.arguments);
    } else {
      const content = data.choices?.[0]?.message?.content || "{}";
      const cleaned = content.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
      trendData = JSON.parse(cleaned);
    }

    // Validate basic structure
    if (!trendData.trending_keywords || typeof trendData.trending_keywords !== "object") {
      console.warn("Missing trending_keywords from AI, building from niches...");
      trendData.trending_keywords = {};
    }

    // Clamp all multipliers to 1.0-2.5
    const clampedKeywords: Record<string, number> = {};
    for (const [k, v] of Object.entries(trendData.trending_keywords)) {
      if (typeof v === "number") {
        clampedKeywords[k.toLowerCase()] = Math.max(1.0, Math.min(2.5, v));
      }
    }

    // Fallback: extract keywords from hot_niches emerging_keywords if trending_keywords was empty
    if (Object.keys(clampedKeywords).length === 0 && Array.isArray(trendData.hot_niches)) {
      console.log("Extracting keywords from hot_niches emerging_keywords as fallback...");
      for (const niche of trendData.hot_niches) {
        const heat = typeof niche.heat === "number" ? Math.max(1.0, Math.min(2.5, 1.0 + (niche.heat / 100) * 1.5)) : 1.5;
        for (const kw of (niche.emerging_keywords || [])) {
          // Split multi-word keywords into individual words too
          const words = String(kw).toLowerCase().split(/\s+/);
          for (const w of words) {
            if (w.length >= 2 && !clampedKeywords[w]) {
              clampedKeywords[w] = heat;
            }
          }
        }
      }
      console.log(`Extracted ${Object.keys(clampedKeywords).length} keywords from niches`);
    }

    // Upsert into DB
    const { error: upsertError } = await supabaseAdmin
      .from("trending_market_data")
      .upsert({
        id: "latest",
        trending_keywords: clampedKeywords,
        hot_niches: trendData.hot_niches || [],
        market_signals: trendData.market_signals || [],
        generated_at: new Date().toISOString(),
        model_used: "google/gemini-3-flash-preview",
        updated_at: new Date().toISOString(),
      });

    if (upsertError) {
      console.error("DB upsert error:", upsertError);
      throw new Error("Failed to save trend data");
    }

    return new Response(
      JSON.stringify({
        success: true,
        keywords_count: Object.keys(clampedKeywords).length,
        niches_count: (trendData.hot_niches || []).length,
        signals_count: (trendData.market_signals || []).length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("refresh-trends error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
