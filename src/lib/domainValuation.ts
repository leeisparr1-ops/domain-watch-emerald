import { checkTrademarkRisk, type TrademarkResult } from "@/lib/trademarkCheck";

// ─── DATA SETS ───

export const PREMIUM_TLDS: Record<string, number> = {
  com: 25, net: 14, org: 13, io: 16, ai: 18, co: 14, app: 12, dev: 11, me: 9, xyz: 5, info: 4, biz: 3,
};

export const PREMIUM_KEYWORDS = new Set([
  "ai", "crypto", "cloud", "tech", "pay", "bet", "buy", "sell", "trade", "bank", "cash", "loan",
  "health", "fit", "auto", "car", "home", "solar", "green", "data", "code", "web", "app", "game",
  "shop", "store", "deal", "sale", "food", "travel", "hotel", "dating", "jobs", "news", "legal",
  "quantum", "meta", "cyber", "robot", "drone", "space", "block", "chain", "fintech", "saas",
  "defi", "token", "intel", "logic", "matrix", "pixel", "forge", "core", "hub", "lab",
  "stack", "flow", "grid", "sync", "bolt", "shift", "spark", "edge", "apex", "nova",
]);

export const PENALTY_KEYWORDS = new Set([
  "viagra", "cialis", "porn", "sex", "xxx", "casino", "gambling", "weed", "marijuana",
  "pharma", "drug", "pill", "medication", "prescription", "erectile", "penis", "nude",
  "naked", "adult", "escort", "bitcoin", "ethereum", "nft", "forex", "mlm", "scam",
  "hack", "crack", "pirate", "torrent", "replica", "fake", "counterfeit",
]);

export const DICTIONARY_WORDS = new Set([
  // Action verbs
  "delete", "control", "access", "launch", "boost", "build", "create", "design", "drive", "enable",
  "execute", "expand", "explore", "focus", "gather", "guard", "handle", "ignite", "impact", "import",
  "export", "invest", "manage", "master", "measure", "merge", "monitor", "multiply", "navigate", "observe",
  "operate", "optimize", "order", "perform", "permit", "power", "predict", "process", "produce", "protect",
  "provide", "publish", "purchase", "pursue", "qualify", "recover", "reduce", "refine", "refresh", "release",
  "render", "repair", "replace", "report", "request", "require", "rescue", "resolve", "respond", "restore",
  "retain", "reveal", "review", "reward", "rotate", "satisfy", "schedule", "secure", "select", "simplify",
  "solve", "supply", "support", "sustain", "target", "track", "transfer", "transform", "trigger", "unlock",
  "update", "upgrade", "upload", "verify", "connect", "deliver", "discover", "evolve", "generate",
  "accelerate", "achieve", "activate", "adapt", "adjust", "advance", "allocate", "analyze", "apply",
  "approve", "arrange", "assemble", "assist", "calculate", "calibrate", "capture", "celebrate",
  "challenge", "classify", "collaborate", "communicate", "compile", "compose", "conclude", "configure",
  "consolidate", "construct", "contribute", "coordinate", "customize", "debug", "dedicate", "demonstrate",
  "deploy", "describe", "detect", "develop", "diagnose", "distribute", "document", "dominate", "download",
  "duplicate", "educate", "elaborate", "elevate", "eliminate", "embrace", "empower", "encourage",
  "engineer", "enhance", "enlighten", "enrich", "establish", "evaluate", "examine", "exchange",
  "experiment", "facilitate", "forecast", "formulate", "guarantee", "identify", "illustrate",
  "implement", "improve", "incorporate", "increase", "indicate", "influence", "inform", "initialize",
  "innovate", "inspect", "install", "integrate", "interpret", "introduce", "investigate", "iterate",
  "justify", "leverage", "liberate", "locate", "maintain", "manipulate", "manufacture", "maximize",
  "mediate", "minimize", "mobilize", "moderate", "motivate", "negotiate", "normalize", "notify",
  "orchestrate", "organize", "originate", "overcome", "participate", "penetrate", "persuade",
  "populate", "prescribe", "preserve", "prioritize", "progress", "promote", "prospect", "prototype",
  "quantify", "radiate", "recognize", "recommend", "reconcile", "recruit", "redesign", "regulate",
  "reinforce", "relocate", "replicate", "represent", "research", "restructure", "retrieve",
  "revolutionize", "safeguard", "simulate", "specialize", "stabilize", "standardize", "stimulate",
  "strategize", "streamline", "strengthen", "structure", "subscribe", "summarize", "supervise",
  "synchronize", "synthesize", "terminate", "tolerate", "transcend", "translate", "transmit",
  "troubleshoot", "validate", "visualize",
  // Nouns
  "account", "action", "alert", "anchor", "answer", "archive", "arena", "asset", "atlas", "audio",
  "badge", "balance", "banner", "barrel", "barrier", "basket", "beacon", "benefit", "billion", "blade",
  "blanket", "blend", "block", "board", "bonus", "bottle", "bounce", "brain", "branch", "bridge",
  "bright", "broker", "budget", "buffer", "bundle", "burden", "button", "canvas", "capital", "capsule",
  "capture", "carbon", "cargo", "castle", "center", "central", "chamber", "champion", "channel", "chapter",
  "charge", "charter", "circle", "claim", "clarity", "climate", "clinic", "cluster", "coach", "collect",
  "column", "combine", "comfort", "command", "commerce", "compare", "compass", "complete", "concept",
  "confirm", "console", "contact", "content", "context", "convert", "copper", "corner", "counter",
  "couple", "courage", "cover", "credit", "crisis", "crown", "crystal", "culture", "current", "curve",
  "custom", "cycle", "daily", "danger", "decade", "define", "demand", "dental", "deposit", "desert",
  "detail", "device", "dialog", "diamond", "digital", "direct", "display", "divide", "domain", "double",
  "dragon", "dream", "economy", "effect", "effort", "element", "emerge", "empire", "energy", "engine",
  "enjoy", "enough", "entire", "entity", "equity", "escape", "estate", "event", "exact", "exceed",
  "exchange", "exhibit", "express", "extend", "fabric", "factor", "falcon", "family", "fashion",
  "feature", "figure", "filter", "finance", "finder", "finger", "finish", "fiscal", "flame", "flash",
  "fleet", "flight", "float", "floor", "flower", "fluid", "force", "forest", "format", "fortune",
  "forum", "fossil", "frame", "freedom", "freight", "front", "frozen", "future", "galaxy", "garden",
  "gather", "genius", "gentle", "giant", "glacier", "glass", "globe", "golden", "govern", "grace",
  "grade", "grain", "grand", "grant", "graph", "gravity", "ground", "growth", "guide", "guitar",
  "habitat", "harbor", "harvest", "haven", "hazard", "health", "height", "helmet", "hidden", "honor",
  "horizon", "humble", "hunter", "hybrid", "ideal", "image", "immune", "impact", "import", "income",
  "index", "indoor", "infant", "inner", "input", "insert", "inside", "instant", "intent", "invest",
  "island", "ivory", "jacket", "jewel", "joint", "journal", "journey", "judge", "jungle", "junior",
  "justice", "kernel", "kingdom", "knight", "ladder", "lambda", "landed", "laptop", "launch", "layer",
  "leader", "league", "legacy", "legend", "leisure", "lesson", "letter", "level", "lever", "liberty",
  "light", "limit", "linear", "liquid", "lively", "logic", "lunar", "luxury", "machine", "magnet",
  "maiden", "manner", "manual", "margin", "marine", "market", "marvel", "master", "matrix", "matter",
  "meadow", "medal", "medium", "memory", "mental", "mentor", "method", "metric", "middle", "mighty",
  "million", "mineral", "mirror", "mission", "mobile", "model", "modern", "modest", "module", "moment",
  "motion", "motive", "mountain", "muscle", "museum", "mutual", "mystery", "narrow", "nation", "native",
  "nature", "needle", "neural", "neutral", "noble", "normal", "notion", "novel", "number", "object",
  "obtain", "occur", "ocean", "office", "online", "option", "oracle", "orbit", "organic", "origin",
  "outer", "output", "outreach", "oxygen", "package", "palace", "panel", "parent", "partner", "patent",
  "pattern", "payout", "people", "permit", "person", "phrase", "pilot", "pioneer", "planet", "plasma",
  "platform", "player", "pledge", "pocket", "poetry", "point", "policy", "portal", "portion", "poster",
  "potent", "powder", "prayer", "prefix", "premium", "primal", "prince", "print", "prison", "private",
  "profit", "program", "promise", "prompt", "proper", "protein", "proven", "public", "puzzle", "python",
  "radius", "random", "ranger", "rapid", "rattle", "reason", "rebel", "record", "reform", "refuge",
  "region", "relief", "remote", "rental", "rescue", "reserve", "resort", "result", "retail", "return",
  "reveal", "revenue", "ribbon", "rider", "rifle", "river", "rocket", "royal", "rubber", "runner",
  "sacred", "safety", "sample", "savage", "scenic", "scheme", "school", "science", "scope", "screen",
  "script", "search", "season", "second", "secret", "sector", "senior", "sensor", "series", "server",
  "service", "session", "settle", "shadow", "shield", "signal", "silver", "simple", "single", "sketch",
  "social", "socket", "source", "sphere", "spider", "spirit", "splash", "stable", "status", "steady",
  "steam", "steel", "storm", "story", "stream", "street", "strike", "string", "studio", "submit",
  "summit", "supply", "surface", "surge", "surplus", "survey", "switch", "symbol", "system", "tablet",
  "talent", "temple", "tender", "tensor", "terrain", "thread", "throne", "ticket", "timber", "tissue",
  "title", "toggle", "tongue", "topic", "tower", "track", "trail", "trait", "trend", "tribal",
  "triple", "trophy", "tunnel", "turbo", "twelve", "unique", "united", "unity", "upper", "urban",
  "urgent", "useful", "valley", "value", "vapor", "vector", "vendor", "venture", "verify", "vessel",
  "viable", "video", "vigor", "virtue", "vision", "visual", "vital", "vocal", "volume", "voyage",
  "wallet", "wealth", "weapon", "weekly", "weight", "window", "winter", "wisdom", "wonder", "worker",
  "worthy",
  // ─── EXPANDED: commonly missed compound-word parts & longer words ───
  "chemist", "chemistry", "intelligence", "intelligent", "motivation", "motivate",
  "adventure", "adventurous", "affordable", "agriculture", "ambassador", "analysis",
  "analyst", "animation", "anniversary", "announcement", "apartment", "application",
  "appointment", "architect", "architecture", "atmosphere", "authority", "automobile",
  "background", "beautiful", "beginning", "benchmark", "biography", "blueprint",
  "brilliant", "broadcast", "butterfly", "calculate", "calendar", "candidate",
  "capability", "catalogue", "cathedral", "celebrity", "character", "chocolate",
  "chronicle", "circumstance", "classroom", "clearance", "collection", "commentary",
  "commission", "commitment", "committee", "community", "companion", "comparison",
  "competition", "competitor", "complexity", "component", "composition", "computer",
  "conclusion", "condition", "conference", "confidence", "confident", "connection",
  "conscious", "consensus", "consequence", "consultant", "consumer", "container",
  "continent", "contract", "contractor", "convention", "conversation", "conviction",
  "corporate", "correction", "correspond", "counselor", "craftsman", "credential",
  "criterion", "curiosity", "curriculum", "dangerous", "dashboard", "database",
  "daughter", "deadline", "december", "decision", "decorator", "dedicated",
  "defendant", "defensive", "definite", "delicious", "delivery", "democrat",
  "department", "dependent", "designer", "desperate", "detective", "determine",
  "developer", "diagnosis", "dialogue", "different", "difficult", "dimension",
  "dinosaur", "direction", "director", "disaster", "discipline", "discount",
  "discovery", "disorder", "distance", "distinct", "district", "dividend",
  "document", "domestic", "dominant", "download", "dramatic", "durable",
  "dynamics", "earnings", "economic", "ecosystem", "education", "educator",
  "effective", "efficient", "election", "electric", "electron", "elephant",
  "elevator", "emergency", "emission", "emotional", "emphasis", "employee",
  "employer", "encounter", "endeavor", "endurance", "engineer", "enormous",
  "ensemble", "enterprise", "entertain", "enthusiast", "entrance", "envelope",
  "environment", "equipment", "essential", "establish", "estimate", "evidence",
  "evolution", "excellent", "exception", "exclusive", "executive", "exercise",
  "existence", "expansion", "expensive", "experience", "experiment", "expertise",
  "explosion", "extension", "external", "extreme", "facility", "familiar",
  "fantastic", "favorite", "festival", "fiction", "financial", "firewall",
  "flexible", "football", "forecast", "foreign", "formation", "formula",
  "foundation", "framework", "franchise", "frequency", "friction", "frontier",
  "function", "furniture", "generate", "generator", "generous", "genuine",
  "geography", "geometric", "gesture", "girlfriend", "global", "gorgeous",
  "graduate", "grandchild", "grateful", "guardian", "guidance", "guideline",
  "handcraft", "handbook", "happiness", "hardware", "headline", "healthcare",
  "heritage", "highlight", "historic", "homeland", "homework", "hospital",
  "household", "hurricane", "hydrogen", "ignorance", "imagine", "immediate",
  "immigrant", "important", "imposing", "impression", "incident", "inclusion",
  "incredible", "independent", "indicator", "individual", "industry", "infection",
  "infinite", "inflation", "influence", "informal", "ingredient", "inherent",
  "injection", "innocent", "innovation", "inspector", "inspiration", "instance",
  "institute", "instrument", "insurance", "integrity", "intention", "interest",
  "interior", "internal", "internet", "interval", "interview", "intimate",
  "invasion", "invention", "investor", "invisible", "isolated", "landmark",
  "landscape", "language", "latitude", "lavender", "learning", "leather",
  "lemonade", "leverage", "lifetime", "lighting", "likewise", "limestone",
  "literary", "literary", "location", "magnetic", "mainland", "majority",
  "marathon", "material", "mechanic", "medicine", "medieval", "midnight",
  "military", "momentum", "mortgage", "movement", "multiple", "navigate",
  "negative", "neighbor", "nitrogen", "notebook", "november", "numerous",
  "obstacle", "occasion", "offering", "official", "offshore", "operator",
  "opponent", "opposite", "ordinary", "original", "outbreak", "overcome",
  "overview", "painting", "parallel", "passport", "patience", "peaceful",
  "peculiar", "pedagogy", "pension", "perceive", "percent", "personal",
  "perspective", "petition", "pharmacy", "physical", "pleasant", "pleasure",
  "plumbing", "politics", "positive", "possible", "postcard", "potassium",
  "potential", "powerful", "practice", "precious", "presence", "president",
  "pressure", "previous", "princess", "principal", "priority", "probable",
  "probable", "producer", "product", "profound", "progress", "project",
  "prolific", "property", "proposal", "prospect", "provider", "province",
  "purchase", "question", "railroad", "reaction", "readable", "receiver",
  "recovery", "referral", "relation", "relative", "relevant", "reliable",
  "religion", "remember", "reminder", "renowned", "reporter", "republic",
  "research", "resident", "resource", "response", "restrict", "revision",
  "roadster", "romantic", "rotation", "sandwich", "saturday", "scenario",
  "schedule", "scientist", "security", "semester", "sentence", "separate",
  "sequence", "sergeant", "shepherd", "shipping", "shooting", "shortage",
  "shoulder", "sidewalk", "signature", "silicone", "skeleton", "snowflake",
  "software", "solution", "somebody", "southern", "specific", "spectrum",
  "sporting", "standard", "standing", "starship", "starting", "strategy",
  "strength", "stronger", "stronger", "struggle", "stunning", "suburban",
  "suitable", "sunlight", "superior", "surprise", "survival", "survivor",
  "symbolic", "sympathy", "teaching", "teammate", "teammate", "technique",
  "teenager", "telegram", "template", "terminal", "thinking", "thousand",
  "together", "tomorrow", "topology", "tracking", "training", "treasure",
  "triangle", "tropical", "tutorial", "ultimate", "umbrella", "uncommon",
  "underway", "universe", "unlikely", "upcoming", "vacation", "validate",
  "valuable", "variable", "vertical", "vigilant", "volatile", "volcanic",
  "volition", "whatever", "wireless", "workshop", "yourself",
  // Short powerful words (1-5 letters)
  "ace", "aim", "all", "arc", "arm", "ask", "axe", "bar", "bay", "bid",
  "bit", "bow", "bud", "bus", "cab", "cam", "cap", "clue", "cog", "cow", "cub", "cubed",
  "cup", "cut", "dab", "dam", "den", "dew", "dig", "dim", "dip", "dot", "dub", "dug",
  "duo", "dusk", "dye", "ear", "elm", "era", "eve", "fad", "fan", "fax", "fee", "fig",
  "fin", "fir", "fix", "fog", "fur", "gag", "gap", "gas", "gel", "gem", "gin", "glow",
  "gum", "gut", "gym", "haze", "hen", "hex", "hog", "hop", "hue", "hug", "hut",
  "ice", "ink", "inn", "ion", "ire", "ivy", "jab", "jag", "jam", "jar", "jaw", "jet",
  "jig", "jog", "jot", "joy", "jug", "keg", "kin", "kit", "lab", "lag", "lap", "law",
  "lay", "led", "leg", "lid", "lip", "log", "lot", "lug", "lux", "mad", "map", "mat",
  "mob", "mop", "mud", "mug", "nab", "nag", "nap", "nib", "nod", "nor", "nut", "oak",
  "oar", "oat", "odd", "ode", "opt", "orb", "ore", "oven", "owl", "own", "pad", "pal",
  "pan", "paw", "pea", "peg", "pen", "pet", "pie", "pig", "pin", "pit", "ply", "pod",
  "pop", "pot", "pry", "pub", "pug", "pun", "pup", "rag", "ram", "rap", "rat", "raw",
  "ray", "rib", "rid", "rig", "rim", "rip", "rob", "rod", "rot", "row", "rub", "rug",
  "rum", "rut", "rye", "sag", "sap", "saw", "shy", "sip", "sir", "sit", "six", "ski",
  "sly", "sob", "sod", "sow", "spa", "spy", "sum", "tab", "tan", "tap", "tar", "tax",
  "ten", "the", "tie", "tin", "toe", "ton", "tow", "toy", "tub", "tug", "two", "urn",
  "van", "vat", "vet", "via", "vim", "vow", "wag", "wax", "wig", "win", "wit", "woe",
  "wok", "won", "yak", "yam", "yap", "yaw", "yen", "yew", "zip", "zoo",
  // High value single words
  "five", "four", "three", "seven", "eight", "nine",
  "zero", "one", "two", "ten", "hundred", "thousand", "million", "billion",
  "red", "blue", "gold", "pink", "gray", "black", "white", "green", "amber", "coral",
  "north", "south", "east", "west", "left", "right", "front", "back",
  "king", "queen", "prince", "knight", "duke", "lord", "chief", "hero",
  "wolf", "eagle", "tiger", "lion", "bear", "hawk", "fox", "shark", "cobra", "dragon",
  "fire", "water", "earth", "stone", "iron", "steel", "frost", "storm", "thunder",
  "swift", "bold", "brave", "noble", "prime", "grand", "royal", "ultra", "mega", "super",
  "coin", "mint", "vault", "safe", "lock", "key", "gate", "door", "wall", "tower",
  "nest", "hive", "den", "cage", "fort", "base", "camp", "port", "dock", "bay",
]);

// GoDaddy's top keyword categories & trending niches
export const TRENDING_KEYWORDS: Record<string, number> = {
  "ai": 2.5, "gpt": 2.0, "neural": 1.8, "machine": 1.5, "deep": 1.5, "learn": 1.5,
  "robot": 1.6, "auto": 1.4, "smart": 1.5, "quantum": 2.0, "intel": 1.5,
  "pay": 1.8, "bank": 1.8, "cash": 1.6, "loan": 1.5, "credit": 1.6, "finance": 1.8,
  "trade": 1.6, "invest": 1.7, "wallet": 1.5, "token": 1.3, "defi": 1.4, "fintech": 1.8,
  "money": 1.7, "fund": 1.6, "wealth": 1.5, "capital": 1.6, "equity": 1.5, "profit": 1.4,
  "health": 1.7, "med": 1.5, "fit": 1.4, "care": 1.5, "dental": 1.4, "clinic": 1.4,
  "therapy": 1.3, "mental": 1.3, "wellness": 1.4, "organic": 1.3,
  "shop": 1.6, "store": 1.5, "buy": 1.5, "sell": 1.4, "deal": 1.3, "sale": 1.3,
  "market": 1.5, "retail": 1.4, "commerce": 1.5, "cart": 1.3, "order": 1.3,
  "cloud": 1.7, "tech": 1.6, "code": 1.4, "data": 1.6, "app": 1.4, "web": 1.3,
  "server": 1.3, "host": 1.3, "stack": 1.4, "saas": 1.6, "api": 1.5, "dev": 1.3,
  "cyber": 1.5, "digital": 1.4, "platform": 1.4, "software": 1.3, "system": 1.3,
  "home": 1.6, "house": 1.5, "land": 1.5, "estate": 1.6, "rent": 1.4, "property": 1.5,
  "build": 1.3, "room": 1.3, "space": 1.4,
  "solar": 1.6, "green": 1.4, "energy": 1.5, "power": 1.4, "electric": 1.4, "carbon": 1.3,
  "climate": 1.3, "eco": 1.3,
  "travel": 1.5, "hotel": 1.5, "flight": 1.4, "trip": 1.3, "tour": 1.3, "cruise": 1.3,
  "food": 1.4, "chef": 1.3, "wine": 1.3, "luxury": 1.4,
  "secure": 1.5, "guard": 1.3, "shield": 1.3, "vault": 1.4, "safe": 1.3, "protect": 1.3,
  "defense": 1.3, "lock": 1.3,
  "game": 1.5, "play": 1.4, "stream": 1.4, "video": 1.3, "music": 1.3, "sport": 1.3,
  "jobs": 1.5, "hire": 1.4, "work": 1.3, "career": 1.4, "talent": 1.3,
  "school": 1.3, "course": 1.3, "tutor": 1.3, "academy": 1.3,
  "legal": 1.5, "law": 1.4, "insure": 1.5, "claim": 1.3, "policy": 1.3,
};

const COMMON_WORDS = new Set([
  ...DICTIONARY_WORDS,
  ...PREMIUM_KEYWORDS,
  "the", "and", "for", "are", "but", "not", "you", "all", "can", "had", "her", "was", "one",
  "our", "out", "day", "get", "has", "him", "his", "how", "its", "may", "new", "now", "old",
  "see", "way", "who", "did", "got", "let", "say", "she", "too", "use", "big", "top", "best",
  "go", "no", "my", "up", "do", "so", "we", "if", "me", "on", "in", "it", "to", "be", "as",
  "at", "by", "or", "an", "of", "is",
]);

// ─── UTILITY FUNCTIONS ───

export function splitIntoWords(name: string): string[] {
  const words: string[] = [];
  let remaining = name.toLowerCase();
  let iterations = 0;
  while (remaining.length > 0 && iterations < 30) {
    iterations++;
    let found = false;
    for (let len = Math.min(remaining.length, 15); len >= 2; len--) {
      const candidate = remaining.substring(0, len);
      if (COMMON_WORDS.has(candidate) || DICTIONARY_WORDS.has(candidate) || PREMIUM_KEYWORDS.has(candidate)) {
        words.push(candidate);
        remaining = remaining.substring(len);
        found = true;
        break;
      }
    }
    if (!found) {
      words.push(remaining[0]);
      remaining = remaining.substring(1);
    }
  }
  return words;
}

export function isSingleDictionaryWord(name: string): boolean {
  return DICTIONARY_WORDS.has(name.toLowerCase());
}

export function getTrendingMultiplier(words: string[]): { multiplier: number; trends: string[] } {
  let multiplier = 1.0;
  const trends: string[] = [];
  for (const word of words) {
    const m = TRENDING_KEYWORDS[word];
    if (m && m > 1.0) {
      multiplier = Math.max(multiplier, m);
      trends.push(word);
    }
  }
  if (trends.length >= 2) {
    multiplier *= 1.3;
  }
  return { multiplier, trends };
}

// ─── QUICK VALUATION (for Bulk Analyzer & Name Generator) ───

export interface QuickValuationResult {
  band: string;
  score: number;
  valueMin: number;
  valueMax: number;
}

export function quickValuation(domain: string, pronounceScore?: number): QuickValuationResult {
  const parts = domain.toLowerCase().replace(/^www\./, "").split(".");
  const name = parts[0].replace(/[^a-z0-9]/g, "");
  const tld = parts[1] || "com";

  const trademark = checkTrademarkRisk(domain);
  const wordParts = splitIntoWords(name);
  const meaningfulWords = wordParts.filter(w => w.length >= 2 && (COMMON_WORDS.has(w) || DICTIONARY_WORDS.has(w) || PREMIUM_KEYWORDS.has(w)));
  const junkChars = wordParts.filter(w => w.length === 1 && !COMMON_WORDS.has(w)).length;
  const hasPenaltyWord = [...PENALTY_KEYWORDS].some(kw => name.includes(kw));
  const premiumMatches = meaningfulWords.filter(w => PREMIUM_KEYWORDS.has(w));
  const isDictWord = isSingleDictionaryWord(name);
  const allMeaningful = meaningfulWords.length >= 1 && junkChars === 0 && meaningfulWords.join("").length === name.length;

  let score = 0;

  // Length (max 20)
  if (name.length <= 2) score += 20;
  else if (name.length === 3) score += 18;
  else if (name.length === 4) score += 16;
  else if (name.length === 5) score += 14;
  else if (name.length === 6) score += 12;
  else if (name.length <= 8) score += 10;
  else if (name.length <= 10) score += 6;
  else if (name.length <= 14) score += 3;
  else score += 1;

  // TLD (max 25)
  score += PREMIUM_TLDS[tld] || 3;

  // Word quality (max 25)
  if (hasPenaltyWord) score += 1;
  else if (isDictWord) score += 25;
  else if (allMeaningful && meaningfulWords.length >= 2) score += premiumMatches.length >= 1 ? 22 : 18;
  else if (meaningfulWords.length >= 2 && junkChars <= 1) score += premiumMatches.length >= 1 ? 18 : 14;
  else if (meaningfulWords.length === 1 && junkChars === 0 && name.length <= 8) score += premiumMatches.length >= 1 ? 16 : 12;
  else if (meaningfulWords.length >= 1) score += 6 + Math.min(4, premiumMatches.length * 2);
  else score += 2;

  // Brandability (max 15)
  const vowelCount = [...name].filter(c => "aeiouy".includes(c)).length;
  const ratio = vowelCount / name.length;
  const isPronounceable = ratio >= 0.25 && ratio <= 0.6 && !/[bcdfghjklmnpqrstvwxz]{4,}/i.test(name);
  if (hasPenaltyWord) score += 1;
  else if (isDictWord && name.length <= 8) score += 15;
  else if (isPronounceable && meaningfulWords.length >= 1 && junkChars <= 1 && name.length <= 8) score += 15;
  else if (isPronounceable && meaningfulWords.length >= 1) score += 11;
  else if (isPronounceable) score += 7;
  else score += 3;

  // Character mix (max 10)
  const isAlpha = /^[a-z]+$/.test(name);
  score += isAlpha ? 10 : /^\d+$/.test(name) && name.length <= 4 ? 7 : /[-_]/.test(parts[0]) ? 2 : /\d/.test(name) ? 4 : 5;

  // Trending (max 15)
  const { multiplier: trendMult, trends } = getTrendingMultiplier(meaningfulWords);
  if (hasPenaltyWord) score += 0;
  else if (trends.length >= 2) score += 15;
  else if (trends.length === 1) score += Math.min(15, Math.round((trendMult - 1) * 15));
  else if (isDictWord) score += 8;
  else score += 2;

  // Pronounceability bonus (max 5)
  if (pronounceScore !== undefined) {
    score += Math.round(pronounceScore * 0.05);
  }

  // TM penalty — softer for multi-word domains where brand is partial
  const isMultiWord = meaningfulWords.length >= 2;
  if (trademark.riskLevel === "high" && !isMultiWord) score = Math.min(score, 15);
  else if (trademark.riskLevel === "high" && isMultiWord) score = Math.round(score * 0.7);
  else if (trademark.riskLevel === "medium" && !isMultiWord) score = Math.round(score * 0.6);
  // medium risk on multi-word → minimal penalty (brand is just a substring of compound)

  // Total max ~115, normalize to 100
  const normalizedTotal = Math.min(100, Math.round((score / 115) * 100));

  // Value bands (same tiers as full estimator)
  let valueMin: number, valueMax: number;
  if ((hasPenaltyWord) || (trademark.riskLevel === "high" && !isMultiWord)) {
    valueMin = 5; valueMax = 50;
  } else if (normalizedTotal >= 92) {
    valueMin = 75000; valueMax = 250000;
  } else if (normalizedTotal >= 85) {
    valueMin = 25000; valueMax = 100000;
  } else if (normalizedTotal >= 78) {
    valueMin = 8000; valueMax = 35000;
  } else if (normalizedTotal >= 70) {
    valueMin = 2500; valueMax = 12000;
  } else if (normalizedTotal >= 62) {
    valueMin = 800; valueMax = 4000;
  } else if (normalizedTotal >= 55) {
    valueMin = 200; valueMax = 1200;
  } else if (normalizedTotal >= 45) {
    valueMin = 50; valueMax = 400;
  } else if (normalizedTotal >= 35) {
    valueMin = 15; valueMax = 100;
  } else {
    valueMin = 5; valueMax = 50;
  }

  // Trending multiplier
  if (trendMult > 1.0 && !hasPenaltyWord && trademark.riskLevel !== "high") {
    valueMin = Math.round(valueMin * trendMult);
    valueMax = Math.round(valueMax * trendMult);
  }

  // Dictionary .com bonus
  if (isDictWord && tld === "com" && !hasPenaltyWord && trademark.riskLevel !== "high") {
    const dictBonus = name.length <= 4 ? 3.0 : name.length <= 6 ? 2.0 : 1.5;
    valueMin = Math.max(valueMin, Math.round(5000 * dictBonus));
    valueMax = Math.max(valueMax, Math.round(25000 * dictBonus));
  }

  // Tighten band
  if (valueMax > valueMin * 3) {
    valueMax = Math.round(valueMin * 3);
  }

  const band = `$${valueMin.toLocaleString()} – $${valueMax.toLocaleString()}`;
  return { band, score: normalizedTotal, valueMin, valueMax };
}
