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

    const { domain, scores } = await req.json();
    if (!domain || typeof domain !== "string")
      throw new Error("Missing domain parameter");
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

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
- Hot niches: AI/Agents, Fintech, Biotech, Clean Energy, Cybersecurity, Pet Tech
- Premium TLDs: .com (king), .ai ($45k+ avg), .io (tech standard)
- Trending keywords: agent, agentic, neural, quantum, vault, deep, synthetic, pay, cash, clean, code, fire, beauty

IMPORTANT: You are given pre-computed scores from our algorithmic analysis engine. Use these as data anchors — your verdict should be INFORMED by but not slavishly follow the scores. Add qualitative insights the algorithm can't capture: brand feel, end-user appeal, industry timing, and comparable sales context. If the algorithmic valuation seems off, explain why and provide your own range.

CRITICAL PRICING RULE: The "suggested_buy_price" is the MAX an investor should PAY to acquire the domain. It must ALWAYS be significantly LOWER than "value_range" (the estimated end-user resale value). Typical buy price is 10-40% of end-user value. For example if value_range is "$5,000 - $15,000", suggested_buy_price might be "$1,000 - $4,000". The buy price should NEVER equal or exceed the resale value — investors need profit margin.`;

    const userPrompt = `Analyze the domain "${domain}" for investment potential.${scoresContext}

Provide:
1. Overall investment verdict (Strong Buy / Buy / Hold / Avoid)
2. Estimated aftermarket value range (use comparable sales as anchors if available)
3. Best buyer persona (who would buy this?)
4. Top 3 strengths
5. Top 3 weaknesses or risks
6. Suggested buy price (the MAX an investor should pay — must be well below the value range to ensure profit margin, typically 10-40% of end-user value)
7. Flip potential (1-10 score) and estimated timeline
8. Niche classification
9. One-sentence summary`;

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
                description:
                  "Return structured domain investment analysis",
                parameters: {
                  type: "object",
                  properties: {
                    verdict: {
                      type: "string",
                      enum: ["Strong Buy", "Buy", "Hold", "Avoid"],
                    },
                    value_range: {
                      type: "string",
                      description: "e.g. $500 - $2,000",
                    },
                    buyer_persona: { type: "string" },
                    strengths: {
                      type: "array",
                      items: { type: "string" },
                    },
                    weaknesses: {
                      type: "array",
                      items: { type: "string" },
                    },
                    suggested_buy_price: { type: "string", description: "Max investor acquisition price — must be well below value_range (typically 10-40% of end-user value)" },
                    flip_score: {
                      type: "number",
                      description: "1-10 flip potential",
                    },
                    flip_timeline: {
                      type: "string",
                      description: "e.g. 3-6 months",
                    },
                    niche: { type: "string" },
                    summary: { type: "string" },
                  },
                  required: [
                    "verdict",
                    "value_range",
                    "buyer_persona",
                    "strengths",
                    "weaknesses",
                    "suggested_buy_price",
                    "flip_score",
                    "flip_timeline",
                    "niche",
                    "summary",
                  ],
                  additionalProperties: false,
                },
              },
            },
          ],
          tool_choice: {
            type: "function",
            function: { name: "return_domain_analysis" },
          },
        }),
      }
    );

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please try again later." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
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
