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

    const { domain } = await req.json();
    if (!domain || typeof domain !== "string")
      throw new Error("Missing domain parameter");
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompt = `You are a senior domain name investment analyst with 15 years of experience in the domain aftermarket. You provide concise, data-driven analysis.

CURRENT MARKET CONTEXT (Feb 2026):
- Hot niches: AI/Agents, Fintech, Biotech, Clean Energy, Pet Tech, Cannabis
- Premium TLDs: .com (king), .ai ($45k+ avg), .io (tech standard)
- Trending keywords: agent, agentic, neural, quantum, vault, deep, synthetic, pay, cash, clean, code, fire, beauty

Analyze the given domain and provide actionable investment advice. Be honest — if a domain is weak, say so.`;

    const userPrompt = `Analyze the domain "${domain}" for investment potential. Provide:
1. Overall investment verdict (Strong Buy / Buy / Hold / Avoid)
2. Estimated aftermarket value range
3. Best buyer persona (who would buy this?)
4. Top 3 strengths
5. Top 3 weaknesses or risks
6. Suggested buy price (what's the maximum you'd pay?)
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
                    suggested_buy_price: { type: "string" },
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
