import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const RECENT_PREMIUM_SALES = [
  { name: "Midnight.com", price: "$1.15M", niche: "Brandable" },
  { name: "C4.com", price: "$265k", niche: "Short" },
  { name: "Surface.ai", price: "$110k", niche: "AI/Tech" },
  { name: "Speed.ai", price: "$165k", niche: "AI/Tech" },
  { name: "Synthetic.ai", price: "$100k", niche: "AI/Tech" },
  { name: "Amber.ai", price: "$115k", niche: "AI/Tech" },
];

const TRENDING_NICHES: Record<string, string[]> = {
  "AI/Tech": ["agent", "agentic", "neural", "synthetic", "deep", "quantum", "code", "pixel", "stack"],
  "Finance": ["pay", "cash", "vault", "prime", "capital", "fund", "trade", "mint"],
  "SaaS": ["flux", "forge", "pulse", "core", "grid", "stack", "bolt", "signal"],
  "Ecommerce": ["cart", "store", "shop", "deal", "market", "sell", "swift"],
  "Health": ["vita", "zen", "pure", "care", "heal", "well", "life"],
};

function getStyleGuide(style: string): string {
  switch (style) {
    case "investor_flip":
      return `SHORT, high-resale-potential domain names optimized for quick flipping. Focus on: trending keywords (AI, agents, fintech), two-word combos under 10 chars, .ai and .io TLDs for maximum markup.`;
    case "premium_brand":
      return `PREMIUM invented/brandable names that sound like million-dollar startups. Ultra-memorable, unique coined words or unexpected real-word combos. Think: Spotify, Zillow, Notion, Vercel.`;
    case "keyword_rich":
      return `KEYWORD-RICH exact-match or partial-match domains with strong SEO and type-in traffic potential. Descriptive names that clearly communicate what the business does.`;
    case "expired_pattern":
      return `domains that match COMMON DROP PATTERNS — short dictionary words, two-word .coms, trending keyword combos.`;
    default:
      return "a strategic mix of investor flip candidates, premium brandable names, and keyword-rich descriptive domains";
  }
}

// 3 batches with different creative angles — emphasis on keyword+word combos
const BATCH_ANGLES = [
  `Focus on KEYWORD + WORD combinations. Pair a strong keyword from the user's niche with a short modifier word. Examples: DeepVault, CashPulse, CodeForge, MintStack, TradeNest. The combo must feel natural and brandable. At least 20 of 35 names should be keyword+word combos.`,
  `Focus on INVENTED words and phonetic blends that sound premium. Think Spotify, Zillow, Vercel, Twilio. Names that don't exist as real words but sound amazing and are very unlikely to already be registered as .com domains. Make them OBSCURE enough to actually be available.`,
  `Focus on SHORT powerful names and unexpected real-word pairings. Single modified words, prefixes/suffixes, and ultra-concise combos under 8 chars. Also include compound words that pair two short real words in surprising ways. Think: Snapchat, Airbnb, Coinbase. Prioritize names that are UNLIKELY to be registered.`,
];

async function generateBatch(
  LOVABLE_API_KEY: string,
  keywords: string,
  industry: string,
  style: string,
  inspiredByContext: string,
  batchAngle: string,
  batchIndex: number,
): Promise<any[]> {
  const styleGuide = getStyleGuide(style || "mixed");
  const trendingContext = `
CURRENT MARKET TRENDS (Feb 2026):
- Hot keywords: Casino, Dog, Chat, Deep, Cash, Clean, Code, Beauty, Finance, Fire
- Trending: AI, Agent, Agentic, Pay, Claw, Neural, Quantum
- Recent sales: ${RECENT_PREMIUM_SALES.map(s => `${s.name} (${s.price})`).join(", ")}
- Hot TLDs: .ai, .com, .io
- Niches: ${Object.entries(TRENDING_NICHES).map(([k, v]) => `${k}: ${v.slice(0, 3).join(", ")}`).join(" | ")}`;

  const systemPrompt = `You are an elite domain name investment consultant. Generate high-value domain name suggestions. Focus on: ${styleGuide}.
${trendingContext}

Rules:
- Names should be short (ideally 5-12 characters)
- Easy to spell and type
- No hyphens or numbers
- Return ONLY the name part WITHOUT any TLD (e.g. "Zolva" not "Zolva.com")

CRITICAL AVAILABILITY RULES:
- The #1 priority is that these names are ACTUALLY AVAILABLE to register as .com domains.
- DO NOT suggest names that are obviously common words (e.g. "Speed", "Cash", "Deep") — these .coms are ALL taken.
- DO NOT suggest names that sound like existing companies (e.g. "Vercel", "Stripe", "Notion") — we check trademarks.
- INVENT new combinations. Use unusual letter combos, rare word pairings, made-up portmanteaus.
- Think about what a domainer would search on GoDaddy and find AVAILABLE — not what sounds cool but is already taken.
- Examples of names that ARE likely available: "Quorbit", "Zyndra", "VaultNex", "PulseForj", "Codevyn", "Mintarc"
- Examples of names that are NOT available: "DeepMind", "CashApp", "CodeFlow", "PayVault", "NeuralNet"

- Generate exactly 35 unique names. ${batchAngle}
- AUTOMATIC SYNERGY: Rate how well phonetics, aesthetics, trends, and niche fit together (score 1-100). High synergy = inevitable brand.
- Include trend_score (0-100) based on 2026 market signals.
- Each name must be DIFFERENT — no variations of the same root.`;

  const userPrompt = `Generate 35 domain names for: "${keywords}"${industry ? ` in the ${industry} industry` : ""}.${inspiredByContext}
Return: name (no TLD), score (synergy 1-100), trend_score (0-100), reason (one sentence).`;

  try {
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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
              name: "return_domain_suggestions",
              description: "Return domain name suggestions",
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
                      },
                      required: ["name", "score", "trend_score", "reason"],
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
      console.error(`Batch ${batchIndex} failed: ${response.status}`);
      return [];
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];

    let parsed;
    if (toolCall) {
      parsed = JSON.parse(toolCall.function.arguments);
    } else {
      const content = data.choices?.[0]?.message?.content || "{}";
      const cleaned = content.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
      parsed = JSON.parse(cleaned);
    }

    return (parsed?.suggestions || []).map((s: any) => ({
      ...s,
      name: s.name.replace(/\.(com|ai|io|co|net|app|dev|org)$/i, "").trim(),
    }));
  } catch (e) {
    console.error(`Batch ${batchIndex} error:`, e);
    return [];
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { keywords, industry, style, inspired_by } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const inspiredByContext = inspired_by
      ? `\nThe user wants names INSPIRED BY "${inspired_by}". Analyze its structure and generate similar-quality names that are ACTUALLY LIKELY TO BE AVAILABLE for .com registration.`
      : "";

    // Fire 3 batches IN PARALLEL — each with a different creative angle
    console.log("Starting 3 parallel AI batches for domain generation...");
    const batchPromises = BATCH_ANGLES.map((angle, i) =>
      generateBatch(LOVABLE_API_KEY, keywords, industry || "", style || "mixed", inspiredByContext, angle, i)
    );

    const batchResults = await Promise.all(batchPromises);
    
    // Combine and deduplicate by lowercase name
    const seen = new Set<string>();
    const allSuggestions: any[] = [];
    for (const batch of batchResults) {
      for (const s of batch) {
        const key = s.name.toLowerCase();
        if (!seen.has(key) && s.name.length > 0) {
          seen.add(key);
          allSuggestions.push(s);
        }
      }
    }

    console.log(`Generated ${allSuggestions.length} unique names from ${batchResults.map(b => b.length).join("+")} batches`);

    return new Response(JSON.stringify({ suggestions: allSuggestions }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-domain-names error:", e);
    const msg = e instanceof Error ? e.message : "Unknown error";
    
    if (msg.includes("Rate limit")) {
      return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
