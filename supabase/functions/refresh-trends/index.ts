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

    const systemPrompt = `You are a domain aftermarket intelligence analyst. Your job is to identify CURRENT trending keywords, hot niches, and market signals in the domain name investment space.

CRITICAL GROUNDING REQUIREMENTS — You MUST base your analysis on real-world signals, NOT speculation:

1. **Reddit signals**: Consider what's trending on r/domains, r/flipping, r/Entrepreneur, r/startups, r/technology, r/SaaS, r/cryptocurrency, r/investing. What topics are generating the most discussion and upvotes RIGHT NOW?

2. **Hacker News signals**: What topics dominate the front page? What Show HN posts are trending? What startup/tech terms are being discussed heavily? YC batch themes?

3. **Google Trends / Search momentum**: Which keywords show "Breakout" or 250%+ growth in the last 90 days? What seasonal spikes are happening this quarter?

4. **News & media cycle**: What major tech announcements, product launches, regulatory changes, or industry shifts are driving new keyword demand? (e.g. new AI model releases, policy changes, IPOs, acquisitions)

5. **Social media / X (Twitter)**: What hashtags and topics are tech influencers, VCs, and startup founders discussing?

6. **Domain aftermarket data**: Which TLDs and keyword categories are seeing the most sales activity and price increases on GoDaddy Auctions, Afternic, Sedo, and NameJet?

Weight keywords higher when MULTIPLE signals converge (e.g., trending on Reddit AND rising on Google Trends AND seeing domain sales).

For each keyword, your heat multiplier should reflect REAL observed momentum, not theoretical potential. A keyword at 2.0+ heat must have strong evidence from at least 2 independent signal sources.`;

    const currentDate = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    const userPrompt = `Generate a comprehensive trend report for the domain aftermarket as of ${currentDate}.

IMPORTANT: Ground your analysis in REAL signals you know about. Reference specific Reddit threads, HN discussions, Google Trends data, news events, and social media buzz. Do NOT hallucinate trends — if you're unsure about a keyword's momentum, give it a conservative heat score (1.0-1.3).

Return structured data with:
1. trending_keywords: Object mapping keyword → heat multiplier (1.0 = baseline, 2.5 = maximum heat). You MUST include AT LEAST 80 keywords, ideally 100-120. CRITICAL DISTRIBUTION REQUIREMENTS:
   - At least 30 keywords at 1.0-1.3 (stable/evergreen like "insurance", "hotel", "crypto", "cloud")
   - At least 20 keywords at 1.3-1.6 (moderate uptick — mentioned in 1 signal source)
   - At least 15 keywords at 1.6-2.0 (strong growth — trending in 2+ signal sources)
   - At most 10-15 keywords at 2.0-2.5 (breakout — viral across Reddit, HN, news, AND Google Trends)
   ALWAYS include these broad umbrella categories at appropriate heat: "ai", "crypto", "health", "finance", "gaming", "energy", "green", "cloud", "saas", "web3", "insurance", "travel", "fitness", "dating", "casino", "vpn", "hosting", "solar", "bitcoin", "legal", "marketing", "ecommerce", "education".
   Keywords must be single words or two-word phrases only. NO parenthetical annotations, NO punctuation, NO commentary in keyword names.

2. keyword_volumes: Object mapping keyword → { volume: estimated monthly Google searches (integer), trend: "rising"|"falling"|"stable", cpc_estimate: estimated CPC in USD (number) }. Include ALL keywords from trending_keywords PLUS the top 100 highest-volume evergreen keywords relevant to domain investing.

CRITICAL ACCURACY REQUIREMENTS FOR VOLUME ESTIMATES:
- Use EXACT Google Keyword Planner / SEMrush / Ahrefs-calibrated monthly search volumes
- Reference points you MUST match closely: "insurance" ≈ 823,000/mo, "home" ≈ 550,000/mo, "casino" ≈ 550,000/mo, "ai" ≈ 450,000/mo, "crypto" ≈ 301,000/mo, "car" ≈ 450,000/mo, "app" ≈ 301,000/mo, "bitcoin" ≈ 368,000/mo, "travel" ≈ 368,000/mo
- NO keyword should exceed 2,000,000 monthly searches unless it's a navigation query
- Most industry keywords are in the 100,000-900,000 range
- Niche/emerging keywords are typically 1,000-50,000
- DO NOT inflate volumes — these numbers are shown to professional domain investors

3. hot_niches: Array of 6-10 objects: { niche, label, heat (1-100), emerging_keywords[], declining_keywords[] }. Heat should reflect REAL signals from Reddit/HN/news/Google Trends, not speculation. Include a brief "signal_source" note for each niche explaining WHY it's hot. IMPORTANT: Distribute heat scores — not every niche is 80+. Include some at 30-60 range for balance.

4. market_signals: Array of 6-10 short strings describing key market movements. Each signal MUST reference a real data point (e.g. ".ai domains averaging $45k in Q1 2026 per NameBio data", "search interest for 'agentic' up 340% on Google Trends YoY").

Be specific and data-driven. Every trend claim should be traceable to a real signal source.`;

    const response = await fetch(
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

    // Clamp all multipliers to 1.0-2.5 and sanitize keyword names
    const clampedKeywords: Record<string, number> = {};
    const KEYWORD_RE = /^[a-z0-9][a-z0-9 -]{0,30}[a-z0-9]$/;
    for (const [k, v] of Object.entries(trendData.trending_keywords)) {
      if (typeof v === "number") {
        const clean = k.toLowerCase().replace(/[^a-z0-9 -]/g, "").trim();
        if (clean.length >= 2 && KEYWORD_RE.test(clean)) {
          clampedKeywords[clean] = Math.max(1.0, Math.min(2.5, v));
        } else {
          console.warn(`Dropped invalid keyword: "${k}" → "${clean}"`);
        }
      }
    }

    // Inject broad umbrella keywords from hot_niches labels if not already present
    // This ensures terms like "ai", "crypto", "health" appear alongside specific sub-keywords
    if (Array.isArray(trendData.hot_niches)) {
      const NICHE_UMBRELLA_MAP: Record<string, string[]> = {
        "ai": ["ai", "artificial intelligence", "machine learning"],
        "automation": ["automation"],
        "web3": ["web3", "crypto", "blockchain"],
        "health": ["health", "biotech"],
        "fintech": ["fintech", "finance"],
        "gaming": ["gaming", "esports"],
        "energy": ["energy", "solar", "green"],
        "saas": ["saas", "software"],
        "cloud": ["cloud"],
        "hardware": ["hardware"],
        "spatial": ["spatial", "ar", "vr", "xr"],
        "depin": ["depin"],
        "longevity": ["longevity"],
      };
      for (const niche of trendData.hot_niches) {
        const nicheHeat = typeof niche.heat === "number" ? Math.max(1.0, Math.min(2.0, 1.0 + (niche.heat / 100) * 1.0)) : 1.3;
        const nicheText = `${niche.niche || ""} ${niche.label || ""}`.toLowerCase();
        for (const [key, umbrellaTerms] of Object.entries(NICHE_UMBRELLA_MAP)) {
          if (nicheText.includes(key)) {
            for (const term of umbrellaTerms) {
              if (!clampedKeywords[term]) {
                clampedKeywords[term] = nicheHeat;
                console.log(`Injected umbrella keyword "${term}" at heat ${nicheHeat.toFixed(2)} from niche "${niche.label}"`);
              }
            }
          }
        }
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
            const clean = w.replace(/[^a-z0-9-]/g, "").trim();
            if (clean.length >= 2 && !clampedKeywords[clean]) {
              clampedKeywords[clean] = heat;
            }
          }
        }
      }
      console.log(`Extracted ${Object.keys(clampedKeywords).length} keywords from niches`);
    }

    // Validate and normalize keyword_volumes from initial call
    let keywordVolumes: Record<string, { volume: number; trend: string; cpc_estimate?: number }> = {};

    // Known reference volumes for sanity-checking AI output (SEMrush/Ahrefs calibrated)
    const REFERENCE_VOLUMES: Record<string, number> = {
      "insurance": 823000, "loans": 450000, "mortgage": 368000, "lawyer": 301000,
      "credit": 246000, "attorney": 201000, "hosting": 165000, "casino": 550000,
      "health": 450000, "fitness": 201000, "crypto": 301000, "bitcoin": 368000,
      "vpn": 246000, "software": 135000, "cloud": 165000, "travel": 368000,
      "hotel": 301000, "dating": 246000, "jobs": 368000, "home": 550000,
      "car": 450000, "auto": 201000, "bank": 301000, "ai": 450000,
      "app": 301000, "game": 368000, "food": 301000, "news": 550000,
      "music": 368000, "video": 450000, "energy": 165000, "solar": 135000,
    };
    const MAX_VOLUME = 2_000_000; // absolute cap per keyword

    function clampVolume(keyword: string, rawVolume: number): number {
      const ref = REFERENCE_VOLUMES[keyword];
      if (ref && rawVolume > ref * 3) return ref; // AI hallucinated, use reference
      return Math.min(Math.max(0, Math.round(rawVolume)), MAX_VOLUME);
    }

    if (trendData.keyword_volumes && typeof trendData.keyword_volumes === "object") {
      for (const [k, v] of Object.entries(trendData.keyword_volumes)) {
        const val = v as any;
        if (val && typeof val === "object" && typeof val.volume === "number") {
          keywordVolumes[k.toLowerCase()] = {
            volume: clampVolume(k.toLowerCase(), val.volume),
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
                { role: "system", content: "You are a search volume estimation expert calibrated to Google Keyword Planner / SEMrush / Ahrefs data. Reference points: insurance≈823K, home≈550K, casino≈550K, ai≈450K, crypto≈301K, app≈301K. Most industry keywords are 100K-900K. Niche terms are 1K-50K. NO keyword exceeds 2M unless it's a navigational query. Be precise — domain investors will verify these numbers." },
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
                  volume: clampVolume(entry.keyword.toLowerCase(), entry.volume),
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
        model_used: "google/gemini-2.5-flash",
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