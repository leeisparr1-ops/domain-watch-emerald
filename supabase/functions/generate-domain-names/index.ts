import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ──────────────────────────────────────────────────────────────
// EXPANDED WORD BANKS — used to instruct the AI with concrete
// prefix/suffix examples so every style produces varied output
// ──────────────────────────────────────────────────────────────

const PREFIXES = [
  // Action verbs
  "Go", "Get", "Try", "Use", "Re", "Un", "My", "We", "All", "Pro",
  "Top", "Big", "One", "Max", "Neo", "Evo", "Zen", "Vox", "Ace",
  // Directional / modifier
  "Up", "Out", "Over", "Next", "Meta", "Ultra", "Hyper", "Super",
  "Mega", "Micro", "Smart", "Fast", "Quick", "Rapid", "Swift",
  // Action
  "Launch", "Build", "Snap", "Flip", "Spark", "Shift", "Boost",
  "Drive", "Push", "Pull", "Dash", "Jump", "Rise", "Lift", "Surge",
  "Craft", "Forge", "Make", "Fuse", "Blend", "Link", "Sync",
  "Flex", "Flow", "Glow", "Spin", "Bolt", "Jet", "Zoom", "Rush",
  "Kick", "Pop", "Tap", "Zap", "Ping", "Buzz", "Hum", "Click",
  // Nature / abstract
  "Blue", "Red", "Gold", "Amber", "Iron", "Steel", "Sky", "Sun",
  "Star", "Moon", "Wave", "Storm", "Frost", "Ember", "Oak", "Pine",
  "Cedar", "Sage", "Mint", "Pearl", "Ruby", "Onyx", "Jade", "Coral",
  "Nova", "Aura", "Echo", "Neon", "Lux", "Apex", "Zen", "Arc",
  "True", "Pure", "Open", "Clear", "Bright", "Bold", "Fresh", "Keen",
];

const SUFFIXES = [
  // Tech
  "Hub", "Lab", "Base", "Stack", "Wire", "Grid", "Node", "Core",
  "Edge", "Port", "Gate", "Link", "Net", "Web", "App", "Dev",
  "Ops", "Box", "Kit", "Pad", "Dock", "Bay", "Deck", "Bench",
  // Place / container
  "Nest", "Den", "Hive", "Spot", "Zone", "Camp", "Yard", "Loft",
  "Cove", "Peak", "Ridge", "Vista", "Glen", "Vale", "Reach",
  "Point", "Path", "Trail", "Forge", "Works", "Craft", "Mill",
  // Action / quality
  "Fy", "Ly", "Ify", "Ize", "Able", "Ful", "Ware", "Wise",
  "Wave", "Pulse", "Shift", "Spark", "Leap", "Dash", "Rush",
  "Flow", "Loop", "Flip", "Snap", "Tap", "Pop", "Buzz", "Glow",
  // Brandable endings
  "Vex", "Nyx", "Ova", "Ara", "Ium", "Lex", "Ion", "Rix",
  "Eon", "Ux", "Ix", "Ox", "Ax", "Ex", "Io", "Ia", "Eo",
  "Ori", "Ari", "Avi", "Eko", "Ino", "Ilo", "Ura", "Yra",
  // Industry
  "Pay", "Cash", "Trade", "Vault", "Fund", "Mint",
  "Care", "Well", "Heal", "Fit", "Bio", "Med", "Vita",
  "Learn", "Edu", "Skill", "Mind", "Think", "Logic",
  "Play", "Game", "Quest", "Arena", "Level",
  "Shop", "Cart", "Deal", "Market", "Store",
  "Feed", "Post", "Cast", "Signal", "Beam", "Relay",
];

const MODIFIER_WORDS = [
  // Short nouns that pair well
  "ace", "arc", "ash", "bay", "bit", "bow", "cap", "cue", "dew",
  "elm", "fin", "gem", "hex", "ivy", "jot", "key", "koi", "lux",
  "map", "oak", "orb", "owl", "paw", "ply", "ray", "rift", "rune",
  "silk", "spur", "tide", "tor", "veil", "vim", "wren", "yew",
  // Adjectives
  "apt", "bold", "calm", "deft", "fair", "keen", "lean", "neat",
  "prime", "rare", "sleek", "taut", "vast", "vivid", "warm", "wise",
  // Two-syllable power words
  "beacon", "bridge", "cipher", "delta", "ember", "focal", "harbor",
  "ignite", "kinetic", "lattice", "motive", "nimble", "orbit",
  "prism", "quartz", "ripple", "scalar", "tether", "uplift",
  "vertex", "zenith", "anchor", "bloom", "canvas", "drift",
  "epoch", "flint", "grove", "haven", "lunar", "magnet",
  "noble", "oxide", "pilot", "quest", "realm", "sonic",
  "terra", "unite", "vigor", "wield",
];

// ──────────────────────────────────────────────────────────────

async function fetchLiveTrends(): Promise<{ keywords: string; niches: string; signals: string } | null> {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sb = createClient(supabaseUrl, supabaseKey);
    const { data } = await sb.from("trending_market_data").select("*").eq("id", "latest").single();
    if (!data) return null;

    const kwObj = data.trending_keywords as Record<string, number> | null;
    const keywords = kwObj
      ? Object.entries(kwObj).sort((a, b) => b[1] - a[1]).slice(0, 25).map(([k, v]) => `${k} (${v}x)`).join(", ")
      : "";

    const niches = Array.isArray(data.hot_niches)
      ? (data.hot_niches as any[]).map((n: any) => `${n.niche || n.name}: ${n.heat || "hot"}`).join(", ")
      : "";

    const signals = Array.isArray(data.market_signals)
      ? (data.market_signals as any[]).map((s: any) => s.signal || s.description || JSON.stringify(s)).slice(0, 5).join("; ")
      : "";

    return { keywords, niches, signals };
  } catch (e) {
    console.error("Failed to fetch live trends:", e);
    return null;
  }
}

const RECENT_PREMIUM_SALES = [
  { name: "Midnight.com", price: "$1.15M", niche: "Brandable" },
  { name: "C4.com", price: "$265k", niche: "Short" },
  { name: "Surface.ai", price: "$110k", niche: "AI/Tech" },
  { name: "Speed.ai", price: "$165k", niche: "AI/Tech" },
  { name: "Synthetic.ai", price: "$100k", niche: "AI/Tech" },
  { name: "Amber.ai", price: "$115k", niche: "AI/Tech" },
];

// ──────────────────────────────────────────────────────────────
// STYLE-SPECIFIC GUIDES — each style produces radically different output
// ──────────────────────────────────────────────────────────────

function getStyleGuide(style: string): string {
  switch (style) {
    case "investor_flip":
      return `SHORT, high-resale-potential domain names optimized for quick flipping.
Rules specific to this style:
- MAXIMUM 8 characters. Shorter = more valuable. 3-6 chars ideal.
- Trending keywords MUST be present: AI, agent, pay, code, data, cloud, cyber, quantum, neural, deep, clean, green, solar, crypto, chain, token, stake, swap, lend, yield.
- Two-word combos where BOTH words are short (3-4 chars each).
- Focus on .ai and .io TLDs — these have highest aftermarket markup.
- Think about what a domain investor would BUY at $50-100 and SELL for $1000-5000.
- Names should feel like they COULD be a real startup name tomorrow.
- Examples: CodeVex, AiNyx, PayForj, DataOrb, ChainPulse, DeepArc.`;
    case "premium_brand":
      return `PREMIUM invented/brandable names that sound like million-dollar startups.
Rules specific to this style:
- Coined/invented words ONLY — no real dictionary word combinations.
- Must be phonetically smooth: easy to say on a podcast, spell over the phone.
- Use linguistic techniques: consonant-vowel-consonant patterns, soft endings (-a, -o, -ia, -eo, -ova).
- Think: Spotify, Zillow, Notion, Vercel, Figma, Asana, Canva, Shopify.
- Each name should feel like it's worth $1M+ as a brand.
- Length: 5-8 characters ideal. No more than 10.
- Avoid anything that sounds technical or descriptive.
- Examples: Zolvara, Nexova, Prionyx, Quantia, Velmora, Synthari.`;
    case "keyword_rich":
      return `KEYWORD-RICH exact-match or partial-match domains with strong SEO and type-in traffic potential.
Rules specific to this style:
- The user's keyword MUST appear as a COMPLETE WORD in every name.
- Combine with descriptive modifiers: Best, Top, Smart, Pro, Expert, Guide, Find, Get, Compare, Review, Hub, Central, Direct, Online, Now.
- Names should clearly communicate what the business does.
- A customer should be able to guess the business from the domain name alone.
- Longer names (up to 15 chars) are fine if they're descriptive.
- Think: BestSolar, GetFitNow, SmartHomePro, FindLawyer, CompareLoans.
- Examples for "robotics": RoboticsHub, SmartRobots, ProRobotics, FindBots, RobotGuide, AutomateNow.`;
    case "expired_pattern":
      return `Domains that match COMMON DROP PATTERNS from expired domain auctions.
Rules specific to this style:
- Short dictionary words (4-6 chars) combined with trending TLD keywords.
- Two-word .coms under 12 chars total.
- Names that LOOK like they were once registered and expired — not too creative, more "solid".
- Real word combos that someone might have let expire: BlueVault, QuickTrade, SilverEdge.
- Patterns: [Adjective][Noun], [Noun][Noun], [Verb][Noun].
- Use everyday words: bright, swift, clear, prime, bold, true, steel, iron, oak, pine, storm.
- Examples: BoldForge, SwiftPeak, IronGate, ClearPath, PrimeDock, SteelCove.`;
    default:
      return `A strategic mix of ALL styles: 30% keyword-rich names using the user's exact keyword as prefix/suffix, 30% invented brandable names, 20% short flip candidates, 20% real-word combos. Every name must relate to the user's niche.`;
  }
}

// ──────────────────────────────────────────────────────────────
// BATCH ANGLES — 8 diverse angles, each with concrete word banks
// ──────────────────────────────────────────────────────────────

function getBatchAngles(style: string): string[] {
  // Serialize some word banks for the prompt
  const prefixSample = PREFIXES.sort(() => Math.random() - 0.5).slice(0, 40).join(", ");
  const suffixSample = SUFFIXES.sort(() => Math.random() - 0.5).slice(0, 40).join(", ");
  const modifierSample = MODIFIER_WORDS.sort(() => Math.random() - 0.5).slice(0, 30).join(", ");

  const baseAngles: string[] = [
    // Angle 1: KEYWORD AS PREFIX — user's keyword + suffix word
    `KEYWORD-AS-PREFIX: Take the user's EXACT keyword and append a suffix word to create a compound name. The keyword must appear IN FULL at the START of every name. Use these suffix words as inspiration (pick the best fits for the niche): ${suffixSample}. Generate 40 names like: [Keyword]Hub, [Keyword]Forge, [Keyword]Wave, [Keyword]Nest, [Keyword]Pulse, [Keyword]Craft. EVERY name starts with the user's keyword.`,

    // Angle 2: KEYWORD AS SUFFIX — prefix word + user's keyword
    `KEYWORD-AS-SUFFIX: Take a short prefix word and append the user's EXACT keyword at the END. The keyword must appear IN FULL at the END of every name. Use these prefix words (pick the best fits): ${prefixSample}. Generate 40 names like: Go[Keyword], My[Keyword], Pro[Keyword], Smart[Keyword], Swift[Keyword], True[Keyword]. EVERY name ends with the user's keyword.`,

    // Angle 3: INVENTED BRANDABLES rooted in the keyword
    `INVENTED BRANDABLE: Create coined, invented words that are phonetically rooted in the user's keyword or its synonyms. The name should FEEL related to the niche but be a completely new word. Use techniques: truncate + add suffix (-ova, -ix, -ara, -eon, -ium, -vex, -nyx), blend two related roots, swap vowels. If keyword is "solar", think: Solara, Solvix, Solium, Helionyx. Generate 40 unique coined names.`,

    // Angle 4: TWO-WORD COMBOS with modifier words
    `TWO-WORD COMBOS: Combine TWO short real words where at least one relates to the user's niche. Use these modifier words for the second word: ${modifierSample}. Patterns: [Niche]+[Modifier], [Modifier]+[Niche], [Adjective]+[NicheNoun], [Verb]+[NicheNoun]. For "robotics": BoldBot, SwiftGear, IronMech, KeenDroid. Generate 40 names, all niche-relevant.`,

    // Angle 5: VERB + NICHE action names
    `ACTION NAMES: Pair an action verb with a niche keyword or related noun. Use verbs: Launch, Build, Snap, Flip, Spark, Shift, Boost, Drive, Push, Dash, Rise, Lift, Surge, Craft, Forge, Make, Fuse, Link, Sync, Flex, Flow, Spin, Bolt, Jet, Rush, Kick, Pop, Tap, Zap. Also try REVERSED order: [Niche]Launch, [Niche]Forge, [Niche]Shift. Generate 40 names.`,

    // Angle 6: SHORT POWER NAMES (≤7 chars)
    `SHORT POWER NAMES: Generate ultra-short names (5-7 characters MAX) that combine a niche root with 2-3 letter suffixes or prefixes. Think premium aftermarket names. Use roots from the user's keyword + suffixes: -ly, -fy, -io, -go, -ex, -ix, -ox, -ar, -er, -al, -ia, -eo. Examples: Robly, Botix, Codex, Paygo, Finar. Generate 40 short names.`,

    // Angle 7: SYNONYM EXPANSION — explore the keyword's semantic field
    `SYNONYM EXPANSION: First brainstorm 15-20 synonyms, related terms, industry jargon, and semantically adjacent words for the user's keyword. Then use THOSE expanded words (not just the original keyword) to create names using prefixes/suffixes: ${prefixSample.split(", ").slice(0, 15).join(", ")} + ${suffixSample.split(", ").slice(0, 15).join(", ")}. This finds unexpected, creative combinations. Generate 40 names.`,

    // Angle 8: NATURE + ABSTRACT metaphorical names
    `METAPHORICAL NAMES: Create names that use metaphors from nature, science, or abstract concepts to represent the user's niche. Combine elements like: Nova, Apex, Zenith, Orbit, Prism, Echo, Aura, Ember, Flux, Drift, Tide, Storm, Frost, Bloom, Cedar, Sage + niche keywords or modifiers. The name should poetically evoke the industry without being literal. Generate 40 names.`,
  ];

  // For style-specific modes, add extra targeted angles
  if (style === "investor_flip") {
    baseAngles.push(
      `FLIP SPECIALS: Generate 40 names under 8 characters that combine trending keywords (AI, agent, pay, code, data, cloud, cyber, chain, swap, yield, lend, stake, token, mint, vault, trade, cash, fund) with the user's niche. Every name should feel like it would sell for 10-50x on the aftermarket within 12 months. Focus on .ai and .com potential.`
    );
  } else if (style === "keyword_rich") {
    baseAngles.push(
      `SEO DESCRIPTIVE: Generate 40 names where the user's keyword appears as a complete word, combined with SEO-friendly modifiers: Best, Top, Smart, Pro, Expert, Find, Get, Compare, Guide, Review, Hub, Central, Direct, Online, Now, Plus, Prime, First, Elite, Select, Choice, Rated, Trusted, Verified. Names should be self-explanatory — a customer should know what the site does from the domain alone.`
    );
  } else if (style === "premium_brand") {
    baseAngles.push(
      `LUXURY COINED: Generate 40 completely invented words (6-9 chars) with premium phonetic qualities. Use soft consonants (l, m, n, v, s), open vowels (a, o, i), and elegant endings (-ara, -ova, -ium, -eon, -ori, -avi, -ela, -ina, -ura). Each name must sound like a $10M startup. Root them in the user's niche using first syllable or consonant pattern from the keyword. No real English words.`
    );
  }

  return baseAngles;
}

async function generateBatch(
  LOVABLE_API_KEY: string,
  keywords: string,
  industry: string,
  style: string,
  inspiredByContext: string,
  batchAngle: string,
  batchIndex: number,
  liveTrends: { keywords: string; niches: string; signals: string } | null,
): Promise<any[]> {
  const styleGuide = getStyleGuide(style || "mixed");

  const trendingContext = liveTrends
    ? `
CURRENT MARKET TRENDS (Live Data — Feb 2026):
- Trending keywords (with heat multipliers): ${liveTrends.keywords}
- Hot niches: ${liveTrends.niches}
- Market signals: ${liveTrends.signals}
- Recent sales: ${RECENT_PREMIUM_SALES.map(s => `${s.name} (${s.price})`).join(", ")}
- Hot TLDs: .ai, .com, .io`
    : `
CURRENT MARKET TRENDS (Feb 2026):
- Hot keywords: Casino, Dog, Chat, Deep, Cash, Clean, Code, Beauty, Finance, Fire
- Trending: AI, Agent, Agentic, Pay, Claw, Neural, Quantum
- Recent sales: ${RECENT_PREMIUM_SALES.map(s => `${s.name} (${s.price})`).join(", ")}
- Hot TLDs: .ai, .com, .io`;

  const systemPrompt = `You are an elite domain name investment consultant. Generate high-value domain name suggestions.

STYLE GUIDE (follow this closely — it defines what KIND of names to generate):
${styleGuide}

${trendingContext}

CORE RULES:
- Names should be short (ideally 5-12 characters), though keyword-rich style allows up to 15
- Easy to spell and type
- No hyphens or numbers
- Return ONLY the name part WITHOUT any TLD (e.g. "Zolva" not "Zolva.com")
- CRITICAL: ALL names MUST be in English using ONLY ASCII Latin characters (a-z). No Unicode.
- CRITICAL: Names must be AVAILABLE FOR HAND REGISTRATION — truly novel combinations nobody has registered.

RELEVANCE RULES:
- EVERY name MUST be directly relevant to the user's keywords and industry. This is the #1 rule.
- Do NOT generate generic cool-sounding names that have no connection to the user's topic.
- Use the user's keywords, synonyms, or root morphemes in every name.

AVAILABILITY RULES:
- DO NOT suggest ANY standalone real English dictionary word — ALL single-word .coms are taken.
- DO NOT suggest names that sound like existing companies (Vercel, Stripe, Notion, etc.).
- INVENT genuinely novel combinations using misspellings, rare suffixes, phonetic blends, portmanteaus.
- Examples of GOOD (likely available): "Robivex", "BotForj", "GoSolarNyx", "CodeArcify"
- Examples of BAD (definitely taken): "CloudForge", "DataPulse", "SmartCore"

BATCH INSTRUCTIONS (follow these for THIS specific batch):
${batchAngle}

Generate exactly 40 unique names. Rate synergy (1-100) and trend_score (0-100). Each name must be DIFFERENT.`;

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
    const { keywords, industry, style, inspired_by, competitor_domains, batch_count, synonym_boost, premium_mode } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const liveTrends = await fetchLiveTrends();
    if (liveTrends) {
      console.log("Using live trend data from trending_market_data table");
    } else {
      console.log("Falling back to hardcoded trend data");
    }

    let inspiredByContext = "";
    if (premium_mode) {
      inspiredByContext += `\nPREMIUM MODE (HIGH PRIORITY): Generate names optimized for MAXIMUM aftermarket value and 10x+ flip potential. Rules:
- STRONGLY prefer names ≤8 characters total. Shorter = more valuable.
- Use premium coined suffixes: -vex, -nyx, -ova, -ara, -ium, -lex, -ori, -yx, -ion, -ix, -eo, -ia.
- Prioritize one-word coined names over two-word compounds.
- Use POWER ROOT WORDS: apex, prime, core, nexus, zen, vox, lux, nova, flux, arc, ion, orb, aero, cyber, quantum, stellar, omega.
- Combine power roots with the user's niche keywords.
- Every name should feel like a $10M startup.`;
    }
    if (synonym_boost) {
      inspiredByContext += `\nSYNONYM EXPANSION MODE: Before generating, brainstorm 15-20 synonyms, related terms, and semantically adjacent words for the user's keywords. Use BOTH original and expanded synonyms as building blocks.`;
    }
    if (inspired_by) {
      inspiredByContext = `\nThe user wants names INSPIRED BY "${inspired_by}". Analyze its structure and generate similar-quality names that are ACTUALLY LIKELY TO BE AVAILABLE.`;
    }
    if (competitor_domains) {
      inspiredByContext += `\nCOMPETITOR ANALYSIS MODE: Competitors use: ${competitor_domains}. Generate DIFFERENTIATED alternatives that stand out while staying in the same niche.`;
    }

    // Get style-specific batch angles
    const allAngles = getBatchAngles(style || "mixed");
    
    // Use fewer batches for "more like this" requests, otherwise use ALL angles
    const anglesToUse = batch_count === 1 ? [allAngles[0]] : allAngles;

    console.log(`Starting ${anglesToUse.length} parallel AI batches for domain generation (style: ${style || "mixed"})...`);
    const batchPromises = anglesToUse.map((angle, i) =>
      generateBatch(LOVABLE_API_KEY, keywords, industry || "", style || "mixed", inspiredByContext, angle, i, liveTrends)
    );

    const batchResults = await Promise.all(batchPromises);
    
    // Combine and deduplicate by lowercase name
    const asciiOnly = /^[a-zA-Z]+$/;
    const seen = new Set<string>();
    const allSuggestions: any[] = [];
    for (const batch of batchResults) {
      for (const s of batch) {
        const key = s.name.toLowerCase();
        if (!seen.has(key) && s.name.length > 0 && asciiOnly.test(s.name)) {
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
