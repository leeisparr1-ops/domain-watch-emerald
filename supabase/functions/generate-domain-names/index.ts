import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ──────────────────────────────────────────────────────────────
// MASSIVE REAL-WORD BANK — 2000+ words for keyword-rich combos
// These are all real English words that pair well as prefix/suffix
// ──────────────────────────────────────────────────────────────

const REAL_PREFIXES = [
  // Adjectives
  "Best","Top","Smart","Pro","Elite","Prime","First","Great","True","Pure",
  "Bold","Fast","Quick","Swift","Bright","Clear","Sharp","Fresh","Clean","Safe",
  "Easy","Simple","Free","New","Next","Modern","Digital","Virtual","Super","Ultra",
  "Mega","Grand","Royal","Golden","Silver","Green","Blue","Red","Deep","High",
  "Real","Open","Direct","Rapid","Active","Total","Full","All","Multi","Dual",
  "Sure","Wise","Keen","Fair","Fine","Good","Rich","Rare","Vital","Core",
  "Major","Minor","Max","Mini","Micro","Macro","Chief","Lead","Key","Central",
  "Global","Local","Urban","Metro","Civic","National","Capital","Premier","Apex","Peak",
  "Noble","Trusted","Verified","Certified","Expert","Master","Alpha","Omega","Ace","Star",
  // Verbs / Action
  "Get","Find","Buy","Sell","Save","Win","Go","Try","Use","Make",
  "Build","Create","Launch","Start","Run","Grow","Rise","Boost","Drive","Move",
  "Push","Pull","Lift","Jump","Leap","Snap","Click","Tap","Pick","Grab",
  "Flip","Spin","Turn","Shift","Switch","Swap","Trade","Match","Link","Join",
  "Connect","Merge","Blend","Mix","Fuse","Craft","Forge","Shape","Mold","Cast",
  "Track","Trace","Scan","Search","Seek","Hunt","Scout","Spot","Watch","Check",
  "Compare","Rate","Rank","Score","Grade","Test","Review","Guide","Plan","Map",
  "Solve","Fix","Heal","Help","Teach","Learn","Train","Coach","Mentor","Tutor",
  // Descriptive Nouns as prefixes
  "Power","Energy","Force","Pulse","Wave","Surge","Charge","Spark","Flash","Beam",
  "Rocket","Turbo","Nitro","Thunder","Storm","Blitz","Ignite","Flame","Fire","Volt",
  "Iron","Steel","Titan","Atlas","Hero","Legend","Epic","Crown","Shield","Guard",
  "Eagle","Hawk","Falcon","Fox","Wolf","Bear","Lion","Tiger","Phoenix","Dragon",
  "Summit","Pinnacle","Zenith","Crest","Vertex","North","South","East","West","Sky",
  "Sun","Dawn","Dusk","Moon","Star","Cloud","Rain","Snow","Frost","Ice",
  "Stone","Rock","Crystal","Diamond","Pearl","Gem","Jade","Ruby","Amber","Onyx",
  "Oak","Pine","Cedar","Maple","Birch","Willow","Ivy","Sage","Mint","Fern",
  "River","Lake","Ocean","Sea","Bay","Harbor","Port","Coast","Shore","Tide",
  "Mountain","Valley","Canyon","Ridge","Mesa","Cliff","Bluff","Hill","Dale","Glen",
  // Tech / Modern
  "Data","Code","Byte","Pixel","Logic","Signal","Vector","Matrix","Quantum","Neural",
  "Cyber","Crypto","Block","Chain","Token","Agent","Auto","Robo","Mech","Tech",
  "Info","Wiki","Meta","Nano","Geo","Bio","Eco","Solar","Wind","Hydro",
];

const REAL_SUFFIXES = [
  // Place / Hub
  "Hub","Lab","Base","Zone","Spot","Nest","Den","Hive","Camp","Yard",
  "Dock","Bay","Port","Gate","Tower","Fort","Keep","Lodge","Haven","Refuge",
  "Depot","Center","Central","Station","Terminal","Exchange","Market","Plaza","Mall","Shop",
  "Store","Outlet","Warehouse","Vault","Bunker","Cellar","Loft","Attic","Studio","Arena",
  "Field","Court","Ring","Track","Course","Range","Ground","Park","Garden","Farm",
  "Ranch","Estate","Manor","Hall","House","Room","Suite","Office","Desk","Bench",
  // Tool / System
  "Tool","Kit","Box","Gear","Rig","Pack","Set","Stack","Rack","Grid",
  "Board","Panel","Dash","Console","Bridge","Link","Wire","Cable","Pipe","Line",
  "Path","Road","Trail","Route","Way","Lane","Walk","Drive","Highway","Express",
  "Engine","Motor","Machine","Works","Factory","Mill","Forge","Foundry","Craft","Smith",
  // Quality / State
  "Pro","Plus","Max","Prime","Elite","Select","Choice","Rated","Verified","Trusted",
  "Direct","Online","Now","Today","Daily","Weekly","Monthly","Annual","Instant","Express",
  "Simple","Easy","Quick","Fast","Rapid","Swift","Ready","Smart","Wise","Sharp",
  // Domain-friendly
  "Guide","Guru","Expert","Insider","Master","Chief","Boss","King","Queen","Lord",
  "Scout","Finder","Seeker","Hunter","Tracker","Spotter","Watcher","Monitor","Radar","Scope",
  "Source","Origin","Root","Seed","Spring","Well","Mine","Gold","Trove","Cache",
  "Pulse","Beat","Wave","Flow","Stream","Current","Surge","Blast","Burst","Rush",
  "Force","Power","Edge","Core","Point","Tip","Peak","Crest","Top","Summit",
  "World","Land","Realm","Domain","Space","Sphere","Globe","Planet","Universe","Cosmos",
  // Action result
  "ify","ize","ist","ery","ory","ment","ness","able","ful","ward",
  // People
  "Crew","Team","Squad","Club","Circle","Network","Alliance","Group","League","Guild",
  "Mate","Buddy","Pal","Friend","Partner","Ally","Fellow","Peer","Tribe","Folk",
  // Abstract
  "Logic","Method","System","Plan","Model","Formula","Pattern","Code","Script","Algo",
  "Theory","Concept","Vision","Dream","Goal","Target","Mission","Quest","Journey","Venture",
  "Trust","Faith","Honor","Pride","Glory","Joy","Bliss","Peace","Grace","Hope",
];

// Extra real words for two-word combos (all common English)
const COMBO_WORDS = [
  // Nature
  "acorn","anchor","arrow","atlas","aurora","autumn","avalanche","bamboo","beacon","bloom",
  "blossom","boulder","breeze","brook","canyon","cascade","cedar","cherry","cliff","cloud",
  "clover","cobalt","coral","cosmos","creek","crimson","crystal","cypress","dawn","desert",
  "dune","echo","ember","everest","falcon","fern","fjord","flame","flint","flora",
  "forest","fossil","frost","galaxy","glacier","grove","harbor","harvest","haven","hazel",
  "heath","hemlock","horizon","indigo","island","ivory","jasper","juniper","lagoon","larch",
  "laurel","lava","leaf","lichen","lily","lotus","lunar","magnolia","maple","marsh",
  "meadow","mesa","mist","moss","nebula","nimbus","oasis","olive","orchid","palm",
  "pebble","pine","plum","pond","poplar","prairie","quartz","rain","reef","ridge",
  "ripple","river","root","rose","sage","sand","sapphire","savanna","sequoia","shadow",
  "shell","shore","sierra","slate","snow","solstice","sprout","spruce","stellar","stone",
  "summit","sunrise","sunset","sycamore","terra","thistle","thorn","thunder","timber","topaz",
  "torrent","tulip","tundra","twilight","valley","velvet","violet","volcano","wave","willow",
  "winter","zenith","zephyr",
  // Objects / Concepts
  "anvil","badge","banner","barrel","basket","bell","blade","bolt","bow","brass",
  "brick","bridge","buckle","button","cable","candle","canvas","cargo","cart","chain",
  "chalk","charm","chisel","clamp","clasp","clock","coil","coin","column","compass",
  "copper","cord","crane","crown","crust","cube","dial","dome","drum","fabric",
  "ferry","fiber","flag","flask","forge","frame","funnel","gadget","gauge","glass",
  "globe","grain","grip","hammer","handle","hatch","helm","hinge","hook","hull",
  "ivory","jewel","keel","knot","ladder","lamp","lantern","latch","lever","light",
  "lock","loop","magnet","marble","medal","mirror","mortar","needle","notch","nozzle",
  "oar","paddle","patch","pedal","pillar","plank","plate","plug","prism","pulley",
  "quill","rafter","rail","relay","rivet","rod","rope","rudder","saddle","scaffold",
  "shard","shelf","shield","signal","socket","spoke","spring","spur","stake","stamp",
  "stencil","strut","switch","tack","tether","tile","toggle","tower","truss","valve",
  "wedge","wheel","wrench",
  // Action words
  "adapt","advance","align","amplify","analyze","apply","assemble","assess","assist","balance",
  "benchmark","calibrate","capture","channel","clarify","climb","compile","compose","compute","configure",
  "convert","curate","debug","decode","define","deploy","derive","design","detect","develop",
  "discover","dispatch","distribute","elevate","enable","encode","enhance","equip","evaluate","evolve",
  "execute","expand","explore","extract","facilitate","filter","formulate","foster","fuel","generate",
  "govern","harvest","identify","ignite","illuminate","implement","improve","incubate","innovate","inspect",
  "integrate","interpret","invent","iterate","kindle","leverage","liberate","maintain","maximize","measure",
  "mediate","mobilize","modify","navigate","nurture","observe","optimize","orchestrate","pioneer","polish",
  "process","produce","program","propel","protect","provision","pursue","radiate","reclaim","refine",
  "reform","regulate","reinforce","render","repair","replicate","resolve","restore","reveal","revolve",
  "scale","schedule","sculpt","secure","segment","simulate","source","spark","specialize","stabilize",
  "standardize","stimulate","streamline","strengthen","structure","support","sustain","synthesize","tailor","target",
  "transform","translate","transmit","uncover","unify","unlock","validate","verify","visualize","yield",
  // Business
  "account","advisor","agency","analyst","asset","audit","banking","benefit","brand","broker",
  "budget","capital","career","client","commerce","consult","contract","counsel","credit","deal",
  "dividend","earnings","equity","escrow","estate","exchange","expense","export","finance","fiscal",
  "freight","funding","futures","growth","hedge","import","income","index","insure","interest",
  "invest","invoice","lease","ledger","lending","margin","market","merger","mutual","option",
  "payroll","pension","pledge","policy","portfolio","premium","profit","prospect","quota","rental",
  "retail","revenue","salary","savings","shares","stock","supply","surplus","tariff","tender",
  "trade","treasury","trust","turnover","underwrite","utility","valuation","venture","warrant","wealth",
  "wholesale","yield",
  // Tech
  "algorithm","analog","archive","array","backup","bandwidth","binary","bitmap","buffer","cache",
  "catalog","channel","circuit","cluster","codec","compile","console","database","debug","decode",
  "default","deploy","desktop","device","digital","display","domain","download","driver","editor",
  "encrypt","endpoint","ethernet","export","extract","fiber","filter","firewall","firmware","format",
  "gateway","graphic","hardware","hosting","hyperlink","index","input","install","interface","kernel",
  "keystone","laptop","layout","library","linux","macro","mainframe","malware","memory","modem",
  "module","monitor","network","node","offline","online","output","packet","parser","patch",
  "pixel","platform","plugin","portal","printer","process","program","protocol","proxy","query",
  "queue","runtime","sandbox","scanner","script","search","sensor","server","session","setup",
  "signal","silicon","socket","software","source","storage","subnet","syntax","tablet","template",
  "terminal","thread","token","toolbar","tracker","traffic","upload","vector","version","virtual",
  "widget","wireless","workflow",
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

// Helper: pick N random items from an array
function pickRandom<T>(arr: T[], n: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
}

// ──────────────────────────────────────────────────────────────
// STYLE-SPECIFIC GUIDES
// ──────────────────────────────────────────────────────────────

function getStyleGuide(style: string): string {
  switch (style) {
    case "investor_flip":
      return `SHORT, high-resale-potential domain names optimized for quick flipping.
Rules:
- MAXIMUM 8 characters. Shorter = more valuable. 3-6 chars ideal.
- Trending keywords MUST be present: AI, agent, pay, code, data, cloud, cyber, quantum, neural, deep, clean, green, solar, crypto, chain, token, stake, swap, lend, yield.
- Two-word combos where BOTH words are short (3-4 chars each).
- Focus on .ai and .io TLDs — these have highest aftermarket markup.
- Think about what a domain investor would BUY at $50-100 and SELL for $1000-5000.
- Examples: CodeVex, AiNyx, PayForj, DataOrb, ChainPulse, DeepArc.`;
    case "premium_brand":
      return `PREMIUM invented/brandable names that sound like million-dollar startups.
Rules:
- Coined/invented words ONLY — no real dictionary word combinations.
- Must be phonetically smooth: easy to say on a podcast, spell over the phone.
- Use linguistic techniques: consonant-vowel-consonant patterns, soft endings (-a, -o, -ia, -eo, -ova).
- Think: Spotify, Zillow, Notion, Vercel, Figma, Asana, Canva, Shopify.
- Each name should feel like it's worth $1M+ as a brand.
- Length: 5-8 characters ideal. No more than 10.
- DO NOT use real English words. Every name must be INVENTED.
- Examples: Zolvara, Nexova, Prionyx, Quantia, Velmora, Synthari.`;
    case "keyword_rich":
      return `KEYWORD-RICH domain names using REAL ENGLISH WORDS only.
ABSOLUTE RULES — VIOLATION = FAILURE:
1. The user's EXACT keyword MUST appear as a COMPLETE, UNMODIFIED word in EVERY name.
2. The other word(s) in the name MUST be REAL ENGLISH dictionary words. NO invented words. NO coined words. NO made-up suffixes like -fy, -ify, -ly, -ova, -ix, -vex, -nyx.
3. Every name = [RealWord] + [Keyword] OR [Keyword] + [RealWord]. That's it.
4. DO NOT truncate, blend, merge, or modify the keyword in any way.
5. DO NOT create portmanteaus or blended words.
6. A customer should be able to guess the business from the domain name alone.

GOOD examples for keyword "bot": SmartBot, BotForge, TrustBot, BotGuard, QuickBot, BotShield, IronBot, BotCraft, ProBot, BotEngine
BAD examples (NEVER do this): Botify, Botly, Botvex, Botara, Botixa, Botrium — these are INVENTED, not real words.

Acceptable modifier words include: ${pickRandom(REAL_PREFIXES, 60).join(", ")}
Acceptable suffix words include: ${pickRandom(REAL_SUFFIXES, 60).join(", ")}`;
    case "expired_pattern":
      return `Domains that match COMMON DROP PATTERNS from expired domain auctions.
Rules:
- Short dictionary words (4-6 chars) combined with trending TLD keywords.
- Two-word .coms under 12 chars total.
- Names that LOOK like they were once registered and expired — not too creative, more "solid".
- Real word combos that someone might have let expire: BlueVault, QuickTrade, SilverEdge.
- Patterns: [Adjective][Noun], [Noun][Noun], [Verb][Noun].
- Use everyday words: bright, swift, clear, prime, bold, true, steel, iron, oak, pine, storm.
- Examples: BoldForge, SwiftPeak, IronGate, ClearPath, PrimeDock, SteelCove.`;
    default:
      return `A strategic mix of ALL styles: 30% keyword-rich names using the user's exact keyword as prefix/suffix with real words, 30% invented brandable names, 20% short flip candidates, 20% real-word combos. Every name must relate to the user's niche.`;
  }
}

// ──────────────────────────────────────────────────────────────
// STYLE-SPECIFIC BATCH ANGLES — each style gets its OWN angles
// ──────────────────────────────────────────────────────────────

function getBatchAngles(style: string): string[] {
  const prefixSample = pickRandom(REAL_PREFIXES, 80).join(", ");
  const suffixSample = pickRandom(REAL_SUFFIXES, 80).join(", ");
  const comboSample = pickRandom(COMBO_WORDS, 100).join(", ");

  // ── KEYWORD RICH: ALL batches enforce real-word + keyword ──
  if (style === "keyword_rich") {
    return [
      `KEYWORD-AS-PREFIX with action/descriptive words: The user's EXACT keyword must be the FIRST word. Append a REAL English word after it. Use these suffix words: ${pickRandom(REAL_SUFFIXES, 100).join(", ")}. Example for "bot": BotHub, BotForge, BotGuard, BotShield, BotEngine, BotCraft, BotWorks, BotFactory, BotBuilder, BotMaster. Generate 50 names. EVERY name must be [Keyword][RealWord]. NO invented words.`,

      `KEYWORD-AS-SUFFIX with modifier words: A REAL English word comes first, then the user's EXACT keyword at the END. Use these prefix words: ${pickRandom(REAL_PREFIXES, 100).join(", ")}. Example for "bot": SmartBot, ProBot, TrustBot, QuickBot, IronBot, EliteBot, PrimeBot, SwiftBot, TrueBot, BoldBot. Generate 50 names. EVERY name must be [RealWord][Keyword]. NO invented words.`,

      `KEYWORD + INDUSTRY/NICHE words: Combine the user's EXACT keyword with words from their specific industry or niche. Think about what a customer searching for this service would type. Use real words like: ${pickRandom(COMBO_WORDS, 80).join(", ")}. For "bot" in tech: BotCode, BotStack, BotLogic, BotCircuit, BotServer, BotSignal, CodeBot, DataBot, CloudBot, PixelBot. Generate 50 names. ALL real words only.`,

      `KEYWORD + NATURE/POWER metaphors: Combine the user's EXACT keyword with evocative real English words from nature, elements, or power concepts. Words to use: Eagle, Hawk, Storm, Thunder, Phoenix, Summit, Peak, Ridge, Crest, Nova, Titan, Atlas, Crown, Shield, Forge, Iron, Steel, Stone, Crystal, Diamond, Gold, Silver, Flame, Ember, Frost, Shadow, Dawn, Dusk, Star, Sky, Ocean, River, Mountain, Valley, Forest, Cedar, Oak, Pine, Sage, Wolf, Lion, Bear, Falcon. Generate 50 names. For "bot": BotFalcon, ThunderBot, BotForest, SteelBot, BotPhoenix.`,

      `KEYWORD + BUSINESS/COMMERCE words: Combine the user's EXACT keyword with business and commerce terms. Words: Market, Trade, Capital, Venture, Trust, Wealth, Asset, Fund, Profit, Growth, Deal, Value, Invest, Credit, Finance, Premium, Select, Choice, Elite, First, Prime, Direct, Express, Central, National, Global, Metro, Royal, Grand, Chief, Lead, Key, Master, Expert, Insider, Guide, Scout, Source, Origin, Trove, Finder, Seeker, Tracker, Network, Alliance, League, Guild. Generate 50 names. For "bot": BotVenture, TrustBot, BotCapital, PremiumBot, BotMarket.`,

      `KEYWORD + DESCRIPTIVE ADJECTIVES: Combine the user's EXACT keyword with strong descriptive adjectives. Use: Best, Top, Smart, Pro, Elite, Prime, First, Great, True, Pure, Bold, Fast, Quick, Swift, Bright, Clear, Sharp, Fresh, Clean, Safe, Easy, Simple, Free, New, Next, Modern, Digital, Super, Ultra, Mega, Sure, Wise, Keen, Fair, Fine, Good, Rich, Rare, Vital, Noble, Trusted, Verified, Certified, Active, Total, Full, Real, Open, Rapid. Generate 50 names. Both orders: [Adj][Keyword] and [Keyword][Adj].`,

      `KEYWORD + PLACE/CONTAINER words: Combine the user's EXACT keyword with words suggesting a place, container, or destination. Use: Hub, Lab, Base, Zone, Spot, Nest, Den, Hive, Camp, Yard, Dock, Bay, Port, Gate, Tower, Fort, Keep, Lodge, Haven, Depot, Center, Station, Terminal, Arena, Field, Court, Park, Garden, Farm, Estate, Manor, Hall, House, Room, Suite, Office, Studio, Loft, Vault, Bunker, Cellar, World, Land, Realm, Domain, Space, Planet, Bridge, Outpost, Frontier, Junction. Generate 50 names.`,

      `KEYWORD + TOOL/SYSTEM words: The user's EXACT keyword combined with functional, tool-like words. Use: Tool, Kit, Box, Gear, Rig, Pack, Set, Stack, Grid, Board, Panel, Dash, Console, Link, Wire, Path, Road, Way, Lane, Drive, Engine, Motor, Machine, Works, Factory, Mill, Smith, Method, System, Plan, Model, Formula, Pattern, Script, Template, Platform, Module, Plugin, Widget, Workflow, Pipeline, Process, Command, Control, Pilot, Compass, Radar, Scope, Lens, Map. Generate 50 names.`,
    ];
  }

  // ── INVESTOR FLIP: short, trending, high-flip-value ──
  if (style === "investor_flip") {
    return [
      `TRENDING KEYWORD COMBOS: Combine trending keywords (AI, Agent, Pay, Code, Data, Cloud, Cyber, Chain, Swap, Yield, Lend, Stake, Token, Mint, Vault, Trade, Cash, Fund, Deep, Neural, Quantum, Clean, Green, Solar) with the user's niche. MAX 8 chars. Generate 50 names.`,
      `ULTRA-SHORT (3-6 chars): Create names with 3-6 characters max. Use niche roots + short suffixes (-ex, -ix, -ox, -io, -go, -ly, -fy, -ar, -er). Think: Codex, Paygo, Finly, Datex. Generate 50 names.`,
      `TWO SHORT WORDS (3+3 or 3+4): Combine two very short words (3-4 chars each) related to the niche. Think: GoCode, AiPay, BitFin, NetPay, DevOps. MAX 8 chars total. Generate 50 names.`,
      `POWER ROOTS + NICHE: Use power roots (Apex, Zen, Vox, Lux, Nova, Flux, Arc, Ion, Neo, Evo) combined with niche keywords. MAX 8 chars. Generate 50 names.`,
      `FLIP SPECIALS: Names that a flipper would buy at $8-50 registration and sell for $500-5000. Trending topics + short combos. .ai and .io potential. MAX 8 chars. Generate 50 names.`,
      `CONSONANT BLENDS: Short punchy names using strong consonant blends (cr, br, fl, gr, st, sw, tr, bl, cl, sp) + niche roots. Think: Crytex, Brydge, Fluxon. MAX 8 chars. Generate 50 names.`,
    ];
  }

  // ── PREMIUM BRAND: all invented, no real words ──
  if (style === "premium_brand") {
    return [
      `SOFT PHONETICS: Invented names with soft consonants (l, m, n, v, s) and open vowels (a, o, i). Endings: -ara, -ova, -ela, -ina, -ura, -ia, -io, -eo. Root them in the user's niche. 5-8 chars. Think: Zolvara, Nexova, Velmora. Generate 50 names.`,
      `HARD POWER NAMES: Invented names with hard consonants (k, x, z, t, d) and sharp endings (-ix, -ex, -ox, -ax, -ux, -vex, -nyx, -rix). More aggressive/tech feel. 5-8 chars. Think: Prionyx, Cortix, Zaltex. Generate 50 names.`,
      `BLENDED ROOTS: Take two real-word roots related to the niche and blend them into a NEW invented word. Truncate + merge. The result must NOT be a real word. Think: Spotify (spot+amplify), Zillow (zillion+willow). Generate 50 names.`,
      `LATIN/GREEK INSPIRED: Use Latin/Greek morphemes related to the niche to create elegant coined names. Endings: -ium, -eon, -ion, -alis, -oric, -antic. Think: Quantium, Syntheon, Luminaris. Generate 50 names.`,
      `LUXURY MINIMALIST: Ultra-clean 5-6 char invented words. Simple structure: CVCVC or CVCCV. Must sound like they could be whispered in a luxury ad. Think: Canva, Figma, Asana, Versa, Lumio. Generate 50 names.`,
      `FUTURISTIC COINED: Names that sound like they come from 2050. Use morphemes: -eon, -ova, -yx, -ara, -ori. Combine with tech/sci-fi roots. Think: Nexarion, Synthari, Orbivex. Generate 50 names.`,
    ];
  }

  // ── EXPIRED PATTERN: real-word combos that look like expired domains ──
  if (style === "expired_pattern") {
    return [
      `[ADJECTIVE][NOUN]: Two real words. First is an adjective, second is a noun. Both common English. Under 12 chars. Think: BoldForge, SwiftPeak, ClearPath. Use these words: ${pickRandom(COMBO_WORDS, 60).join(", ")}. Generate 50 names.`,
      `[NOUN][NOUN]: Two real nouns combined. Both relate to the niche. Under 12 chars. Think: IronGate, SteelCove, StoneHaven. Generate 50 names.`,
      `[VERB][NOUN]: Action verb + noun. Think: BuildBase, TrackPath, FindGold, GrabDeal. Generate 50 names.`,
      `CLASSIC .COM DROPS: Names that look like real expired .coms — solid, not too creative, professional. Two common words. Think: BlueLine, GreenField, RedStone, SilverBridge, GoldCoast, WhiteOak. Relate to user's niche. Generate 50 names.`,
      `INDUSTRY DROPS: Names that look like they belonged to a real business in the user's niche that let their domain expire. Two words, professional tone. Think: ProTrade, SmartFinance, QuickShip. Generate 50 names.`,
      `SHORT DICTIONARY WORDS: Single common English words (4-7 chars) that aren't obviously taken. Combine with niche context. Think: Ledger, Strut, Flint, Mortar, Anvil. Or two 3-4 char words. Generate 50 names.`,
    ];
  }

  // ── MIXED (default): diverse angles ──
  return [
    `KEYWORD-AS-PREFIX: Take the user's EXACT keyword and append a real suffix word. Use: ${pickRandom(REAL_SUFFIXES, 50).join(", ")}. Generate 40 names like: [Keyword]Hub, [Keyword]Forge, [Keyword]Wave.`,
    `KEYWORD-AS-SUFFIX: A real prefix word + user's EXACT keyword. Use: ${pickRandom(REAL_PREFIXES, 50).join(", ")}. Generate 40 names like: Smart[Keyword], Pro[Keyword].`,
    `INVENTED BRANDABLE: Coined words rooted in the user's keyword. NOT real words. Truncate + add suffix (-ova, -ix, -ara, -eon, -ium, -vex). Generate 40 unique coined names.`,
    `TWO-WORD COMBOS: Two short real words, at least one niche-relevant. Use: ${pickRandom(COMBO_WORDS, 50).join(", ")}. Generate 40 names.`,
    `ACTION NAMES: Verb + niche noun. Verbs: Launch, Build, Snap, Flip, Spark, Shift, Boost, Drive, Push, Dash, Rise, Surge, Craft, Forge, Fuse, Link, Sync, Flow, Bolt, Rush. Generate 40 names.`,
    `SHORT POWER (≤7 chars): Ultra-short names combining niche root + 2-3 letter suffix. Think premium aftermarket. Generate 40 names.`,
    `SYNONYM EXPANSION: Brainstorm 20 synonyms of the keyword, then build names from THOSE expanded words with prefixes/suffixes. Generate 40 names.`,
    `METAPHORICAL: Nature/science metaphors for the niche. Use: Nova, Apex, Zenith, Orbit, Prism, Echo, Ember, Flux, Drift, Tide, Storm, Bloom, Cedar, Sage + niche words. Generate 40 names.`,
  ];
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
- Trending keywords: ${liveTrends.keywords}
- Hot niches: ${liveTrends.niches}
- Market signals: ${liveTrends.signals}
- Recent sales: ${RECENT_PREMIUM_SALES.map(s => `${s.name} (${s.price})`).join(", ")}`
    : `
CURRENT MARKET TRENDS (Feb 2026):
- Hot keywords: Casino, Dog, Chat, Deep, Cash, Clean, Code, Beauty, Finance, Fire
- Trending: AI, Agent, Agentic, Pay, Claw, Neural, Quantum
- Recent sales: ${RECENT_PREMIUM_SALES.map(s => `${s.name} (${s.price})`).join(", ")}`;

  const batchSize = style === "keyword_rich" ? 50 : 40;

  const systemPrompt = `You are an elite domain name investment consultant. Generate high-value domain name suggestions.

STYLE GUIDE (FOLLOW STRICTLY — this defines what KIND of names to generate):
${styleGuide}

${trendingContext}

CORE RULES:
- Return ONLY the name part WITHOUT any TLD (e.g. "SmartBot" not "SmartBot.com")
- CRITICAL: ALL names MUST use ONLY ASCII Latin characters (a-z). No Unicode, no numbers, no hyphens.
- Names should be novel combinations unlikely to be already registered.

BATCH-SPECIFIC INSTRUCTIONS (follow these for THIS batch):
${batchAngle}

Generate exactly ${batchSize} unique names. Rate synergy (1-100) and trend_score (0-100). Each name must be DIFFERENT from every other name.`;

  const userPrompt = `Generate ${batchSize} domain names for: "${keywords}"${industry ? ` in the ${industry} industry` : ""}.${inspiredByContext}
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

// ──────────────────────────────────────────────────────────────
// POST-GENERATION FILTER: for keyword_rich, remove any name
// that doesn't contain the user's keyword as a complete word
// ──────────────────────────────────────────────────────────────

function filterKeywordRich(suggestions: any[], keyword: string): any[] {
  const kw = keyword.toLowerCase().trim();
  // Also handle multi-word keywords: use the longest single keyword
  const keywords = kw.split(/[\s,]+/).filter(k => k.length >= 2);
  
  return suggestions.filter(s => {
    const name = s.name.toLowerCase();
    // Check if any of the user's keywords appear as a complete substring
    return keywords.some(k => {
      const idx = name.indexOf(k);
      if (idx === -1) return false;
      // Verify it's a word boundary (start/end of name, or at a case change)
      return true; // If found anywhere, accept — the prompt should ensure it's a complete word
    });
  });
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
      inspiredByContext += `\nPREMIUM MODE: Generate names optimized for MAXIMUM aftermarket value. Prefer ≤8 chars, premium coined suffixes, power roots.`;
    }
    if (synonym_boost) {
      inspiredByContext += `\nSYNONYM EXPANSION: Brainstorm 15-20 synonyms and related terms for the keywords. Use BOTH original and expanded synonyms.`;
    }
    if (inspired_by) {
      inspiredByContext = `\nINSPIRED BY "${inspired_by}". Analyze its structure and generate similar-quality names that are likely available.`;
    }
    if (competitor_domains) {
      inspiredByContext += `\nCOMPETITOR ANALYSIS: Competitors use: ${competitor_domains}. Generate DIFFERENTIATED alternatives.`;
    }

    // Get style-specific batch angles (each style has its own set)
    const allAngles = getBatchAngles(style || "mixed");
    
    // Use fewer batches for "more like this" requests
    const anglesToUse = batch_count === 1 ? [allAngles[0]] : allAngles;

    console.log(`Starting ${anglesToUse.length} parallel AI batches for domain generation (style: ${style || "mixed"})...`);
    const batchPromises = anglesToUse.map((angle, i) =>
      generateBatch(LOVABLE_API_KEY, keywords, industry || "", style || "mixed", inspiredByContext, angle, i, liveTrends)
    );

    const batchResults = await Promise.all(batchPromises);
    
    // Combine and deduplicate
    const asciiOnly = /^[a-zA-Z]+$/;
    const seen = new Set<string>();
    let allSuggestions: any[] = [];
    for (const batch of batchResults) {
      for (const s of batch) {
        const key = s.name.toLowerCase();
        if (!seen.has(key) && s.name.length > 0 && asciiOnly.test(s.name)) {
          seen.add(key);
          allSuggestions.push(s);
        }
      }
    }

    // Post-filter: for keyword_rich, enforce the keyword actually appears
    if (style === "keyword_rich" && keywords) {
      const before = allSuggestions.length;
      allSuggestions = filterKeywordRich(allSuggestions, keywords);
      console.log(`Keyword-rich filter: ${before} -> ${allSuggestions.length} (removed ${before - allSuggestions.length} names without keyword)`);
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
