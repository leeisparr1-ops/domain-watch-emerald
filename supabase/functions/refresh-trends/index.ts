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
7. ESTIMATED MONTHLY SEARCH VOLUMES for each keyword based on your knowledge of Google search data

Return data that a domain investment scoring engine can use to weight keyword demand. Weight keywords higher when both search volume AND domain sales are rising together.`;

    const userPrompt = `Generate a comprehensive trend report for the domain aftermarket as of March 2026.

Return structured data with:
1. trending_keywords: Object mapping keyword → heat multiplier (1.0 = baseline, 2.5 = maximum heat). Include 80-120 keywords across all major niches. Focus on NEW or ACCELERATING terms, not evergreen ones. Factor in:
   - Google Trends-style search volume momentum (breakout terms get 2.0+)
   - Domain aftermarket sale frequency and average prices
   - Venture capital / startup funding trends driving keyword demand
   - Social media buzz and news cycle momentum
2. keyword_volumes: Object mapping keyword → { volume: estimated monthly Google searches (integer), trend: "rising"|"falling"|"stable", cpc_estimate: estimated CPC in USD (number) }. Include ALL keywords from trending_keywords PLUS the top 100 highest-volume evergreen keywords relevant to domain investing (e.g. insurance, loans, crypto, health, etc.). Be as accurate as possible with volume estimates based on your training data about Google search volumes. This data will replace hardcoded heuristics.
3. hot_niches: Array of { niche, label, heat (1-100), emerging_keywords[], declining_keywords[] }. Heat should reflect BOTH search interest growth AND domain sale activity.
4. market_signals: Array of short strings describing key market movements (e.g. ".ai domains averaging $45k in Q1 2026", "search interest for 'agentic' up 340% YoY")

Be specific and data-driven. Reference real market patterns. Include search volume trend indicators where relevant. For keyword_volumes, provide your best estimates of real Google monthly search volumes.`;

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
                description: "Return structured domain market trend data with keyword volume estimates",
                parameters: {
                  type: "object",
                  properties: {
                    trending_keywords: {
                      type: "object",
                      description: "Map of keyword → heat multiplier (1.0-2.5)",
                      additionalProperties: { type: "number" },
                    },
                    keyword_volumes: {
                      type: "object",
                      description: "Map of keyword → {volume, trend, cpc_estimate}",
                      additionalProperties: {
                        type: "object",
                        properties: {
                          volume: { type: "integer", description: "Estimated monthly Google searches" },
                          trend: { type: "string", enum: ["rising", "falling", "stable"] },
                          cpc_estimate: { type: "number", description: "Estimated CPC in USD" },
                        },
                        required: ["volume", "trend"],
                        additionalProperties: false,
                      },
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
                  required: ["trending_keywords", "keyword_volumes", "hot_niches", "market_signals"],
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

    // Validate and normalize keyword_volumes from initial call
    let keywordVolumes: Record<string, { volume: number; trend: string; cpc_estimate?: number }> = {};
    if (trendData.keyword_volumes && typeof trendData.keyword_volumes === "object") {
      for (const [k, v] of Object.entries(trendData.keyword_volumes)) {
        const val = v as any;
        if (val && typeof val === "object" && typeof val.volume === "number") {
          keywordVolumes[k.toLowerCase()] = {
            volume: Math.max(0, Math.round(val.volume)),
            trend: ["rising", "falling", "stable"].includes(val.trend) ? val.trend : "stable",
            cpc_estimate: typeof val.cpc_estimate === "number" ? Math.round(val.cpc_estimate * 100) / 100 : undefined,
          };
        }
      }
    }

    // If volumes are empty, make a dedicated second call for volume estimates
    if (Object.keys(keywordVolumes).length === 0) {
      console.log("No volumes from initial call — making dedicated volume estimation call...");
      const allKeywords = Object.keys(clampedKeywords);
      // Include essential evergreen head terms
      const headTerms = [
        "insurance","loans","mortgage","lawyer","credit","attorney","hosting","casino",
        "health","fitness","crypto","bitcoin","vpn","software","cloud","travel","hotel",
        "dating","jobs","solar","car","auto","bank","invest","trade","pay","shop","game",
        "food","pet","dog","cat","home","house","rent","buy","sell","ai","data","code",
        "tech","app","web","news","music","video","photo","beauty","fashion","skin",
        "dental","legal","energy","electric","robot","money","stock","forex","real estate",
        "marketing","seo","saas","ecommerce","startup","fintech","blockchain","nft",
        "metaverse","quantum","biotech","telehealth","cannabis","ev","drone","cyber",
        "privacy","vpn","podcast","streaming","gaming","esports","wellness","yoga",
        "meditation","diet","keto","vegan","organic","sustainable","green","climate",
        "education","tutoring","college","degree","scholarship","career","resume",
        "wedding","baby","parenting","senior","retirement","pension","therapy","counseling",
      ];
      const combined = [...new Set([...allKeywords, ...headTerms])];
      
      const volumePrompt = `For each of the following keywords, estimate the approximate monthly Google search volume (globally), trend direction, and average CPC in USD. Use your knowledge of real Google search data.

Keywords: ${combined.join(", ")}

Return structured data mapping each keyword to its volume estimate.`;

      try {
        const volResponse = await fetch(
          "https://ai.gateway.lovable.dev/v1/chat/completions",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${LOVABLE_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "google/gemini-2.5-flash",
              messages: [
                { role: "system", content: "You are a search volume estimation expert. Provide your best estimates of real Google monthly search volumes based on your training data. Be as accurate as possible." },
                { role: "user", content: volumePrompt },
              ],
              tools: [
                {
                  type: "function",
                  function: {
                    name: "return_keyword_volumes",
                    description: "Return keyword volume estimates as an array",
                    parameters: {
                      type: "object",
                      properties: {
                        entries: {
                          type: "array",
                          description: "Array of keyword volume estimates",
                          items: {
                            type: "object",
                            properties: {
                              keyword: { type: "string", description: "The keyword" },
                              volume: { type: "integer", description: "Estimated monthly Google searches" },
                              trend: { type: "string", enum: ["rising", "falling", "stable"] },
                              cpc: { type: "number", description: "Estimated CPC in USD" },
                            },
                            required: ["keyword", "volume", "trend"],
                            additionalProperties: false,
                          },
                        },
                      },
                      required: ["entries"],
                      additionalProperties: false,
                    },
                  },
                },
              ],
              tool_choice: {
                type: "function",
                function: { name: "return_keyword_volumes" },
              },
            }),
          }
        );

        if (volResponse.ok) {
          const volData = await volResponse.json();
          const volToolCall = volData.choices?.[0]?.message?.tool_calls?.[0];
          let volumeResult;
          if (volToolCall) {
            volumeResult = JSON.parse(volToolCall.function.arguments);
          } else {
            const c = volData.choices?.[0]?.message?.content || "{}";
            volumeResult = JSON.parse(c.replace(/```json?\n?/g, "").replace(/```/g, "").trim());
          }

          const entries = volumeResult.entries || volumeResult.volumes || [];
          if (Array.isArray(entries)) {
            for (const entry of entries) {
              if (entry && typeof entry.keyword === "string" && typeof entry.volume === "number") {
                keywordVolumes[entry.keyword.toLowerCase()] = {
                  volume: Math.max(0, Math.round(entry.volume)),
                  trend: ["rising", "falling", "stable"].includes(entry.trend) ? entry.trend : "stable",
                  cpc_estimate: typeof entry.cpc === "number" ? Math.round(entry.cpc * 100) / 100 : undefined,
                };
              }
            }
            console.log(`Volume call returned ${entries.length} entries, parsed ${Object.keys(keywordVolumes).length}`);
          }
        } else {
          console.error("Volume estimation call failed:", volResponse.status);
        }
      } catch (volErr) {
        console.error("Volume estimation error:", volErr);
      }
    }
    console.log(`Processed ${Object.keys(keywordVolumes).length} keyword volume estimates`);

    // Upsert into DB
    const { error: upsertError } = await supabaseAdmin
      .from("trending_market_data")
      .upsert({
        id: "latest",
        trending_keywords: clampedKeywords,
        keyword_volumes: keywordVolumes,
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
        volumes_count: Object.keys(keywordVolumes).length,
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