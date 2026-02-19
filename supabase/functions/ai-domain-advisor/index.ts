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

    // Fetch comparable sales from database
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const domainTld = domain.includes(".") ? domain.split(".").pop()?.toLowerCase() : null;
    const { data: compSales } = await supabaseAdmin
      .from("comparable_sales")
      .select("domain_name, sale_price, sale_date, tld, venue")
      .order("sale_price", { ascending: false })
      .limit(200);

    let compSalesContext = "";
    if (compSales && compSales.length > 0) {
      const tldComps = domainTld ? compSales.filter((s: any) => s.tld === `.${domainTld}`).slice(0, 15) : [];
      const topComps = compSales.filter((s: any) => !tldComps.some((t: any) => t.domain_name === s.domain_name)).slice(0, 25);
      const allComps = [...tldComps, ...topComps];

      const lines = allComps.map((s: any) =>
        `  - ${s.domain_name}: $${Number(s.sale_price).toLocaleString()}${s.sale_date ? ` (${s.sale_date})` : ""}${s.venue ? ` via ${s.venue}` : ""}`
      );
      compSalesContext = `\n\nVERIFIED COMPARABLE SALES DATABASE (${compSales.length} total records):\n${lines.join("\n")}\n\nUSE THESE VERIFIED SALES to anchor your valuations. Reference specific comps when justifying price estimates.`;
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
- Recent notable sales: Voice.ai ($15M), Chat.com ($15.5M), Cars.com ($872M brand value), Delete.co ($400K+), Crypto.com ($12M), Eth.co ($1M), Game.co ($1.3M), Send.ai ($450K), Auto.ai ($210K)
${compSalesContext}

COMPARABLE SALES DATABASE (use these to anchor valuations):
- Single dictionary .com words (4-5 letters): $500K-$15M+ depending on commercial appeal
- Two-word .com combos (premium niches): $50K-$500K
- Single dictionary .ai domains: $50K-$500K+  
- Short brandable .com (5-6 chars, pronounceable): $10K-$100K
- Generic keyword .io: $5K-$50K
- Longer brandable .com (7+ chars, two-word): $5K-$50K
- Niche keyword .com: $2K-$20K
- Non-premium TLDs (.xyz, .info, etc.): $100-$5K unless exceptional

IMPORTANT: You are given pre-computed scores from our algorithmic analysis engine. Use these as data anchors — your verdict should be INFORMED by but not slavishly follow the scores. Add qualitative insights the algorithm can't capture: brand feel, end-user appeal, industry timing, and comparable sales context. If the algorithmic valuation seems off, explain why and provide your own range.

CRITICAL PRICING RULES:
- "end_user_value" is the estimated price an END USER (startup, brand, company) would pay to buy this domain for their business. This is the retail/resale value.
- "wholesale_value" is what the domain would trade for between DOMAIN INVESTORS/BROKERS in a wholesale transaction. Typically 20-50% of end-user value.
- "suggested_buy_price" is the MAX an INVESTOR should pay to ACQUIRE the domain at auction or from a seller. It must ALWAYS be significantly LOWER than wholesale_value (typically 10-30% of end-user value). This is the "walk away" ceiling for smart money.
- The buy price should NEVER equal or exceed the wholesale value — investors need profit margin.
- For premium category-killer domains (like Delete.co selling for $400k+), end-user values can be six or seven figures.`;


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
- Weaknesses: ${previousAnalysis.weaknesses?.join(", ")}`;

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
9. Market positioning analysis — how does this domain compare to category leaders? What recent comparable sales inform the valuation?
10. Development potential — what kind of business/product could be built on this domain to maximize value?
11. SEO & marketing angle — natural search advantages, brandable campaign potential, social media handle availability considerations
12. Risk assessment — trademark concerns, cultural/linguistic issues, TLD perception, renewal cost considerations
13. One-paragraph executive summary suitable for an investment memo`;

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
                  },
                  required: ["verdict", "end_user_value", "wholesale_value", "buyer_persona", "strengths", "weaknesses", "suggested_buy_price", "flip_score", "flip_timeline", "niche", "market_positioning", "development_potential", "seo_angle", "risk_detail", "summary"],
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
