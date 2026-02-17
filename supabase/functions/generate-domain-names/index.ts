import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Curated trending keywords for 2026 — updated periodically
const TRENDING_KEYWORDS_2026 = [
  "agent", "agentic", "neural", "quantum", "vault", "deep", "synthetic",
  "pay", "cash", "clean", "code", "fire", "beauty", "claw", "orbit",
  "flux", "forge", "pulse", "nexus", "swift", "apex", "core", "zen",
  "pixel", "grid", "stack", "bolt", "prime", "signal", "wave",
];

const TRENDING_NICHES: Record<string, string[]> = {
  "AI/Tech": ["agent", "agentic", "neural", "synthetic", "deep", "quantum", "code", "pixel", "stack"],
  "Finance": ["pay", "cash", "vault", "prime", "capital", "fund", "trade", "mint"],
  "SaaS": ["flux", "forge", "pulse", "core", "grid", "stack", "bolt", "signal"],
  "Ecommerce": ["cart", "store", "shop", "deal", "market", "sell", "swift"],
  "Health": ["vita", "zen", "pure", "care", "heal", "well", "life"],
};

const RECENT_PREMIUM_SALES = [
  { name: "Midnight.com", price: "$1.15M", niche: "Brandable" },
  { name: "C4.com", price: "$265k", niche: "Short" },
  { name: "Surface.ai", price: "$110k", niche: "AI/Tech" },
  { name: "Speed.ai", price: "$165k", niche: "AI/Tech" },
  { name: "Synthetic.ai", price: "$100k", niche: "AI/Tech" },
  { name: "Amber.ai", price: "$115k", niche: "AI/Tech" },
];

function getStyleGuide(style: string): string {
  switch (style) {
    case "investor_flip":
      return `SHORT, high-resale-potential domain names optimized for quick flipping. Focus on: trending keywords (AI, agents, fintech), 
two-word combos under 10 chars, .ai and .io TLDs for maximum markup. These should be names a domainer would buy today and sell for 3-10x within months. 
Think: AgenticPay.ai, DeepVault.com, NeuralMint.io`;
    case "premium_brand":
      return `PREMIUM invented/brandable names that sound like million-dollar startups. Ultra-memorable, unique coined words or unexpected 
real-word combos. Think: Spotify, Zillow, Notion, Vercel. These command premium aftermarket prices due to uniqueness and phonetic appeal`;
    case "keyword_rich":
      return `KEYWORD-RICH exact-match or partial-match domains with strong SEO and type-in traffic potential. 
Descriptive names that clearly communicate what the business does. Think: FastDelivery.com, AIFinanceAgent.com, CloudHosting.io`;
    case "expired_pattern":
      return `domains that match COMMON DROP PATTERNS — the kind that expire daily on major auction platforms. 
Short dictionary words, two-word .coms, trending keyword combos. Names that a pattern alert like "ai+agent" or "crypto+pay" would catch. 
Think: CryptoVault.com, AIAgent.io, DataPulse.com`;

    default:
      return "a strategic mix of investor flip candidates, premium brandable names, and keyword-rich descriptive domains";
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { keywords, industry, style, inspired_by } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const styleGuide = getStyleGuide(style || "mixed");

    // Build trending context
    const trendingContext = `
CURRENT MARKET TRENDS (Feb 2026):
- Hot aftermarket keywords: Casino, Dog, Chat, Deep, Cash, Clean, Code, Beauty, Finance, Fire
- Trending investment keywords: AI, Agent, Agentic, Pay, Claw, Neural, Quantum
- Recent premium sales: ${RECENT_PREMIUM_SALES.map(s => `${s.name} (${s.price})`).join(", ")}
- Hot TLDs: .ai (avg aftermarket $45k+), .com (always king), .io (tech standard)
- Trending niches: ${Object.entries(TRENDING_NICHES).map(([k, v]) => `${k}: ${v.slice(0, 4).join(", ")}`).join(" | ")}

Use these trends to boost relevance. Inject trending keywords naturally where they fit the user's request.`;

    const inspiredByContext = inspired_by
      ? `\n\nThe user wants names INSPIRED BY the sold domain "${inspired_by}". Analyze its structure (length, word combo style, TLD, sound) and generate 10 similar-quality names. Explain in each reason how it relates to the inspiration domain.`
      : "";

    const systemPrompt = `You are an elite domain name investment consultant used by professional domainers and flippers. Generate high-value domain name suggestions. Focus on: ${styleGuide}.

${trendingContext}

Rules:
- Names should be short (ideally under 12 characters for the name part)
- Easy to spell and type
- No hyphens or numbers
- For each name, suggest 8-10 TLD extensions that would work well (include .com, .io, .co, .ai, .net, .app, .dev, .xyz, .gg, .so, .tech, .health, .finance — pick the most relevant ones)
- Include a brief reason why each name works for investors
- Rate each name's TREND alignment (0-100) based on current 2026 market signals above
- Consider aftermarket resale potential, not just brandability`;

    const userPrompt = `Generate 10 domain name suggestions for: "${keywords}"${industry ? ` in the ${industry} industry` : ""}.${inspiredByContext}

Return suggestions with: name (full domain with extension), score (1-100 brandability/investment score), trend_score (0-100 how aligned with current 2026 trends), reason (one sentence why an investor would want this), available_tlds (array of 8-10 TLD extensions worth exploring, e.g. [".com", ".ai", ".io", ".app", ".dev", ".co", ".xyz", ".tech"]).`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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
              name: "return_domain_suggestions",
              description: "Return domain name suggestions with investment metrics",
              parameters: {
                type: "object",
                properties: {
                  suggestions: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        name: { type: "string" },
                        score: { type: "number" },
                        trend_score: { type: "number" },
                        reason: { type: "string" },
                        available_tlds: { type: "array", items: { type: "string" } },
                      },
                      required: ["name", "score", "trend_score", "reason", "available_tlds"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["suggestions"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "return_domain_suggestions" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please try again later." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];

    let suggestions;
    if (toolCall) {
      suggestions = JSON.parse(toolCall.function.arguments);
    } else {
      const content = data.choices?.[0]?.message?.content || "{}";
      const cleaned = content.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
      suggestions = JSON.parse(cleaned);
    }

    return new Response(JSON.stringify(suggestions), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-domain-names error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
