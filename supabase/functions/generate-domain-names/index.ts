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

// 5 batches with different creative angles — maximise volume & diversity
const BATCH_ANGLES = [
  `Focus on KEYWORD + WORD combinations directly tied to the user's topic. Take the user's keywords (or close synonyms) and pair them with a short modifier word. If the user says "robotics", names MUST relate to robotics/automation/bots. Examples for "finance": CashNex, VaultForj, MintArc, FundPulse. At least 30 of 40 names should contain the user's keyword or a direct synonym. Every name must clearly evoke the user's niche at a glance.`,
  `Focus on INVENTED words and phonetic blends that are ROOTED in the user's topic. The coined word must still clearly evoke the user's niche — do NOT generate random syllables. If the user says "robotics", think "Robivyn", "Botiqo", "Mechara". If they say "finance", think "Fintara", "Cashlynk", "Payvora". The name should sound premium AND immediately suggest the industry. Every name must relate to the user's keywords.`,
  `Focus on SHORT compound names and unexpected real-word pairings that are RELEVANT to the user's topic. Combine two short words where at least one relates to the user's niche. If the user says "health", think "PureZen", "WellSnap", "CareJolt". Do NOT generate generic short names with no connection to the keywords. Every name must make someone think of the user's industry. Prioritize names unlikely to be registered as .com.`,
  `Focus on PREFIX/SUFFIX variations using the user's core keyword. Add prefixes (Go, Re, Un, My, Try, Get, Use) or suffixes (ly, fy, ify, hub, lab, base, stack, wire) to the user's keyword or synonyms. For "robotics": GoBot, Robify, BotWire, MechHub, AutoLab. For "finance": GoFund, Payify, CashWire, MintLab. Every name must directly contain or reference the user's niche. Generate 40 unique names.`,
  `Focus on VERB + NICHE combos and action-oriented names. Pair action verbs (Launch, Build, Snap, Flip, Spark, Shift, Boost) with niche keywords. For "robotics": LaunchBot, BuildMech, SparkDroid, ShiftGear. For "finance": FlipCash, SnapPay, BoostFund. Also try reversals: BotLaunch, PaySnap. Names must be brandable and evoke the user's industry. Generate 40 unique names.`,
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

CRITICAL RELEVANCE RULES:
- EVERY name MUST be directly relevant to the user's keywords and industry. This is the #1 rule.
- If the user says "robotics", every name must evoke robotics, automation, machines, or bots.
- If the user says "finance", every name must evoke money, payments, investing, or trading.
- Do NOT generate generic cool-sounding names that have no connection to the user's topic.
- Use the user's keywords, synonyms, or root morphemes in every name.

CRITICAL AVAILABILITY RULES:
- The #2 priority is that these names are ACTUALLY AVAILABLE to register as .com domains.
- DO NOT suggest names that are obviously common words (e.g. "Speed", "Cash", "Deep") — these .coms are ALL taken.
- DO NOT suggest names that sound like existing companies (e.g. "Vercel", "Stripe", "Notion").
- INVENT new combinations using the user's niche vocabulary. Use unusual letter combos, rare word pairings, made-up portmanteaus.
- Examples of GOOD relevant names for "robotics": "Robivex", "BotForj", "Mechyra", "AutoNyx", "Geariqo"
- Examples of BAD irrelevant names for "robotics": "Zyndra", "Quorbit", "PulseForj" (no robotics connection)

- Generate exactly 40 unique names. ${batchAngle}
- AUTOMATIC SYNERGY: Rate how well phonetics, aesthetics, trends, and niche fit together (score 1-100). High synergy = inevitable brand.
- Include trend_score (0-100) based on 2026 market signals.
- Each name must be DIFFERENT — no variations of the same root.`;

  const userPrompt = `Generate 40 domain names for: "${keywords}"${industry ? ` in the ${industry} industry` : ""}.${inspiredByContext}
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
    const { keywords, industry, style, inspired_by, competitor_domains, batch_count } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    let inspiredByContext = "";
    if (inspired_by) {
      inspiredByContext = `\nThe user wants names INSPIRED BY "${inspired_by}". Analyze its structure and generate similar-quality names that are ACTUALLY LIKELY TO BE AVAILABLE for .com registration.`;
    }
    if (competitor_domains) {
      inspiredByContext += `\nCOMPETITOR ANALYSIS MODE: The user's competitors use these domains: ${competitor_domains}. 
Analyze their naming patterns (length, style, word types, phonetics) and generate DIFFERENTIATED alternatives that:
1. Stand out from these competitors while staying in the same niche
2. Are stylistically distinct — if competitors use short words, try compound names; if they use real words, try invented ones
3. Feel premium and modern, not derivative
4. Would make someone think "this competes with ${competitor_domains} but feels fresher"`;
    }

    // Use fewer batches for "more like this" requests
    const anglesToUse = batch_count === 1 ? [BATCH_ANGLES[0]] : BATCH_ANGLES;

    console.log(`Starting ${anglesToUse.length} parallel AI batches for domain generation...`);
    const batchPromises = anglesToUse.map((angle, i) =>
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
