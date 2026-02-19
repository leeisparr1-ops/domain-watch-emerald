import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ── helpers ──────────────────────────────────────────────────────────

/** Classify a domain into a category for better comp matching */
function classifyDomain(name: string): string {
  const sld = name.includes(".") ? name.split(".")[0] : name;
  if (/^[a-z]{1,3}$/i.test(sld)) return "acronym";
  if (/^[a-z]{4,5}$/i.test(sld) && !/[aeiou]{3}|[^aeiou]{4}/i.test(sld)) return "short-brandable";
  if (/^\d+$/.test(sld)) return "numeric";
  if (sld.length <= 6) return "short-word";
  return "compound-brandable";
}

/** Compute TLD market stats from comparable sales */
function computeTldStats(sales: any[]): string {
  const tldGroups: Record<string, { prices: number[]; count: number; recent: string | null }> = {};

  for (const s of sales) {
    const tld = (s.tld || "").replace(/^\./, "");
    if (!tld) continue;
    if (!tldGroups[tld]) tldGroups[tld] = { prices: [], count: 0, recent: null };
    tldGroups[tld].prices.push(Number(s.sale_price));
    tldGroups[tld].count++;
    if (!tldGroups[tld].recent || (s.sale_date && s.sale_date > tldGroups[tld].recent!)) {
      tldGroups[tld].recent = s.sale_date;
    }
  }

  const lines: string[] = [];
  const sorted = Object.entries(tldGroups)
    .filter(([, v]) => v.count >= 3)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 15);

  for (const [tld, data] of sorted) {
    const sorted_prices = data.prices.sort((a, b) => b - a);
    const avg = Math.round(sorted_prices.reduce((a, b) => a + b, 0) / sorted_prices.length);
    const median = sorted_prices[Math.floor(sorted_prices.length / 2)];
    const max = sorted_prices[0];
    const min = sorted_prices[sorted_prices.length - 1];
    lines.push(`  .${tld}: ${data.count} sales | Avg $${avg.toLocaleString()} | Median $${median.toLocaleString()} | Range $${min.toLocaleString()}-$${max.toLocaleString()}`);
  }

  return lines.length > 0
    ? `\nTLD MARKET STATISTICS (computed from ${sales.length} verified sales):\n${lines.join("\n")}`
    : "";
}

/** Compute domain-category benchmarks */
function computeCategoryBenchmarks(sales: any[]): string {
  const categories: Record<string, number[]> = {
    "3-letter .com": [], "4-letter .com": [], "5-letter .com": [],
    "single-word .com": [], "two-word .com": [],
    ".ai domains": [], ".io domains": [], ".co domains": [], ".xyz domains": [],
  };

  for (const s of sales) {
    const tld = (s.tld || "").replace(/^\./, "");
    const sld = s.domain_name.split(".")[0].toLowerCase();
    const price = Number(s.sale_price);

    if (tld === "com") {
      if (sld.length === 3) categories["3-letter .com"].push(price);
      else if (sld.length === 4) categories["4-letter .com"].push(price);
      else if (sld.length === 5) categories["5-letter .com"].push(price);

      if (/^[a-z]+$/i.test(sld) && sld.length <= 8) categories["single-word .com"].push(price);
      if (sld.length > 8) categories["two-word .com"].push(price);
    }
    if (tld === "ai") categories[".ai domains"].push(price);
    if (tld === "io") categories[".io domains"].push(price);
    if (tld === "co") categories[".co domains"].push(price);
    if (tld === "xyz") categories[".xyz domains"].push(price);
  }

  const lines: string[] = [];
  for (const [cat, prices] of Object.entries(categories)) {
    if (prices.length < 2) continue;
    prices.sort((a, b) => b - a);
    const avg = Math.round(prices.reduce((a, b) => a + b, 0) / prices.length);
    const median = prices[Math.floor(prices.length / 2)];
    lines.push(`  ${cat}: ${prices.length} sales | Avg $${avg.toLocaleString()} | Median $${median.toLocaleString()}`);
  }

  return lines.length > 0
    ? `\nDOMAIN CATEGORY BENCHMARKS:\n${lines.join("\n")}`
    : "";
}

/** Smart comparable selection: score each sale by relevance to the target domain */
function selectSmartComparables(
  domain: string,
  allSales: any[],
  maxResults: number = 30
): { ranked: any[]; topComps: any[] } {
  const tld = domain.includes(".") ? domain.split(".").pop()?.toLowerCase() : "com";
  const sld = domain.includes(".") ? domain.split(".")[0].toLowerCase() : domain.toLowerCase();
  const category = classifyDomain(domain);
  const now = new Date();

  const scored = allSales.map(sale => {
    let relevance = 0;
    const saleTld = (sale.tld || "").replace(/^\./, "");
    const saleSld = sale.domain_name.split(".")[0].toLowerCase();
    const saleCategory = classifyDomain(sale.domain_name);

    // TLD match (strongest signal)
    if (saleTld === tld) relevance += 40;
    // Same general TLD tier (premium vs alternative)
    else if (["com", "net", "org"].includes(saleTld) && ["com", "net", "org"].includes(tld || "")) relevance += 15;
    else if (["ai", "io", "co"].includes(saleTld) && ["ai", "io", "co"].includes(tld || "")) relevance += 20;

    // Category match
    if (saleCategory === category) relevance += 25;

    // Name length similarity (within ±2 chars)
    const lenDiff = Math.abs(sld.length - saleSld.length);
    if (lenDiff === 0) relevance += 15;
    else if (lenDiff <= 2) relevance += 10;
    else if (lenDiff <= 4) relevance += 5;

    // Recency bonus (more recent = more relevant)
    if (sale.sale_date) {
      const saleDate = new Date(sale.sale_date);
      const monthsAgo = (now.getTime() - saleDate.getTime()) / (1000 * 60 * 60 * 24 * 30);
      if (monthsAgo <= 6) relevance += 15;
      else if (monthsAgo <= 12) relevance += 10;
      else if (monthsAgo <= 24) relevance += 5;
    }

    // Price range reasonableness bonus (avoid extreme outliers for context)
    const price = Number(sale.sale_price);
    if (price >= 1000 && price <= 5000000) relevance += 5;

    return { ...sale, relevance };
  });

  scored.sort((a, b) => b.relevance - a.relevance);

  const ranked = scored.slice(0, maxResults);
  const topComps = scored.slice(0, 5); // Top 5 most relevant for "why this price" explainer

  return { ranked, topComps };
}

// ── main handler ─────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response(null, { headers: corsHeaders });

  try {
    // Verify auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Please sign in to use the AI Domain Advisor." }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Please sign in to use the AI Domain Advisor." }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { domain, scores, followUp, question, previousAnalysis, conversationHistory } = body;

    if (!domain || typeof domain !== "string")
      throw new Error("Missing domain parameter");

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Fetch ALL comparable sales from database
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { data: compSales } = await supabaseAdmin
      .from("comparable_sales")
      .select("domain_name, sale_price, sale_date, tld, venue")
      .order("sale_price", { ascending: false })
      .limit(1000);

    const allSales = compSales || [];

    // ── Build enriched context ──────────────────────────────────
    // 1) TLD market stats
    const tldStatsContext = computeTldStats(allSales);

    // 2) Category benchmarks
    const categoryBenchmarks = computeCategoryBenchmarks(allSales);

    // 3) Smart comparable selection
    const { ranked: smartComps, topComps } = selectSmartComparables(domain, allSales, 30);

    let compSalesContext = "";
    if (smartComps.length > 0) {
      const lines = smartComps.map((s: any) =>
        `  - ${s.domain_name}: $${Number(s.sale_price).toLocaleString()}${s.sale_date ? ` (${s.sale_date})` : ""}${s.venue ? ` via ${s.venue}` : ""} [relevance: ${s.relevance}]`
      );
      compSalesContext = `\n\nSMART-RANKED COMPARABLE SALES (${allSales.length} total records, top ${smartComps.length} most relevant to "${domain}"):\n${lines.join("\n")}\n\nTOP 5 CLOSEST COMPARABLES (use these to anchor your valuation and cite in your analysis):\n${topComps.map((s: any) => `  ★ ${s.domain_name}: $${Number(s.sale_price).toLocaleString()}${s.sale_date ? ` (${s.sale_date})` : ""}`).join("\n")}`;
    }

    // Build enriched context from pre-computed scores
    let scoresContext = "";
    if (scores) {
      const parts: string[] = [];
      if (scores.brandability !== undefined) parts.push(`Brandability Score: ${scores.brandability}/100`);
      if (scores.pronounceability !== undefined) parts.push(`Pronounceability Score: ${scores.pronounceability}/100`);
      if (scores.keywordDemand !== undefined) parts.push(`Keyword Demand Score: ${scores.keywordDemand}/100 (${scores.keywordDemandLabel || ""})`);
      if (scores.valuationRange) parts.push(`Algorithmic Valuation: ${scores.valuationRange}`);
      if (scores.trendScore !== undefined) parts.push(`Trend Score: ${scores.trendScore}/100 (${scores.trendLabel || ""})`);
      if (scores.niche) parts.push(`Detected Niche: ${scores.niche}`);
      if (scores.trademarkRisk) parts.push(`Trademark Risk: ${scores.trademarkRisk}`);
      if (scores.seoVolume !== undefined) parts.push(`Root Keyword Volume: ~${scores.seoVolume.toLocaleString()}/mo (${scores.seoVolumeLabel || ""})`);
      if (scores.domainAgeLabel) parts.push(`Domain Age: ${scores.domainAgeLabel}`);
      if (scores.comparableSales?.length > 0) {
        parts.push("Comparable Recent Sales:");
        for (const sale of scores.comparableSales.slice(0, 4)) {
          parts.push(`  - ${sale.domain}: ${sale.price} (${sale.date}, ${sale.pattern})`);
        }
      }
      scoresContext = `\n\nPRE-COMPUTED ANALYSIS DATA:\n${parts.join("\n")}`;
    }

    const systemPrompt = `You are a senior domain name investment analyst with 15 years of experience in the domain aftermarket. You provide concise, data-driven analysis.

CURRENT MARKET CONTEXT (Feb 2026):
- Hot niches: AI/Agents, Fintech, Biotech, Clean Energy, Cybersecurity, Pet Tech, Health Tech, EdTech
- Premium TLDs: .com (king), .ai ($45k+ avg), .io (tech standard), .co (startup favorite)
- Trending keywords: agent, agentic, neural, quantum, vault, deep, synthetic, pay, cash, clean, code, fire, beauty, orbit, pulse, flux
- Recent notable sales: AI.com ($70M), Voice.ai ($15M), Chat.com ($15.5M), Icon.com ($12M), Rocket.com ($14M), Gold.com ($8.5M), Delete.com ($494K)
${tldStatsContext}
${categoryBenchmarks}
${compSalesContext}

IMPORTANT: You are given pre-computed scores from our algorithmic analysis engine. Use these as data anchors — your verdict should be INFORMED by but not slavishly follow the scores. Add qualitative insights the algorithm can't capture: brand feel, end-user appeal, industry timing, and comparable sales context. If the algorithmic valuation seems off, explain why and provide your own range.

CRITICAL PRICING RULES:
- "end_user_value" is the estimated price an END USER (startup, brand, company) would pay to buy this domain for their business. This is the retail/resale value.
- "wholesale_value" is what the domain would trade for between DOMAIN INVESTORS/BROKERS in a wholesale transaction. Typically 20-50% of end-user value.
- "suggested_buy_price" is the MAX an INVESTOR should pay to ACQUIRE the domain at auction or from a seller. It must ALWAYS be significantly LOWER than wholesale_value (typically 10-30% of end-user value). This is the "walk away" ceiling for smart money.
- The buy price should NEVER equal or exceed the wholesale value — investors need profit margin.
- For premium category-killer domains (like Delete.com selling for $494K+), end-user values can be six or seven figures.

CONFIDENCE SCORING:
- Return a "valuation_confidence" field: "High" (5+ close TLD+category comps), "Medium" (2-4 reasonable comps), or "Low" (few/no comparable sales data).
- Return "key_comparables": an array of the 3-5 specific comparable sales that MOST influenced your valuation, with domain name, sale price, and why it's relevant.
- Be transparent about confidence — if comps are sparse, say so.`;


    // Handle follow-up questions
    if (followUp && question && previousAnalysis) {
      const previousContext = `Previous analysis for "${domain}":
- Verdict: ${previousAnalysis.verdict}
- End-User Value: ${previousAnalysis.end_user_value}
- Max Acquisition Price: ${previousAnalysis.suggested_buy_price}
- Flip Score: ${previousAnalysis.flip_score}/10
- Flip Timeline: ${previousAnalysis.flip_timeline}
- Buyer Persona: ${previousAnalysis.buyer_persona}
- Niche: ${previousAnalysis.niche}
- Summary: ${previousAnalysis.summary}
- Strengths: ${previousAnalysis.strengths?.join(", ")}
- Weaknesses: ${previousAnalysis.weaknesses?.join(", ")}
- Confidence: ${previousAnalysis.valuation_confidence || "N/A"}`;

      const messages: { role: string; content: string }[] = [
        { role: "system", content: systemPrompt + `\n\n${previousContext}${scoresContext}\n\nYou are now in a follow-up conversation about "${domain}". Answer the user's questions with specific, actionable advice. Be concise but thorough. Reference the analysis data when relevant.\n\nIMPORTANT FORMATTING RULE: Do NOT use any markdown formatting in your responses. No hashtags (###), no asterisks for bold (**text**), no underscores. Write in plain, clean text only. Use numbered lists (1. 2. 3.) when needed but never markdown syntax.` },
      ];

      // Add conversation history
      if (conversationHistory && Array.isArray(conversationHistory)) {
        for (const msg of conversationHistory.slice(-10)) {
          messages.push({ role: msg.role, content: msg.content });
        }
      }

      messages.push({ role: "user", content: question });

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
            messages,
          }),
        }
      );

      if (!response.ok) {
        if (response.status === 429) {
          return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
            { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
        if (response.status === 402) {
          return new Response(JSON.stringify({ error: "AI credits exhausted. Please try again later." }),
            { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
        const t = await response.text();
        console.error("AI gateway error:", response.status, t);
        throw new Error("AI gateway error");
      }

      const data = await response.json();
      const answer = data.choices?.[0]?.message?.content || "I couldn't generate a response.";

      return new Response(JSON.stringify({ answer }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Initial analysis
    const userPrompt = `Analyze the domain "${domain}" for investment potential.${scoresContext}

Provide a COMPREHENSIVE investment analysis covering:
1. Overall investment verdict (Strong Buy / Buy / Hold / Avoid)
2. Estimated end-user value range (what a startup/brand/company would pay to own this domain)
3. Best buyer persona (who would buy this?) — be specific (e.g. "Series A fintech startup", "Fortune 500 rebrand")
4. Top 3-5 strengths
5. Top 3-5 weaknesses or risks
6. Max acquisition price (the MAX an investor should pay at auction — must be well below the end-user value, typically 10-40%)
7. Flip potential (1-10 score) and estimated timeline
8. Niche classification
9. Market positioning analysis — how does this domain compare to category leaders? Reference SPECIFIC comparable sales from the database.
10. Development potential — what kind of business/product could be built on this domain to maximize value?
11. SEO & marketing angle — natural search advantages, brandable campaign potential, social media handle availability considerations
12. Risk assessment — trademark concerns, cultural/linguistic issues, TLD perception, renewal cost considerations
13. One-paragraph executive summary suitable for an investment memo
14. Valuation confidence level (High/Medium/Low) based on comparable sales density
15. The 3-5 specific comparable sales that most influenced your valuation — explain WHY each is relevant`;

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
                name: "return_domain_analysis",
                description: "Return structured domain investment analysis",
                parameters: {
                  type: "object",
                  properties: {
                    verdict: { type: "string", enum: ["Strong Buy", "Buy", "Hold", "Avoid"] },
                    end_user_value: { type: "string", description: "Estimated price an end user (startup/brand/company) would pay, e.g. $500,000 - $1,500,000" },
                    wholesale_value: { type: "string", description: "Price the domain would trade for between domain investors/brokers in a wholesale deal, typically 20-50% of end-user value" },
                    buyer_persona: { type: "string", description: "Specific buyer type, e.g. 'Series A fintech startup looking for a premium brand'" },
                    strengths: { type: "array", items: { type: "string" }, description: "3-5 key strengths" },
                    weaknesses: { type: "array", items: { type: "string" }, description: "3-5 risks or weaknesses" },
                    suggested_buy_price: { type: "string", description: "Max investor acquisition price — must be well below end_user_value (typically 10-40% of end-user value)" },
                    flip_score: { type: "number", description: "1-10 flip potential" },
                    flip_timeline: { type: "string", description: "e.g. 3-6 months" },
                    niche: { type: "string" },
                    market_positioning: { type: "string", description: "How this domain compares to category leaders and comparable sales that inform the valuation" },
                    development_potential: { type: "string", description: "What business/product could be built on this domain to maximize value" },
                    seo_angle: { type: "string", description: "Natural search advantages, brandable campaign potential" },
                    risk_detail: { type: "string", description: "Detailed risk assessment: trademark, cultural, TLD perception, renewal costs" },
                    summary: { type: "string", description: "Executive summary suitable for an investment memo (2-3 sentences)" },
                    valuation_confidence: { type: "string", enum: ["High", "Medium", "Low"], description: "Confidence in valuation based on comparable sales density. High = 5+ close comps, Medium = 2-4 comps, Low = sparse data" },
                    key_comparables: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          domain: { type: "string", description: "The comparable domain name" },
                          price: { type: "string", description: "Sale price, e.g. $500,000" },
                          relevance: { type: "string", description: "Why this comp is relevant (1 sentence)" },
                        },
                        required: ["domain", "price", "relevance"],
                        additionalProperties: false,
                      },
                      description: "3-5 specific comparable sales that most influenced the valuation",
                    },
                  },
                  required: ["verdict", "end_user_value", "wholesale_value", "buyer_persona", "strengths", "weaknesses", "suggested_buy_price", "flip_score", "flip_timeline", "niche", "market_positioning", "development_potential", "seo_angle", "risk_detail", "summary", "valuation_confidence", "key_comparables"],
                  additionalProperties: false,
                },
              },
            },
          ],
          tool_choice: { type: "function", function: { name: "return_domain_analysis" } },
        }),
      }
    );

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please try again later." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];

    let analysis;
    if (toolCall) {
      analysis = JSON.parse(toolCall.function.arguments);
    } else {
      const content = data.choices?.[0]?.message?.content || "{}";
      const cleaned = content.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
      analysis = JSON.parse(cleaned);
    }

    return new Response(JSON.stringify(analysis), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ai-domain-advisor error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
