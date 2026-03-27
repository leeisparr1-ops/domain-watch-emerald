import { checkTrademarkRisk, type TrademarkResult } from "@/lib/trademarkCheck";
import { getAgeMultiplier } from "@/lib/domainAge";
import { fetchTrendEnrichment, computeTrendBoost, type TrendEnrichment } from "@/lib/trendEnrichment";
import { HIGH_CPC_KEYWORDS } from "@/lib/semanticSimilarity";

// ─── DATA SETS ───

export const PREMIUM_TLDS: Record<string, number> = {
  com: 25, net: 14, org: 13, io: 16, ai: 18, co: 14, app: 12, dev: 11, gg: 13, me: 9, xyz: 5, info: 4, biz: 3,
};

export const PREMIUM_KEYWORDS = new Set([
  "ai", "crypto", "cloud", "tech", "pay", "bet", "buy", "sell", "trade", "bank", "cash", "loan",
  "health", "fit", "auto", "car", "home", "solar", "green", "data", "code", "web", "app", "game",
  "shop", "store", "deal", "sale", "food", "travel", "hotel", "dating", "jobs", "news", "legal",
  "quantum", "meta", "cyber", "robot", "drone", "space", "block", "chain", "fintech", "saas",
  "defi", "token", "intel", "logic", "matrix", "pixel", "forge", "core", "hub", "lab",
  "stack", "flow", "grid", "sync", "bolt", "shift", "spark", "edge", "apex", "nova",
  // Top recurring aftermarket keywords
  "group", "solutions", "services", "homes", "global", "company", "business", "pro",
  "lawyer", "life", "real", "best", "my", "go", "new", "club",
  // Expanded premium keywords for broader niche coverage
  "bio", "gene", "med", "care", "clinic", "skin", "beauty", "pet", "vet", "insure",
  "insurance", "iot", "sensor", "vr", "ar", "virtual", "metaverse", "rocket", "launch",
  "cannabis", "cbd", "hemp", "glow", "fashion", "style", "wear", "recipe", "chef",
  "coach", "mentor", "tutor", "course", "academy", "learn", "talent", "hire", "recruit",
  "secure", "guard", "shield", "vault", "protect", "defense", "threat", "breach",
  "ev", "fleet", "charge", "battery", "power", "energy", "clean", "sustain",
  "fund", "wealth", "capital", "equity", "invest", "profit", "revenue",
  "platform", "api", "deploy", "pipeline", "infra", "dev", "ops",
  "stream", "content", "media", "podcast", "creator", "influencer",
  "neura", "spatial", "copilot", "genai", "llm", "agentic",
  "esport", "loot", "raid", "quest", "arena", "guild", "clash", "boost", "rank",
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
  "brilliant", "broadcast", "butterfly", "calculate", "calculator", "calendar", "candidate",
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
  // Common adjectives (critical for compound domains like ShinyShip, BrightPath, etc.)
  "shiny", "bright", "sharp", "clean", "clear", "clever", "cool", "crisp", "cute", "dark",
  "deep", "easy", "epic", "fair", "fast", "fine", "firm", "flat", "fresh", "good",
  "great", "happy", "keen", "kind", "lean", "loud", "lucky", "neat", "nice", "open",
  "plain", "pure", "quick", "quiet", "rare", "rich", "rough", "round", "safe", "sharp",
  "sleek", "slim", "smooth", "snappy", "solid", "sunny", "sweet", "tall", "thick", "thin",
  "tight", "tiny", "tough", "true", "vast", "vivid", "warm", "weird", "whole", "wide",
  "wild", "wise", "young", "agile", "ample", "blank", "bliss", "calm", "cheap", "dense",
  "eager", "elite", "empty", "equal", "exact", "extra", "fancy", "fierce", "gentle", "glad",
  "grim", "gross", "harsh", "heavy", "huge", "humble", "ideal", "jolly", "lame", "lazy",
  "loose", "lush", "major", "merry", "mild", "minor", "moist", "moral", "mute", "nifty",
  "odd", "pale", "petty", "plump", "polar", "polite", "poor", "proud", "rigid", "ripe",
  "rosy", "rude", "rusty", "salty", "sane", "scary", "sheer", "silent", "silly", "slick",
  "sober", "sore", "spare", "stark", "steep", "stern", "stiff", "stoic", "strict", "super",
  "tame", "tender", "terse", "timid", "toxic", "trim", "ugly", "vague", "wary", "witty",
  // ─── EXPANDED: commonly missed everyday English words ───
  "stay", "kick", "hope", "maker", "agent", "agents", "stake", "snap", "slot", "spin",
  "swing", "taste", "voice", "wager", "alert", "allow", "apply", "arise", "avoid",
  "begin", "blame", "bless", "bloom", "board", "boast", "break", "breed", "bring",
  "carry", "catch", "cause", "chase", "cheap", "check", "cheer", "chess", "chose",
  "claim", "class", "climb", "cling", "clock", "close", "coach", "color", "comes",
  "count", "cover", "craft", "crash", "crawl", "crowd", "crush", "dance", "doing",
  "doubt", "draft", "drain", "drawn", "dress", "dried", "drink", "drift", "drops",
  "dying", "eager", "earth", "eight", "elect", "enemy", "enjoy", "enter", "equal",
  "error", "event", "every", "exact", "exist", "extra", "faith", "false", "fault",
  "feast", "fence", "fetch", "fewer", "fiber", "field", "fight", "final", "flame",
  "flesh", "float", "flood", "floor", "fluid", "flyer", "focus", "force", "forge",
  "forth", "found", "frame", "fresh", "front", "froze", "fruit", "given", "glass",
  "gleam", "globe", "gloom", "glory", "going", "grain", "grant", "grasp", "grave",
  "great", "greet", "grief", "grind", "gross", "group", "grown", "guard", "guess",
  "guide", "happy", "harsh", "haven", "heart", "hence", "honor", "horse", "house",
  "human", "humor", "hurry", "image", "imply", "inbox", "index", "inner", "input",
  "issue", "judge", "juice", "knock", "known", "labor", "large", "later", "laugh",
  "layer", "learn", "least", "leave", "level", "light", "limit", "linen", "lives",
  "loose", "lover", "lower", "lucky", "lunch", "lyric", "magic", "major", "march",
  "match", "mayor", "meant", "medal", "media", "mercy", "merge", "metal", "meter",
  "might", "minor", "mixed", "model", "money", "month", "moral", "motor", "mount",
  "mouse", "mouth", "music", "naked", "nerve", "never", "night", "noble", "noise",
  "north", "noted", "novel", "nurse", "ocean", "offer", "often", "olive", "onset",
  "opens", "opera", "orbit", "order", "other", "ought", "outer", "owned", "owner",
  "paint", "paper", "party", "pasta", "pause", "peace", "penny", "phase", "phone",
  "photo", "piano", "piece", "pilot", "pitch", "pixel", "place", "plain", "plane",
  "plant", "plate", "plaza", "plead", "point", "polar", "pound", "power", "press",
  "price", "pride", "prime", "print", "prior", "prize", "proof", "proud", "prove",
  "psalm", "punch", "queen", "quest", "quick", "quiet", "quote", "radar", "radio",
  "raise", "rally", "range", "rapid", "ratio", "reach", "react", "ready", "realm",
  "rebel", "reign", "relax", "reply", "rider", "ridge", "rifle", "rigid", "rival",
  "river", "robin", "rough", "round", "route", "royal", "ruler", "rural", "saint",
  "sauce", "scale", "scene", "scope", "score", "sense", "serve", "setup", "seven",
  "shake", "shall", "shame", "shape", "share", "sharp", "sheet", "shelf", "shell",
  "shift", "shine", "shirt", "shock", "shoot", "shore", "short", "shout", "sight",
  "since", "sixth", "sixty", "sized", "skill", "sleep", "slice", "slide", "small",
  "smart", "smell", "smile", "smoke", "solar", "solve", "sorry", "sound", "south",
  "space", "spare", "spark", "speak", "speed", "spell", "spend", "spike", "split",
  "spoke", "spoon", "sport", "spray", "squad", "stack", "staff", "stage", "stair",
  "stake", "stale", "stall", "stamp", "stand", "stark", "start", "state", "steal",
  "steam", "steel", "steer", "stick", "stock", "stone", "stood", "store", "storm",
  "story", "stove", "strip", "stuck", "study", "stuff", "style", "sugar", "suite",
  "super", "surge", "swept", "swift", "swing", "sword", "taste", "teach", "tempo",
  "thank", "theme", "thick", "thing", "think", "third", "those", "three", "threw",
  "throw", "thumb", "timer", "title", "token", "touch", "tough", "towel", "tower",
  "toxic", "trace", "track", "trade", "trail", "train", "trait", "treat", "trend",
  "trial", "tribe", "trick", "tried", "troop", "truck", "truly", "trump", "trunk",
  "trust", "truth", "twice", "twist", "uncle", "under", "union", "unite", "unity",
  "until", "upper", "upset", "urban", "usage", "usual", "utter", "valid", "valve",
  "value", "verse", "video", "vigor", "vinyl", "virus", "visit", "vital", "vivid",
  "vocal", "voice", "voter", "wages", "waste", "watch", "water", "weave", "whale",
  "wheat", "wheel", "where", "which", "while", "white", "whole", "whose", "wider",
  "woman", "women", "world", "worse", "worst", "worth", "would", "wound", "write",
  "wrong", "wrote", "yield", "young", "youth",
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
  // ─── EXPANDED: common compound-word building blocks & industry terms ───
  // Business & corporate
  "consulting", "consultancy", "advisory", "associates", "partners", "ventures",
  "holdings", "enterprises", "industries", "corporation", "incorporated", "limited",
  "strategic", "management", "marketing", "advertising", "branding", "creative",
  "agency", "studio", "workshop", "collective", "cooperative", "syndicate",
  "wholesale", "distribution", "logistics", "procurement", "outsourcing",
  // Technology & digital
  "blockchain", "cryptocurrency", "automation", "analytics", "algorithm",
  "bandwidth", "broadband", "computing", "cybersecurity", "datacenter",
  "ecommerce", "encryption", "ethernet", "firmware", "gigabyte",
  "hologram", "hyperlink", "interface", "javascript", "kubernetes",
  "microchip", "middleware", "networking", "opensource", "processor",
  "protocol", "robotics", "satellite", "semiconductor", "simulation",
  "streaming", "synthetic", "terabyte", "terraform", "touchscreen",
  "typescript", "virtualization", "webmaster", "workflow",
  // Healthcare & wellness
  "cardiology", "dermatology", "diagnostics", "emergency", "fertility",
  "gastro", "geriatric", "holistic", "immunology", "laboratory",
  "neurology", "nutrition", "oncology", "optometry", "orthopedic",
  "pathology", "pediatric", "physiotherapy", "psychiatry", "radiology",
  "rehabilitation", "surgical", "telehealth", "therapeutic", "urology",
  "veterinary", "vitamin", "supplement", "meditation", "mindfulness",
  // Finance & investment
  "accounting", "actuarial", "annuity", "arbitrage", "auditing",
  "bankruptcy", "brokerage", "commodity", "compliance", "consolidation",
  "derivative", "diversify", "endowment", "fiduciary", "foreclosure",
  "inflation", "liquidation", "microfinance", "portfolio", "receivable",
  "refinance", "securities", "settlement", "sovereign", "treasury",
  "underwriting", "valuation", "volatility",
  // Real estate & construction
  "apartment", "blueprint", "bungalow", "carpenter", "condominium",
  "contractor", "demolition", "excavation", "flooring", "foreclosure",
  "foundation", "insulation", "landscaping", "penthouse", "plumbing",
  "renovation", "residential", "roofing", "subdivision", "townhouse",
  // Education & learning
  "certification", "classroom", "curriculum", "diploma", "enrollment",
  "examination", "fellowship", "graduation", "homework", "instruction",
  "kindergarten", "laboratory", "lecture", "literacy", "mentoring",
  "preschool", "professor", "scholarship", "semester", "syllabus",
  "textbook", "tutoring", "university", "vocational",
  // Food & beverage
  "bakery", "barbecue", "beverage", "brewery", "butcher", "catering",
  "confectionery", "delicatessen", "espresso", "gastronomy", "gourmet",
  "ingredient", "nutrition", "organic", "pastry", "restaurant",
  "seasoning", "smoothie", "sommelier", "vineyard",
  // Travel & hospitality
  "accommodation", "adventure", "airline", "backpacker", "booking",
  "boutique", "camping", "charter", "concierge", "destination",
  "excursion", "getaway", "hospitality", "itinerary", "lodging",
  "passport", "pilgrimage", "reservation", "safari", "sightseeing",
  "souvenir", "terminal", "tourism", "traveler", "vacation",
  // Legal & compliance
  "arbitration", "attorney", "barrister", "compliance", "copyright",
  "counsel", "courtroom", "deposition", "enforcement", "immigration",
  "indemnity", "jurisdiction", "lawsuit", "legislation", "litigation",
  "mediator", "negligence", "paralegal", "prosecution", "regulation",
  "solicitor", "statute", "subpoena", "testimony", "tribunal",
  // Automotive & transport
  "automotive", "caravan", "collision", "convertible", "dealership",
  "diesel", "driveway", "electric", "emission", "exhaust",
  "freeway", "gasoline", "highway", "horsepower", "ignition",
  "mechanic", "motorcycle", "navigation", "passenger", "speedway",
  "suspension", "throttle", "traction", "transmission", "turbocharge",
  // Sports & fitness
  "athletics", "basketball", "champion", "coaching", "competition",
  "crossfit", "endurance", "exercise", "gymnasium", "marathon",
  "nutrition", "olympian", "performance", "quarterback", "recreation",
  "spinning", "sprinting", "swimming", "tournament", "training",
  "triathlon", "volleyball", "weightlifting", "wrestling", "yoga",
  // Environment & sustainability
  "biodegradable", "biofuel", "composting", "conservation", "deforestation",
  "ecosystem", "emission", "geothermal", "greenhouse", "hydroelectric",
  "pollution", "recycling", "renewable", "reforestation", "sustainability",
  "watershed", "windmill", "wildlife",
  // Media & entertainment
  "animation", "broadcast", "celebrity", "cinema", "documentary",
  "editorial", "entertainment", "festival", "filmmaker", "journalism",
  "magazine", "multimedia", "newspaper", "photography", "playlist",
  "podcast", "production", "publishing", "recording", "screenplay",
  "soundtrack", "streaming", "subscriber", "television", "theatrical",
  // Common compound-word prefixes/suffixes
  "able", "anti", "back", "down", "ever", "fore", "free", "full", "half",
  "hand", "hard", "head", "high", "home", "land", "less", "like", "line",
  "long", "look", "made", "make", "man", "mark", "mass", "mid", "mind",
  "mini", "more", "most", "much", "near", "next", "off", "once", "only",
  "open", "out", "over", "own", "part", "past", "path", "plan", "play",
  "post", "pull", "push", "rain", "run", "sand", "sea", "self", "set",
  "ship", "side", "sign", "sky", "soft", "some", "soon", "star", "step",
  "still", "stop", "sun", "sure", "take", "talk", "team", "tell", "test",
  "than", "that", "them", "then", "thin", "this", "time", "tiny", "tool",
  "tree", "true", "turn", "type", "used", "very", "view", "walk", "want",
  "warm", "wash", "wave", "wear", "well", "what", "when", "whom", "wide",
  "wild", "will", "wind", "wire", "wise", "wish", "with", "wood", "word",
  "year", "zone",
  // ─── COMPREHENSIVE: high-value everyday English words for domainer coverage ───
  // Animals
  "ant", "ape", "bat", "bee", "bird", "buck", "bull", "calf", "cat", "clam",
  "cod", "colt", "crab", "crow", "deer", "doe", "dog", "dove", "duck", "eel",
  "elk", "ewe", "fawn", "fish", "flea", "fly", "foal", "frog", "goat", "goose",
  "hare", "horse", "lamb", "lark", "mare", "mink", "mole", "moth", "mule", "newt",
  "otter", "ox", "panda", "parrot", "pelican", "pike", "pony", "ram", "raven",
  "robin", "seal", "slug", "snail", "snake", "spider", "squid", "stag", "swan",
  "toad", "trout", "tuna", "viper", "wasp", "wren", "zebra",
  // Plants & nature
  "ash", "bark", "bean", "birch", "bloom", "blossom", "branch", "bush", "cedar",
  "clover", "daisy", "fern", "flora", "grove", "herb", "holly", "iris", "ivy",
  "leaf", "lily", "lotus", "maple", "moss", "olive", "orchid", "palm", "petal",
  "pine", "plum", "poppy", "reed", "root", "rose", "sage", "seed", "shrub",
  "sprout", "stem", "thorn", "tulip", "vine", "violet", "weed", "willow",
  // Body & health
  "ankle", "artery", "blood", "bone", "brain", "chest", "chin", "elbow", "face",
  "fiber", "flesh", "grip", "hair", "heal", "hip", "joint", "knee", "limb",
  "liver", "lung", "nail", "nerve", "palm", "pulse", "rib", "scalp", "shin",
  "skin", "skull", "spine", "teeth", "thumb", "tissue", "toe", "tongue", "vein",
  "wrist",
  // Food & drink
  "apple", "bacon", "basil", "berry", "bread", "broth", "butter", "candy", "cheese",
  "cherry", "chili", "cocoa", "coffee", "cookie", "corn", "cream", "curry", "dough",
  "feast", "flour", "garlic", "ginger", "grape", "gravy", "honey", "lemon", "lime",
  "mango", "maple", "melon", "milk", "mint", "mocha", "muffin", "olive", "onion",
  "orange", "peach", "peanut", "pepper", "pickle", "pizza", "plum", "pretzel",
  "punch", "rice", "salad", "salmon", "salt", "sauce", "snack", "soup", "spice",
  "steak", "sugar", "syrup", "toast", "tomato", "treat", "truffle", "vanilla",
  "waffle", "wheat", "yogurt",
  // Home & living
  "attic", "barn", "bath", "bed", "bench", "blind", "brick", "broom", "cabin",
  "carpet", "cellar", "chair", "chimney", "closet", "couch", "cradle", "curtain",
  "desk", "drain", "drawer", "dryer", "fence", "garage", "garden", "grill", "hall",
  "hearth", "house", "hutch", "kitchen", "lamp", "lawn", "ledge", "linen", "lodge",
  "manor", "mattress", "mirror", "oven", "pantry", "patio", "pillow", "porch",
  "quilt", "rafter", "ranch", "roof", "rug", "shelf", "shutter", "sink", "sofa",
  "stool", "stove", "table", "terrace", "tile", "towel", "villa", "window", "yard",
  // Weather & time
  "autumn", "blizzard", "breeze", "cloud", "dawn", "drizzle", "dusk", "eclipse",
  "evening", "flood", "freeze", "frost", "gale", "hail", "harvest", "heat",
  "horizon", "hurricane", "mist", "monsoon", "moon", "morning", "night", "noon",
  "rain", "season", "shadow", "shower", "sleet", "snow", "spring", "summer",
  "sunrise", "sunset", "thunder", "tornado", "twilight", "weather", "winter",
  // Materials & substances
  "alloy", "brass", "bronze", "chalk", "chrome", "clay", "cloth", "coal", "copper",
  "cotton", "crystal", "denim", "diamond", "dust", "fabric", "fiber", "glass",
  "glaze", "gold", "granite", "gravel", "iron", "jade", "lace", "latex", "lava",
  "lead", "leather", "linen", "marble", "mesh", "metal", "nylon", "pearl", "plaster",
  "platinum", "porcelain", "quartz", "resin", "rubber", "rust", "satin", "silk",
  "silver", "slate", "steel", "stone", "suede", "tar", "timber", "tin", "titanium",
  "velvet", "vinyl", "wax", "wire", "wood", "wool", "zinc",
  // Professions & roles
  "baker", "banker", "barber", "bishop", "broker", "butler", "captain", "clerk",
  "coach", "cook", "cowboy", "dancer", "dentist", "doctor", "driver", "editor",
  "farmer", "fisher", "florist", "guard", "healer", "hunter", "janitor", "jockey",
  "judge", "knight", "lawyer", "leader", "lender", "maid", "major", "mason",
  "mayor", "miner", "monk", "nanny", "nurse", "officer", "painter", "pastor",
  "pilot", "pirate", "plumber", "poet", "priest", "ranger", "sailor", "scholar",
  "scout", "singer", "soldier", "surgeon", "tailor", "teacher", "trader", "tutor",
  "usher", "vendor", "waiter", "warden", "welder", "writer",
  // Music & arts
  "album", "ballet", "band", "banjo", "bass", "beat", "bell", "blues", "brass",
  "canvas", "cello", "choir", "chord", "chorus", "clarinet", "comedy", "concert",
  "craft", "dance", "drama", "drum", "duet", "easel", "encore", "fiddle", "flute",
  "folk", "gallery", "guitar", "harp", "hymn", "jazz", "lyric", "melody", "mural",
  "opera", "organ", "paint", "piano", "poem", "prose", "punk", "rhythm", "rock",
  "scene", "sketch", "solo", "song", "stage", "statue", "studio", "symphony",
  "tempo", "tenor", "theater", "tone", "trio", "trumpet", "verse", "viola",
  // Geography & places
  "alpine", "basin", "beach", "bluff", "canyon", "cape", "cave", "cliff", "coast",
  "coral", "creek", "delta", "dune", "field", "ford", "glacier", "glen", "gorge",
  "grove", "gulf", "harbor", "haven", "heath", "hill", "inlet", "isle", "knoll",
  "lagoon", "lake", "marsh", "mesa", "oasis", "ocean", "peak", "peninsula", "pier",
  "plain", "plateau", "pond", "prairie", "ravine", "reef", "ridge", "river", "shore",
  "slope", "spring", "strait", "summit", "swamp", "tundra", "valley", "volcano",
  // Emotions & abstract
  "anger", "bliss", "bond", "calm", "chaos", "charm", "cheer", "comfort", "courage",
  "desire", "doubt", "dream", "envy", "faith", "fame", "fate", "favor", "fear",
  "fury", "glee", "glory", "grace", "grief", "guilt", "grit", "hate", "honor",
  "hope", "humor", "irony", "joy", "karma", "logic", "love", "luck", "lust",
  "mercy", "mood", "myth", "need", "nerve", "order", "panic", "passion", "peace",
  "pity", "pledge", "pride", "rage", "risk", "romance", "sanity", "shame", "shock",
  "soul", "spite", "thrill", "trust", "truth", "unity", "valor", "vanity", "vigor",
  "virtue", "warmth", "wrath", "zeal",
  // Sports & games
  "arena", "ball", "base", "basket", "bat", "bout", "bowl", "boxing", "catch",
  "chess", "climb", "coach", "course", "crew", "dart", "dice", "dive", "draft",
  "duel", "fencing", "field", "final", "fishing", "goal", "golf", "hike", "hockey",
  "hunt", "judo", "kayak", "league", "match", "medal", "net", "paddle", "pool",
  "race", "rally", "ring", "rowing", "rugby", "sail", "score", "shoot", "skiing",
  "soccer", "sprint", "surf", "swim", "team", "tennis", "throw", "track", "trophy",
  "vault", "volley", "yacht",
  // Tools & objects
  "anvil", "axle", "badge", "blade", "bolt", "brush", "bucket", "cable", "chain",
  "clamp", "clip", "crank", "drill", "flask", "gear", "hammer", "handle", "hinge",
  "hook", "hose", "ladder", "lantern", "lens", "lever", "loom", "magnet", "mallet",
  "needle", "nozzle", "paddle", "plier", "plumb", "probe", "pulley", "pump", "reel",
  "rivet", "rope", "ruler", "scale", "screw", "shovel", "siren", "socket", "spike",
  "spring", "stamp", "staple", "strap", "switch", "tack", "tape", "torch", "valve",
  "wedge", "wheel", "winch", "wrench",
  // Transport
  "boat", "barge", "bike", "buggy", "canoe", "cargo", "cart", "coupe", "cruise",
  "ferry", "fleet", "freight", "glider", "kayak", "metro", "raft", "rail", "sedan",
  "sled", "sleigh", "taxi", "tram", "truck", "wagon", "yacht",
  // Science & tech
  "atom", "beam", "cell", "coil", "core", "diode", "dose", "electron", "fiber",
  "field", "flux", "formula", "fossil", "gamma", "gene", "genome", "germ", "helix",
  "laser", "lens", "magnet", "mass", "meson", "metric", "neutron", "nucleus",
  "optic", "orbit", "oxide", "photon", "plasma", "prism", "proton", "pulse",
  "quark", "radar", "ratio", "reactor", "sensor", "signal", "solar", "sonar",
  "spark", "spectrum", "tensor", "thermal", "vapor", "vector", "voltage", "watt",
  // Clothing & fashion
  "apron", "belt", "blouse", "boot", "cap", "cloak", "collar", "corset", "cuff",
  "dress", "fabric", "fleece", "glove", "gown", "hat", "jacket", "jersey", "knit",
  "lace", "mitten", "robe", "sandal", "scarf", "shawl", "shirt", "shoe", "silk",
  "skirt", "sleeve", "slipper", "sock", "stitch", "suit", "sweater", "tassel",
  "thread", "tunic", "tweed", "vest", "weave", "wool", "zipper",
  // Common verbs (often missed)
  "adopt", "agree", "align", "amaze", "annoy", "argue", "awake", "bake", "bathe",
  "begin", "bend", "bind", "bite", "blaze", "bleed", "bless", "blow", "boil",
  "borrow", "bound", "brand", "brave", "breed", "bring", "brush", "burn", "burst",
  "calm", "carve", "chant", "chase", "cheat", "choke", "chop", "claim", "clash",
  "clean", "clear", "cling", "close", "coach", "coast", "coil", "come", "cook",
  "count", "cover", "crack", "crash", "crawl", "creep", "cross", "crush", "dare",
  "deal", "delay", "deny", "deter", "dine", "dodge", "doom", "doubt", "drag",
  "drain", "drape", "draw", "dread", "drift", "drill", "drip", "drop", "drown",
  "dwell", "earn", "ease", "eject", "emit", "empty", "endow", "ensue", "erase",
  "erupt", "evade", "excel", "exert", "exile", "expel", "faint", "feast", "feed",
  "fetch", "fight", "fill", "find", "fling", "float", "flock", "flood", "flush",
  "forge", "found", "frame", "freed", "froze", "fuel", "gain", "gaze", "glare",
  "gleam", "glide", "glow", "gnaw", "gouge", "grab", "grasp", "graze", "greet",
  "grind", "groan", "grope", "growl", "guess", "haunt", "hoist", "honor", "hover",
  "hurry", "imply", "incur", "infer", "judge", "keep", "kneel", "knit", "label",
  "laugh", "learn", "leave", "lend", "level", "light", "lodge", "march", "marry",
  "melt", "mend", "mimic", "mourn", "obey", "occur", "omit", "ooze", "orbit",
  "paint", "parse", "patch", "pause", "phase", "plead", "pluck", "plumb", "plump",
  "plunge", "point", "pound", "pour", "prank", "pray", "press", "probe", "prowl",
  "prune", "quake", "query", "quest", "quote", "raise", "rally", "reach", "react",
  "reign", "relax", "repay", "repel", "reply", "rinse", "risen", "roam", "roast",
  "scald", "scale", "scare", "scoop", "scout", "scrub", "seize", "serve", "sever",
  "shade", "shake", "shape", "share", "shave", "shift", "shine", "shove", "shred",
  "shrub", "shrug", "shunt", "siege", "singe", "skate", "slash", "sleep", "slide",
  "sling", "slope", "smash", "snare", "sneak", "soar", "solve", "spare", "spawn",
  "speak", "speed", "spend", "spill", "split", "spoil", "spray", "stain", "stall",
  "stand", "stare", "start", "steal", "steer", "stick", "sting", "stir", "stomp",
  "stoop", "store", "strip", "strum", "strut", "stuff", "stump", "stung", "stunt",
  "surge", "sway", "swear", "sweep", "swell", "swirl", "swoop", "tease", "tempt",
  "thank", "thaw", "throw", "torch", "trace", "train", "tramp", "trend", "trill",
  "trump", "trust", "tweak", "twist", "unite", "untie", "usher", "voice", "vouch",
  "waken", "wander", "waste", "watch", "weigh", "wield", "yearn",
  // Common nouns (often missed)
  "abbey", "abyss", "acre", "aisle", "alibi", "alley", "altar", "angel", "ankle",
  "anvil", "arch", "attic", "badge", "bandit", "banner", "barrel", "basin", "beard",
  "beast", "belly", "bench", "berry", "blade", "blank", "blast", "blaze", "blimp",
  "bliss", "block", "bloom", "board", "bonus", "booth", "bound", "brace", "brand",
  "bravo", "brink", "brook", "brush", "bulge", "bunch", "cabin", "candy", "cargo",
  "carol", "charm", "chess", "chief", "chord", "chunk", "cider", "cigar", "cinch",
  "civic", "claim", "clash", "clasp", "class", "claw", "clerk", "cliff", "cloak",
  "clone", "cloth", "clown", "coach", "cobra", "comet", "coral", "corps", "court",
  "craft", "crane", "crate", "creed", "crest", "crisp", "cross", "crowd", "cruel",
  "crush", "curve", "dairy", "decal", "decoy", "demon", "depot", "derby", "detox",
  "diary", "disco", "ditch", "dodge", "donor", "draft", "dread", "drone", "dwarf",
  "eagle", "elbow", "elder", "ember", "envoy", "epoch", "essay", "exile", "fairy",
  "farce", "feast", "felon", "fiber", "fiend", "filth", "flame", "flank", "flask",
  "flesh", "flood", "flour", "flute", "foyer", "frail", "fraud", "freak", "frost",
  "gauge", "ghost", "giant", "giddy", "given", "glare", "gleam", "glint", "globe",
  "gnome", "gorge", "graft", "grain", "grave", "greed", "grief", "groan", "groom",
  "grout", "grove", "growl", "grunt", "guide", "guild", "guise", "gulch", "gully",
  "haven", "heath", "hedge", "hinge", "holly", "honey", "house", "hover", "hurdle",
  "jewel", "joker", "juice", "knack", "knelt", "known", "lance", "latch", "ledge",
  "lever", "llama", "lofty", "lunar", "lurch", "manor", "maple", "marsh", "maxim",
  "mazer", "melee", "mercy", "mirth", "mogul", "moose", "mound", "mourn", "mulch",
  "mural", "niche", "notch", "novel", "nurse", "oasis", "onset", "orbit", "organ",
  "ounce", "oxide", "panel", "panic", "patch", "peach", "pearl", "pedal", "perch",
  "phase", "plank", "plaque", "plaza", "plume", "poker", "polar", "pouch", "pound",
  "power", "prawn", "primo", "prism", "prone", "psalm", "purge", "quota", "quoth",
  "reign", "relay", "relic", "ridge", "rigor", "rival", "roost", "rouge", "rover",
  "rumor", "rung", "sauna", "scalp", "scrap", "serum", "shack", "shaft", "shale",
  "sheaf", "shore", "siege", "skull", "slate", "smelt", "snare", "snore", "snout",
  "spade", "spear", "speck", "spire", "splat", "spoke", "spore", "squat", "stalk",
  "stall", "stash", "stead", "steed", "steep", "steer", "stern", "stint", "stoic",
  "stoke", "stork", "stout", "stove", "straw", "strewn", "strew", "stump", "suave",
  "swamp", "swarm", "swath", "swift", "swine", "swirl", "tabby", "talon", "tango",
  "tango", "tapir", "tease", "tempo", "theft", "thorn", "thump", "tiara", "titan",
  "torch", "totem", "tread", "triad", "trice", "trout", "truce", "tulip", "tuner",
  "tunic", "twang", "twerp", "udder", "ultra", "umbra", "usurp", "valet", "vault",
  "verge", "vicar", "vigor", "viper", "vista", "voter", "vowel", "vulva", "wager",
  "waist", "warden", "weary", "wedge", "whack", "wheat", "whirl", "widow", "wince",
  "yacht", "yearn", "yield", "zealot",
  // Additional high-value single words commonly traded
  "absolute", "abstract", "academic", "accent", "accept", "acquire", "action",
  "active", "actual", "agenda", "agree", "ahead", "alert", "alive", "alpha",
  "alter", "always", "amount", "anchor", "annual", "appeal", "arena", "army",
  "arrow", "aside", "asset", "atlas", "audio", "aware", "badge", "basic",
  "beach", "being", "below", "bible", "birth", "blast", "blaze", "blend",
  "blind", "block", "bloom", "blown", "board", "bonus", "boost", "bound",
  "brain", "brand", "brass", "bread", "break", "breed", "brick", "bride",
  "brief", "bring", "broad", "brook", "brush", "buddy", "bunch", "buyer",
  "cable", "candy", "cargo", "catch", "cause", "cedar", "chain", "chair",
  "chalk", "chaos", "charm", "chart", "chase", "cheap", "check", "cheer",
  "chess", "chest", "child", "china", "choir", "chunk", "civic", "civil",
  "claim", "clash", "class", "clean", "clear", "clerk", "click", "cliff",
  "climb", "clock", "clone", "close", "cloud", "coach", "coast", "color",
  "comet", "comic", "coral", "corps", "couch", "could", "count", "court",
  "cover", "crack", "craft", "crane", "crash", "crazy", "cream", "creek",
  "crest", "crew", "crime", "crisp", "cross", "crowd", "crown", "crude",
  "crush", "curve", "cycle", "daily", "dance", "debut", "decor", "delta",
  "demon", "dense", "depot", "depth", "derby", "digit", "diner", "disco",
  "divine", "donor", "dozen", "draft", "drama", "drawn", "dread", "dress",
  "dried", "drift", "drink", "drive", "drone", "drops", "drunk", "dummy",
  "dwarf", "dying", "eager", "early", "earth", "eaten", "eight", "elect",
  "elite", "ember", "empty", "enemy", "enjoy", "enter", "entry", "equal",
  "error", "essay", "ethic", "event", "every", "exact", "exam", "exile",
  "exist", "extra", "fable", "faith", "false", "fancy", "fatal", "fault",
  "feast", "fence", "fetch", "fever", "fewer", "fiber", "field", "fight",
  "final", "first", "fixed", "flame", "flash", "fleet", "flesh", "flint",
  "float", "flood", "floor", "flora", "fluid", "flush", "focal", "folly",
  "force", "forge", "forum", "fossil", "found", "frame", "frank", "fraud",
  "fresh", "front", "froze", "fruit", "fully", "funny", "gamma", "gauge",
  "genre", "ghost", "giant", "given", "glass", "gleam", "globe", "gloom",
  "glory", "going", "goose", "grace", "grade", "grain", "grand", "grant",
  "graph", "grasp", "grass", "grave", "great", "greed", "green", "greet",
  "grief", "grind", "groan", "groom", "gross", "group", "grove", "grown",
  "guard", "guess", "guest", "guide", "guild", "habit", "happy", "harsh",
  "haven", "heart", "heavy", "hello", "hence", "honey", "honor", "horse",
  "hotel", "house", "human", "humor", "hurry", "hyper", "ideal", "image",
  "imply", "inbox", "index", "indie", "inner", "input", "intro", "issue",
  "ivory", "jewel", "joint", "joker", "juice", "jumbo", "juror", "karma",
  "kayak", "knack", "knelt", "knife", "known", "label", "labor", "lance",
  "large", "laser", "latch", "later", "laugh", "layer", "lease",
  "ledge", "legal", "lemon", "lever", "light", "linen", "liver", "llama",
  "lobby", "local", "lodge", "lofty", "logic", "loose", "lotus", "loved",
  "lover", "lower", "loyal", "lucky", "lunar", "lunch", "lunge", "lyric",
  "macro", "magic", "magma", "major", "manor", "maple", "march", "marsh",
  "mason", "match", "mayor", "meant", "medal", "media", "melee", "melon",
  "mercy", "merit", "merry", "metal", "meter", "micro", "might", "mimic",
  "miner", "minor", "minus", "mixed", "model", "mogul", "money", "month",
  "moose", "moral", "motor", "mound", "mount", "mourn", "mouse", "mouth",
  "multi", "music", "nerve", "never", "newly", "night", "ninja", "noble",
  "noise", "north", "notch", "noted", "novel", "nurse", "occur", "ocean",
  "offer", "often", "onset", "opera", "optic", "orbit", "other", "ought",
  "outer", "outdo", "owned", "owner", "oxide", "ozone", "paint", "panel",
  "panic", "paper", "party", "paste", "patch", "pause", "peace", "pearl",
  "penal", "penny", "perch", "phone", "photo", "piano", "piece", "pinch",
  "pitch", "pixel", "place", "plain", "plane", "plant", "plate", "plaza",
  "plead", "plumb", "plume", "plump", "plush", "point", "poker", "polar",
  "porch", "pouch", "pound", "power", "press", "price", "pride", "prime",
  "print", "prior", "prism", "prize", "probe", "prone", "proof", "proud",
  "prove", "proxy", "psalm", "pulse", "punch", "pupil", "purge", "queen",
  "query", "quest", "queue", "quick", "quiet", "quota", "quote", "radar",
  "radio", "raise", "rally", "ranch", "range", "rapid", "ratio", "reach",
  "realm", "rebel", "refer", "reign", "relax", "relay", "relic", "reply",
  "rider", "ridge", "rifle", "rigid", "rinse", "risky", "rival", "river",
  "robin", "rocky", "rogue", "roman", "roost", "rouge", "rough", "round",
  "route", "rover", "royal", "rugby", "ruler", "rumor", "rural", "saint",
  "salad", "salon", "sauce", "sauna", "scale", "scalp", "scare", "scene",
  "scent", "scope", "score", "scout", "scrap", "sedan", "seize", "sense",
  "serum", "serve", "setup", "seven", "shade", "shaft", "shake", "shall",
  "shame", "shape", "share", "shark", "sharp", "shave", "sheer", "sheet",
  "shelf", "shell", "shift", "shine", "shirt", "shock", "shoot", "shore",
  "short", "shout", "shown", "siege", "sight", "sigma", "since", "sixth",
  "sixty", "sized", "skate", "skill", "skull", "slate", "sleep", "slice",
  "slide", "slope", "small", "smart", "smell", "smile", "smoke", "snack",
  "snail", "snake", "solar", "solid", "solve", "sonic", "sorry", "sound",
  "south", "space", "spare", "spark", "speak", "spear", "speed", "spell",
  "spend", "spice", "spike", "spine", "spite", "split", "spoke", "spoon",
  "sport", "spray", "squad", "squid", "stack", "staff", "stage", "stain",
  "stair", "stake", "stale", "stall", "stamp", "stand", "stark", "start",
  "state", "stave", "steal", "steam", "steel", "steep", "steer", "stern",
  "stick", "still", "stock", "stoic", "stoke", "stone", "stood", "stool",
  "store", "stork", "storm", "story", "stout", "stove", "strip", "stuck",
  "study", "stuff", "stump", "stung", "stunt", "style", "suave", "sugar",
  "suite", "summa", "sunny", "super", "surge", "swamp", "swarm", "swear",
  "sweat", "sweep", "sweet", "swept", "swift", "swing", "swirl", "swoop",
  "sword", "sworn", "syrup", "taste", "teach", "teeth", "tempo", "tense",
  "terra", "thank", "theme", "thick", "thief", "thing", "think", "third",
  "thorn", "those", "three", "threw", "throw", "thumb", "tidal", "tiger",
  "tight", "timer", "titan", "title", "toast", "today", "token", "topic",
  "torch", "total", "touch", "tough", "towel", "tower", "toxic", "trace",
  "track", "trade", "trail", "train", "trait", "tread", "treat", "trend",
  "trial", "tribe", "trick", "tried", "troop", "truck", "truly", "trunk",
  "trust", "truth", "tulip", "tuner", "tunic", "twist", "ultra", "uncle",
  "under", "union", "unite", "unity", "until", "upper", "upset", "urban",
  "usage", "usual", "utter", "valid", "valor", "value", "valve", "vapor",
  "vault", "vegan", "venue", "verge", "verse", "vigor", "villa", "vinyl",
  "viola", "viral", "virus", "visit", "vista", "vital", "vivid", "vocal",
   "vodka", "vogue", "voice", "voter", "vowel", "wages", "wagon", "waste",
   // Latin-origin & brandable words commonly used in domain compounds
   "opus", "apex", "nexus", "axis", "crux", "flux", "lux", "pax", "rex", "vox",
   "praxis", "thesis", "genesis", "aura", "circa", "coda", "ethos", "modus",
   "aegis", "atlas", "helix", "onyx", "zenith", "cipher", "sigil",
  "watch", "water", "weary", "weave", "wedge", "whale", "wheat", "wheel",
  "where", "which", "while", "whirl", "white", "whole", "whose", "wider",
  "widow", "woman", "women", "world", "worse", "worst", "worth", "would",
  "wound", "wrath", "write", "wrong", "wrote", "yacht", "yearn", "yield",
  "young", "youth", "zebra",
  // ─── GOOGLE TOP 5,000 FREQUENCY LIST (comprehensive coverage) ───
  // These words come from Google's Trillion Word Corpus frequency analysis.
  // Duplicates with existing entries are harmlessly ignored by the Set.
  // Common nouns & concepts
  "information", "page", "site", "time", "service", "system", "post", "policy",
  "number", "message", "software", "rights", "version", "section", "results",
  "office", "design", "technology", "community", "subject", "management",
  "code", "website", "location", "text", "rating", "rate", "government",
  "return", "shopping", "profile", "form", "content", "country", "listing",
  "article", "source", "process", "training", "categories", "conditions",
  "category", "register", "library", "features", "industry", "plan",
  "cost", "test", "application", "feedback", "comment", "topic",
  "standard", "equipment", "programs", "problem", "performance",
  "language", "options", "experience", "rates", "additional", "password",
  "question", "changes", "status", "range", "building", "analysis",
  "request", "picture", "areas", "committee", "meeting", "reference",
  "companies", "learning", "delivery", "term", "stories", "reports",
  "president", "original", "discussion", "agreement", "society",
  "edition", "marketing", "association", "authority", "traffic",
  "strategy", "testing", "enterprise", "educational", "leading",
  "alternative", "vacation", "century", "assistance", "dating",
  "vehicle", "outdoor", "morning", "politics", "membership",
  "functions", "pressure", "reader", "programming", "minimum",
  "variety", "understanding", "capacity", "officer",
  "trip", "progress", "coast", "benefit", "vision", "situation",
  "currency", "determine", "satellite", "graduate", "label",
  "thinking", "provider", "accounting", "professor", "context",
  "techniques", "task", "component", "apartment", "reserve",
  "counter", "failure", "weekend", "dollar", "native", "movement",
  "printing", "baseball", "chart", "adventure", "profit",
  "instance", "pair", "reform", "confidence", "terminal",
  "liquid", "loop", "salary", "prepare", "contest", "suitable",
  "formula", "packaging", "reliable", "classroom", "democracy",
  "romance", "instrument", "heaven", "excess", "disaster",
  "console", "alarm", "algorithm", "substance", "lecture",
  "simulation", "alive", "exhibition", "prefer", "cabinet",
  "evaluate", "composition", "mutual", "existence", "everyday",
  "transit", "attempt", "climate", "alcohol", "instruction",
  "conflict", "concern", "heritage", "trouble", "audience",
  "chemistry", "template", "soil", "psychology", "wildlife",
  "symbol", "highway", "chocolate", "cotton", "supplier",
  "border", "ancient", "debate", "biography", "leisure",
  "notebook", "historic", "upcoming", "concert", "comedy",
  "efficient", "commitment", "carrier", "constant", "lifestyle",
  "consistent", "securities", "volunteer", "formal", "contribute",
  "supreme", "tank", "estimate", "encourage", "inspection",
  "cancel", "territory", "transaction", "outlet", "execution",
  "disability", "winner", "episode", "painting", "committed",
  "extensive", "affordable", "universe", "candidate", "patent",
  "outstanding", "perspective", "tournament", "catalog",
  "empire", "resume", "twenty", "consent", "chamber",
  "province", "reliable", "earn", "spy", "gap", "tube",
  "jacket", "rail", "maker", "secret", "bath", "healthy",
  "interview", "framework", "truck", "gain", "depth",
  "concept", "reality", "origin", "gaming", "billion",
  "destination", "intelligence", "route", "battle",
  "wire", "compact", "poetry", "wheel", "angel", "bell",
  "pin", "raw", "explain", "lane", "mathematics", "export",
  "describe", "heritage", "immediate", "plug", "cook",
  "hat", "bike", "organic", "seek", "circle",
  "bond", "scope", "ancient", "pregnancy", "comedy",
  "commitment", "carrier", "constant", "linked", "gun",
  "reflect", "lesson", "qualified", "lens", "engineer",
  "consistent", "genre", "volunteer", "formal", "processor",
  "contribute", "hockey", "mile", "bowl", "tank",
  "estimate", "navy", "kid", "inspection", "territory",
  "novel", "pan", "winner", "episode", "dish",
  "painting", "extensive", "affordable", "candidate", "patent",
  "slot", "outstanding", "perspective", "mirror", "tournament",
  "kernel", "catalog", "golden", "empire", "drama",
  "contest", "boot", "suitable", "push", "muscle",
  "sum", "chicken", "shower", "oak", "beer",
  "formula", "packaging", "catch", "classroom", "instrument",
  "romance", "heaven", "disaster", "console", "alarm",
  "craft", "cake", "algorithm", "cafe", "sand",
  "joy", "actor", "absolute", "pipe", "simulation",
  "exhibition", "cabinet", "composition", "mutual", "prison",
  "desert", "escape", "combat", "dust", "imagine",
  "captain", "fantastic", "busy", "taste", "wing",
  "belt", "jacket", "rail", "pilot", "delay",
  "maker", "roll", "bath", "healthy", "interview",
  "mix", "framework", "queen", "truck", "bear", "gain",
  "ocean", "depth", "train", "explore", "concept", "reality",
  "origin", "billion", "destination", "intelligence", "route",
  "battle", "wire", "compact", "poetry", "wheel", "transit",
  "angel", "bell", "climate", "pin", "alcohol", "instruction",
  "raw", "sharp", "lane", "export", "conflict", "employer",
  "describe", "concern", "heritage", "trouble", "coach",
  "expand", "audience", "plug", "cook", "hat", "bike",
  "plate", "organic", "chemistry", "logic", "prince",
  "circle", "soil", "psychology", "wildlife", "exit",
  "arm", "wave", "launch", "trail", "symbol", "highway",
  "bond", "chocolate", "cotton", "scope", "border", "ancient",
  "debate", "biography", "leisure", "notebook", "historic",
  "crazy", "upcoming", "concert", "comedy", "efficient",
  // Additional high-frequency words (positions ~2000-5000 in Google corpus)
  "diet", "gear", "piece", "sheet", "firm", "random", "pricing",
  "fashion", "coverage", "giving", "chance", "ending", "goal",
  "sold", "developing", "palm", "actual", "spot", "factory",
  "interior", "grow", "optical", "promotion", "amazing",
  "identity", "relief", "hidden", "reasonable", "serial",
  "importance", "recipe", "bedroom", "pets", "ride",
  "specifically", "bureau", "stress", "dinner", "lawyers",
  "trends", "patterns", "marketplace", "advisor", "competitive",
  "exist", "tracking", "preparation", "accordance", "noise",
  "forget", "accurate", "establish", "stranger", "sustainable",
  "beds", "mention", "innovation", "stable", "definitions",
  "asset", "scan", "elections", "reaction", "blank",
  "enhanced", "severe", "generate", "bulk", "fabric",
  "primarily", "tight", "contrast", "recommendation", "flying",
  "recruitment", "expensive", "capture", "seed", "desire",
  "expertise", "mechanism", "camping", "meets", "welfare",
  "peer", "driven", "measured", "bottle", "innovative",
  "massage", "rubber", "conclusion", "closing", "thousand",
  "meat", "legend", "grace", "monster", "villa",
  "bone", "collaboration", "detection", "gate", "holder",
  "settlement", "duties", "valuable", "tone", "forever",
  "dragon", "busy", "captain", "fantastic", "imagine",
  "heating", "leg", "neck", "wing", "purchasing",
  "taste", "dealing", "commit", "tiny", "operational",
  "rail", "liberal", "trips", "gap", "tube",
  "belt", "lease", "animation", "console", "commands",
  "giant", "alarm", "voltage", "vinyl", "mining",
  "ongoing", "worst", "betting", "scientist", "liberty",
  "era", "convert", "analyst", "dangerous", "garage",
  "exciting", "reliability", "attachment", "pleasure",
  "honor", "pray", "appointment", "quiet", "luck",
  "producer", "cheese", "comic", "jet", "productivity",
  "investors", "crown", "underground", "diagnosis", "maker",
  "crack", "principle", "semester", "appearance", "smoke",
  "filters", "incorporated", "apart", "fellow", "blind",
  "lounge", "mad", "semi", "coins", "gross",
  "strongly", "cafe", "horror", "familiar", "capable",
  "admission", "shoe", "victory", "sand", "joy",
  "ethnic", "citizen", "vertical", "structural", "municipal",
  "prize", "absolute", "substance", "prohibited", "pipe",
  "guardian", "lecture", "simulation", "concentration",
  "alive", "temple", "prove", "discovered", "wings",
  "genetic", "restrictions", "promise", "thin", "exhibition",
  "prefer", "ridge", "cabinet", "dose", "evaluate",
  "tropical", "collect", "bet", "composition",
  "vector", "buffer", "purple", "existence", "commentary",
  "developments", "immigration", "destinations", "mutual",
  "pipeline", "syntax", "attribute", "prison", "skill",
  "chairs", "everyday", "surrounding", "mountains", "popularity",
  "inquiry", "exhibit", "throw", "trend", "visible",
  "desert", "oldest", "coordinator", "navigate", "worse",
  "summit", "fundamental", "burning", "escape", "coupons",
  "receiver", "substantial", "progressive", "boats", "glance",
  "arcade", "impossible", "obvious", "fiber", "depression",
  "graph", "covering", "platinum", "judgment", "talks",
  "filing", "foster", "modeling", "passing", "awarded",
  "trials", "tissue", "masters", "bonds", "fraud",
  "electricity", "spectrum", "arrival", "emphasis", "aspect",
  "workplace", "awesome", "confirmed", "lift", "desired",
  "closer", "shadow", "riding", "infection", "expense",
  "grove", "venture", "clinic", "healing", "princess",
  "mall", "spray", "studios", "involvement", "buttons",
  "placement", "extend", "motorcycle", "yard", "disclosure",
  "memories", "tourist", "adequate", "senator",
  "presentations", "pour", "digest", "lodging", "dust",
  "hence", "entirely", "replaced", "radar", "rescue",
  "losses", "combat", "reducing", "occupation", "lakes",
  "donations", "closely", "radiation", "diary", "kings",
  "shooting", "adds", "specialist", "affect",
  "institution", "plate", "bike", "indicate", "proceedings",
  "transmission", "characteristics", "lose", "organic", "seek",
  "equivalent", "chemistry", "neighborhood", "variables",
  "agenda", "continues", "advisory", "curriculum", "logic",
  "template", "prince", "circle", "soil", "grants",
  "psychology", "wildlife", "appliances", "cooking",
  "speaking", "unlimited", "respond", "plain", "exit",
  "wave", "launch", "checking", "holy", "guidance",
  "mesh", "trail", "enforcement", "symbol", "crafts",
  "highway", "setup", "poll", "booking", "fiscal",
  "celebrity", "bond", "channels", "chocolate", "portion",
  "scope", "supplier", "cotton", "controlled", "requirement",
  "biology", "dental", "border", "ancient", "debate",
  "pregnancy", "biography", "leisure", "learned",
  "notebook", "historic", "attached", "husband", "crazy",
  "upcoming", "concert", "retirement", "comedy", "efficient",
  "commitment", "carrier", "constant", "linked",
  "pure", "gun", "reflect", "deliver", "wonder",
  "lesson", "fruit", "qualified", "reform", "lens",
  "confidence", "warm", "engineer", "lifestyle", "consistent",
  "replace", "sugar", "crew", "stick", "securities",
  "genre", "volunteer", "bound", "processor", "formal",
  "contribute", "lock", "hockey", "storm", "micro",
  "mile", "bowl", "supreme", "tank", "estimate",
  "encourage", "navy", "kid", "inspection", "cancel",
  "territory", "transaction", "pilot", "outlet", "novel",
  "pan", "execution", "disability", "winner", "episode",
  "dish", "painting", "committed", "extensive", "affordable",
  "universe", "candidate", "patent", "slot", "outstanding",
  "perspective", "mirror", "tournament", "kernel",
  "catalog", "golden", "empire", "drama", "contest",
  "boot", "suitable", "push", "muscle", "sum",
  "chicken", "shower", "shell", "province", "oak", "beer",
  "formula", "solar", "catch", "reliable", "sir",
  "doubt", "earn", "classroom", "democracy", "spy",
  "romance", "instrument", "split", "heaven", "proud",
  "excess", "disaster", "console", "alarm", "usual",
  "craft", "cake", "mad", "algorithm", "cafe", "sand",
  "joy", "actor", "absolute", "pipe", "lecture",
  "simulation", "alive", "exhibition", "prefer", "cabinet",
  "evaluate", "composition", "mutual", "existence", "skill",
  "prison", "desert", "escape", "radar", "combat",
  "dust", "imagine", "captain", "fantastic", "busy",
  "taste", "wing", "gap", "tube", "belt", "jacket",
  "rail", "pilot", "outlet", "maker", "roll", "secret",
  "bath", "perform", "healthy", "interview", "mix",
  "framework", "queen", "truck", "bear", "gain",
  "ocean", "depth", "train", "explore", "concept",
  "reality", "origin", "billion", "destination", "intelligence",
  "route", "battle", "wire", "compact", "poetry",
  "wheel", "transit", "angel", "bell", "climate",
  "pin", "alcohol", "instruction", "raw", "sharp",
  "lane", "export", "conflict", "employer", "describe",
  "concern", "heritage", "trouble", "coach", "expand",
  "audience", "plug", "cook", "hat", "bike",
  // Common words often used as domain names (supplementary)
  "able", "acid", "aged", "also", "area", "army", "away",
  "baby", "ball", "band", "bank", "barn", "base", "bean",
  "bear", "beat", "beer", "bell", "best", "bill", "bird",
  "bite", "blow", "blue", "blur", "boat", "body", "bomb",
  "bond", "bone", "boom", "born", "boss", "both", "bowl",
  "bulk", "burn", "busy", "buzz", "cage", "calm", "came",
  "camp", "cape", "card", "care", "cart", "case", "cast",
  "cave", "cell", "chat", "chip", "chop", "city", "clay",
  "clip", "club", "clue", "coal", "code", "cold", "colt",
  "come", "cook", "cool", "cope", "copy", "cord", "core",
  "corn", "coup", "crew", "crop", "crow", "cure", "curl",
  "cute", "dare", "dark", "dash", "data", "dawn", "dead",
  "deal", "dear", "deck", "deed", "deem", "deep", "deny",
  "desk", "dial", "diet", "dirt", "dock", "does", "dome",
  "done", "doom", "dose", "down", "draw", "drew", "drop",
  "drum", "dual", "dull", "dump", "dune", "dusk", "dust",
  "duty", "each", "earn", "ease", "echo", "edge", "edit",
  "emit", "envy", "epic", "even", "ever", "evil", "face",
  "fact", "fade", "fail", "fair", "fall", "fame", "farm",
  "fate", "fear", "feat", "feed", "feel", "fell", "file",
  "fill", "film", "find", "fine", "fire", "firm", "fish",
  "fist", "flag", "flat", "fled", "flip", "flow", "foam",
  "fold", "folk", "fond", "fool", "foot", "ford", "form",
  "fort", "foul", "free", "from", "fuel", "full", "fund",
  "fury", "fuse", "gain", "gala", "gale", "game", "gang",
  "gave", "gaze", "gear", "gene", "gift", "girl", "glad",
  "glow", "glue", "goal", "goes", "gold", "golf", "gone",
  "good", "grab", "gray", "grew", "grey", "grid", "grim",
  "grip", "grow", "gulf", "guru", "gust", "guys", "hack",
  "hail", "hair", "half", "halt", "hand", "hang", "harm",
  "harp", "hate", "haul", "have", "head", "heap", "hear",
  "heat", "heel", "held", "helm", "help", "herb", "herd",
  "hero", "hide", "high", "hike", "hill", "hint", "hire",
  "hold", "hole", "holy", "hook", "host", "hour", "howl",
  "huge", "hull", "hung", "hunt", "hurt", "hype", "icon",
  "inch", "info", "into", "iron", "item", "jack", "jail",
  "jest", "jobs", "join", "joke", "jump", "jury", "just",
  "keen", "keep", "kept", "kick", "kill", "kind", "king",
  "kiss", "knit", "knot", "know", "lace", "lack", "laid",
  "lake", "lamb", "lamp", "land", "lane", "last", "late",
  "lawn", "lead", "leaf", "lean", "leap", "left", "lend",
  "lens", "less", "lied", "lieu", "life", "lift", "like",
  "limb", "lime", "limp", "line", "link", "lion", "list",
  "live", "load", "loan", "lock", "loft", "logo", "lone",
  "long", "look", "lord", "lore", "lose", "loss", "lost",
  "love", "luck", "lump", "lure", "lurk", "made", "mail",
  "main", "make", "male", "mall", "malt", "mane", "many",
  "mare", "mark", "mass", "mast", "mate", "maze", "meal",
  "mean", "meat", "melt", "memo", "mend", "menu", "mere",
  "mesh", "mess", "mild", "milk", "mill", "mime", "mind",
  "mine", "mint", "miss", "mist", "moat", "mock", "mode",
  "mold", "mood", "moon", "more", "moss", "most", "moth",
  "move", "much", "muse", "must", "myth", "nail", "name",
  "navy", "near", "neat", "neck", "need", "nest", "nets",
  "next", "nick", "nine", "node", "none", "norm", "nose",
  "note", "noun", "odds", "omit", "once", "only", "onto",
  "ooze", "open", "oral", "ours", "oust", "oven", "over",
  "pace", "pack", "pact", "page", "paid", "pail", "pain",
  "pair", "pale", "palm", "pane", "para", "park", "part",
  "pass", "past", "path", "peak", "peel", "peer", "perk",
  "pest", "pick", "pier", "pike", "pile", "pine", "pink",
  "pipe", "plan", "play", "plea", "plot", "plow", "ploy",
  "plum", "plop", "plug", "plus", "poem", "poet", "pole",
  "poll", "polo", "pond", "pool", "poor", "pope", "pork",
  "port", "pose", "post", "pour", "pray", "prey", "prop",
  "pull", "pump", "pure", "push", "quit", "quiz", "race",
  "rack", "rage", "raid", "rain", "rank", "rare", "rash",
  "rate", "rave", "read", "real", "reap", "rear", "reef",
  "reel", "rely", "rent", "rest", "rich", "ride", "riff",
  "rift", "ring", "riot", "rise", "risk", "road", "roam",
  "robe", "rock", "rode", "role", "roof", "room", "root",
  "rope", "rose", "ruin", "rule", "rush", "rust", "sack",
  "safe", "saga", "sage", "said", "sake", "sale", "salt",
  "same", "sand", "sane", "sang", "save", "scan", "seal",
  "seam", "seat", "seed", "seek", "seem", "seen", "self",
  "sell", "send", "sent", "shed", "ship", "shop", "shot",
  "show", "shut", "sick", "side", "sigh", "sign", "silk",
  "sing", "sink", "site", "size", "skip", "slab", "slam",
  "slap", "slip", "slow", "slug", "snap", "snow", "soak",
  "soar", "sock", "soft", "sole", "some", "soon", "sore",
  "sort", "soul", "sour", "span", "spec", "spin", "spit",
  "spot", "stab", "star", "stay", "stem", "step", "stew",
  "stop", "stir", "stud", "suck", "suit", "sulk", "sung",
  "sunk", "sure", "surf", "swap", "sway", "swim", "tail",
  "take", "tale", "talk", "tall", "tame", "tang", "tank",
  "tape", "tart", "taxi", "team", "tear", "tech", "tell",
  "tend", "tent", "term", "text", "that", "them", "then",
  "they", "this", "thus", "tick", "tide", "tidy", "tier",
  "tile", "till", "time", "tiny", "tips", "tire", "toad",
  "told", "toll", "tomb", "tone", "took", "tool", "tops",
  "tore", "torn", "toss", "tour", "town", "trap", "tray",
  "tree", "trek", "trim", "trio", "trip", "trot", "true",
  "tube", "tuck", "tuft", "tune", "turn", "twin", "type",
  "ugly", "undo", "unit", "upon", "urge", "used", "user",
  "vain", "vale", "vane", "vary", "vast", "veil", "vein",
  "vent", "verb", "very", "vest", "veto", "vice", "view",
  "vine", "void", "volt", "vote", "wade", "wage", "wait",
  "wake", "walk", "wand", "want", "ward", "warn", "warp",
  "wars", "wary", "wash", "wave", "wavy", "ways", "weak",
  "wear", "weed", "week", "weep", "well", "went", "were",
  "west", "what", "when", "whom", "wick", "wide", "wife",
  "wild", "will", "wilt", "wily", "wind", "wine", "wing",
  "wink", "wipe", "wire", "wise", "wish", "with", "woke",
  "wolf", "wood", "wool", "word", "wore", "work", "worm",
  "worn", "wrap", "yard", "year", "yell", "zero", "zinc",
  "zone", "zoom",
  // ─── COMPREHENSIVE 3-LETTER ENGLISH WORDS ───
  // Every valid 3-letter English word for maximum +25 bonus coverage
  "aah", "aal", "aas", "aba", "abs", "aby", "act", "add", "ado", "ads",
  "adz", "aff", "aft", "aga", "age", "ago", "ags", "aha", "ahi", "ahs",
  "aid", "ail", "aim", "ain", "air", "ais", "ait", "ala", "alb", "ale",
  "all", "alp", "als", "alt", "ama", "ami", "amp", "amu", "ana", "and",
  "ane", "ani", "ant", "any", "ape", "apo", "app", "apt", "arb", "arc",
  "are", "arf", "ark", "arm", "ars", "art", "ash", "ask", "asp", "ass",
  "ate", "att", "auk", "ava", "ave", "avo", "awa", "awe", "awl", "awn",
  "axe", "aye", "azo", "baa", "bad", "bag", "bam", "ban", "bap", "bar",
  "bas", "bat", "bay", "bed", "bee", "beg", "ben", "bet", "bib", "bid",
  "big", "bin", "bio", "bis", "bit", "biz", "bob", "bod", "bog", "bop",
  "bot", "bow", "box", "boy", "bra", "bro", "brr", "bub", "bud", "bug",
  "bum", "bun", "bur", "bus", "but", "buy", "cab", "cad", "cam", "can",
  "cap", "car", "cat", "caw", "cay", "cee", "chi", "cig", "cis", "cob",
  "cod", "cog", "col", "con", "coo", "cop", "cor", "cos", "cot", "cow",
  "cox", "coy", "coz", "cry", "cub", "cud", "cue", "cup", "cur", "cut",
  "cwm", "dab", "dad", "dag", "dah", "dak", "dal", "dam", "dap", "daw",
  "day", "deb", "dee", "del", "den", "dev", "dew", "dex", "dey", "dib",
  "did", "die", "dif", "dig", "dim", "din", "dip", "dis", "dit", "doc",
  "doe", "dog", "dol", "dom", "don", "dop", "dor", "dos", "dot", "dow",
  "dry", "dub", "dud", "due", "dug", "duh", "dui", "dun", "duo", "dup",
  "dye", "ear", "eat", "eau", "ebb", "ecu", "edh", "eds", "eel", "egg",
  "ego", "eke", "eld", "elf", "elk", "ell", "elm", "els", "eme", "ems",
  "emu", "end", "eng", "ens", "eon", "era", "ere", "erg", "ern", "err",
  "ers", "ess", "eta", "eth", "eve", "ewe", "eye", "fab", "fad", "fag",
  "fan", "far", "fas", "fat", "fax", "fay", "fed", "fee", "fem", "fen",
  "fer", "fes", "fet", "feu", "few", "fey", "fez", "fib", "fid", "fie",
  "fig", "fin", "fir", "fis", "fit", "fix", "fiz", "flu", "fly", "fob",
  "foe", "fog", "foh", "fon", "fop", "for", "fou", "fox", "foy", "fro",
  "fry", "fub", "fud", "fug", "fun", "fur", "gab", "gad", "gae", "gag",
  "gal", "gam", "gan", "gap", "gar", "gas", "gat", "gay", "ged", "gee",
  "gel", "gem", "gen", "get", "gey", "ghi", "gib", "gid", "gie", "gig",
  "gin", "gip", "git", "gnu", "goa", "gob", "god", "goo", "gor", "gos",
  "got", "gox", "goy", "gul", "gum", "gun", "gup", "gus", "gut", "guv",
  "guy", "gym", "gyp", "had", "hag", "hah", "haj", "ham", "hao", "hap",
  "has", "hat", "haw", "hay", "heh", "hem", "hen", "hep", "her", "hes",
  "het", "hew", "hex", "hey", "hic", "hid", "hie", "him", "hin", "hip",
  "his", "hit", "hob", "hod", "hoe", "hog", "hop", "hot", "how", "hoy",
  "hub", "hue", "hug", "huh", "hum", "hun", "hup", "hut", "hyp", "ice",
  "ick", "icy", "ids", "iff", "ifs", "igg", "ilk", "ill", "imp", "ink",
  "inn", "ins", "ion", "ire", "irk", "ism", "its", "ivy", "jab", "jag",
  "jam", "jar", "jaw", "jay", "jee", "jet", "jib", "jig", "jin", "job",
  "joe", "jog", "jot", "joy", "jug", "jun", "jus", "jut", "kab", "kae",
  "kaf", "kas", "kat", "kay", "kea", "ked", "keg", "ken", "kep", "kex",
  "key", "kid", "kin", "kip", "kit", "koa", "kob", "koi", "kop", "kor",
  "kos", "lab", "lac", "lad", "lag", "lam", "lap", "lar", "las", "lat",
  "lav", "law", "lax", "lay", "lea", "led", "lee", "leg", "lei", "lek",
  "les", "let", "leu", "lev", "lex", "ley", "lib", "lid", "lie", "lil",
  "lin", "lip", "lis", "lit", "log", "loo", "lop", "lot", "low", "lox",
  "lug", "luv", "lux", "lye", "mac", "mad", "mae", "mag", "man", "map",
  "mar", "mas", "mat", "maw", "max", "may", "med", "meg", "mel", "mem",
  "men", "met", "mew", "mid", "mig", "mil", "mim", "mir", "mis", "mix",
  "moa", "mob", "mod", "mog", "mol", "mom", "mon", "moo", "mop", "mor",
  "mos", "mot", "mow", "mud", "mug", "mum", "mun", "mus", "mut", "myc",
  "nab", "nae", "nag", "nah", "nam", "nan", "nap", "naw", "nay", "neb",
  "nee", "net", "new", "nib", "nil", "nim", "nip", "nit", "nix", "nob",
  "nod", "nog", "nom", "noo", "nor", "nos", "not", "now", "nub", "nun",
  "nut", "oaf", "oak", "oar", "oat", "obe", "oca", "odd", "ode", "ods",
  "oes", "off", "oft", "ohm", "oho", "ohs", "oil", "oka", "old", "ole",
  "oms", "one", "ono", "ons", "ooh", "oot", "ope", "ops", "opt", "ora",
  "orb", "orc", "ore", "ors", "ort", "ose", "oud", "our", "out", "ova",
  "owe", "owl", "own", "oxo", "oxy", "pac", "pad", "pah", "pal", "pam",
  "pan", "pap", "par", "pas", "pat", "paw", "pax", "pay", "pea", "pec",
  "ped", "pee", "peg", "peh", "pen", "pep", "per", "pes", "pet", "pew",
  "phi", "pic", "pie", "pig", "pin", "pip", "pis", "pit", "piu", "pix",
  "ply", "pod", "poi", "pol", "pom", "poo", "pop", "pot", "pow", "pox",
  "pro", "pry", "psi", "pub", "pud", "pug", "pul", "pun", "pup", "pus",
  "put", "pya", "pye", "qat", "qis", "qua", "rad", "rag", "rah", "rai",
  "raj", "ram", "ran", "rap", "ras", "rat", "raw", "rax", "ray", "reb",
  "rec", "red", "ree", "ref", "reg", "rei", "rem", "rep", "res", "ret",
  "rev", "rex", "rho", "ria", "rib", "rid", "rif", "rig", "rim", "rin",
  "rip", "rob", "roc", "rod", "roe", "rom", "rot", "row", "rub", "rue",
  "rug", "rum", "run", "rut", "rya", "rye", "sab", "sac", "sad", "sae",
  "sag", "sal", "sap", "sat", "sau", "saw", "sax", "say", "sea", "sec",
  "see", "seg", "sei", "sel", "sen", "ser", "set", "sew", "sha", "she",
  "shh", "shy", "sib", "sic", "sim", "sin", "sip", "sir", "sis", "sit",
  "six", "ska", "ski", "sky", "sly", "sob", "sod", "sol", "som", "son",
  "sop", "sos", "sot", "sou", "sow", "sox", "soy", "spa", "spy", "sri",
  "sty", "sub", "sue", "sum", "sun", "sup", "suq", "tab", "tad", "tae",
  "tag", "taj", "tam", "tan", "tao", "tap", "tar", "tas", "tat", "tau",
  "tav", "taw", "tax", "tea", "ted", "tee", "ten", "tet", "tew", "the",
  "thy", "tic", "tie", "til", "tin", "tip", "tis", "tit", "tod", "toe",
  "tog", "tom", "ton", "too", "top", "tor", "tot", "tow", "toy", "try",
  "tsk", "tub", "tug", "tui", "tun", "tup", "tut", "tux", "twa", "two",
  "tye", "udo", "ugh", "uke", "ule", "ulu", "umm", "ump", "uni", "uns",
  "upo", "ups", "urb", "urd", "urn", "urp", "use", "uta", "ute", "uts",
  "vac", "van", "var", "vas", "vat", "vau", "vav", "vaw", "vee", "veg",
  "vet", "vex", "via", "vid", "vie", "vig", "vim", "vis", "voe", "vow",
  "vox", "vug", "wab", "wad", "wae", "wag", "wan", "wap", "war", "was",
  "wat", "waw", "wax", "way", "web", "wed", "wee", "wen", "wet", "wha",
  "who", "why", "wig", "win", "wis", "wit", "wiz", "woe", "wok", "won",
  "woo", "wop", "wos", "wot", "wow", "wry", "wud", "wye", "wyn", "yak",
  "yam", "yap", "yar", "yaw", "yay", "yea", "yeh", "yen", "yep", "yes",
  "yet", "yew", "yid", "yin", "yip", "yob", "yod", "yok", "yom", "yon",
  "you", "yow", "yuk", "yum", "yup", "zag", "zap", "zed", "zee", "zek",
  "zen", "zep", "zig", "zin", "zip", "zit", "zoo",
  // ─── COMPREHENSIVE 4-LETTER WORDS (high-value domainer words) ───
  "able", "aces", "ache", "acme", "acne", "aide", "aims", "ally", "alto",
  "amid", "ammo", "amps", "ante", "anti", "apex", "aqua", "arch", "arid",
  "atop", "avid", "axes", "axle", "babe", "bach", "bait", "bald", "bale",
  "balm", "bane", "bang", "bare", "bark", "barn", "bash", "bask", "bass",
  "bead", "beak", "beam", "bear", "beck", "beep", "beet", "bell", "bend",
  "bent", "berg", "best", "bias", "bike", "bile", "bind", "bird", "blog",
  "blot", "blur", "boar", "boat", "bode", "body", "bold", "bolt", "bomb",
  "bond", "bone", "boom", "boon", "bore", "born", "boss", "bout", "brag",
  "brat", "brew", "brim", "bulk", "bull", "bump", "burp", "byte", "cafe",
  "cage", "cake", "call", "came", "cane", "cape", "card", "cash", "cask",
  "cent", "chap", "chin", "cite", "clan", "clap", "claw", "clod", "clot",
  "clue", "coat", "code", "coil", "coin", "cold", "colt", "comb", "cone",
  "cook", "cool", "cope", "copy", "cord", "cork", "coup", "cove", "crab",
  "cram", "crew", "crib", "crop", "crow", "cube", "cult", "curb", "cure",
  "curl", "curt", "cusp", "daft", "dale", "dame", "damp", "dare", "darn",
  "dart", "dash", "data", "dawn", "daze", "deaf", "deal", "dean", "dear",
  "debt", "deck", "deed", "deem", "deer", "deft", "demo", "dent", "deny",
  "desk", "dial", "dice", "dime", "dire", "dirt", "disc", "dock", "dojo",
  "dole", "dome", "doom", "dose", "dove", "down", "doze", "drab", "drag",
  "dram", "drip", "drop", "drug", "drum", "dual", "dubs", "duck", "dude",
  "duel", "duet", "duke", "dull", "dune", "dung", "dunk", "dupe", "dusk",
  "duty", "dyer", "dyke", "each", "earl", "ease", "echo", "edge", "edit",
  "emit", "epic", "euro", "even", "evil", "exam", "expo", "eyed", "face",
  "fact", "fade", "fads", "fail", "fair", "fake", "fall", "fame", "fang",
  "fare", "farm", "fast", "fate", "fawn", "faze", "feat", "feed", "feel",
  "fend", "fern", "fest", "fiat", "fief", "file", "fill", "film", "find",
  "fine", "fire", "fist", "five", "fizz", "flag", "flak", "flan", "flap",
  "flat", "flaw", "flax", "flea", "fled", "flee", "flex", "flic", "flip",
  "flit", "flog", "flop", "flow", "flue", "flux", "foal", "foam", "foci",
  "foil", "fold", "folk", "fond", "font", "food", "fool", "foot", "ford",
  "fore", "fork", "form", "fort", "foul", "four", "fowl", "fray", "free",
  "frog", "from", "fuel", "full", "fume", "fund", "funk", "fury", "fuse",
  "fuss", "fuzz", "gait", "gala", "gale", "gall", "game", "gang", "gape",
  "garb", "gash", "gasp", "gate", "gave", "gawk", "gaze", "gear", "geek",
  "gene", "germ", "gift", "gild", "gilt", "gist", "glad", "glen", "glib",
  "glob", "glow", "glue", "glum", "glut", "gnaw", "goad", "goal", "goat",
  "goes", "gold", "golf", "gone", "gong", "good", "gore", "gory", "gown",
  "grab", "gram", "gray", "grew", "grid", "grim", "grin", "grip", "grit",
  "grog", "grok", "grow", "grub", "gulf", "gull", "gulp", "guru", "gush",
  "gust", "guts", "hack", "hail", "hair", "hale", "half", "hall", "halo",
  "halt", "hams", "hand", "hang", "hank", "hard", "hare", "harm", "harp",
  "hash", "haste", "hate", "haul", "have", "hawk", "haze", "hazy", "head",
  "heal", "heap", "hear", "heat", "heed", "heel", "heft", "heir", "held",
  "helm", "help", "hemp", "herd", "here", "hero", "hide", "high", "hike",
  "hill", "hilt", "hind", "hint", "hire", "hiss", "hive", "hoax", "hock",
  "hoist", "hold", "hole", "holy", "home", "hone", "hood", "hoof", "hook",
  "hoop", "hope", "horn", "hose", "host", "hour", "howl", "hubs", "huff",
  "huge", "hull", "hump", "hunk", "hunt", "hurl", "hurt", "hush", "hymn",
  "hype", "icon", "idle", "idol", "iffy", "inch", "info", "inks", "inns",
  "into", "iron", "isle", "itch", "item", "jack", "jade", "jail", "jape",
  "java", "jazz", "jean", "jeer", "jerk", "jest", "jibe", "jilt", "jinx",
  "jive", "jobs", "jock", "join", "joke", "jolt", "josh", "jump", "junk",
  "jury", "just", "jute", "keen", "keep", "kelp", "kept", "kern", "kick",
  "kill", "kilt", "kind", "king", "kirk", "kiss", "kite", "kiwi", "knab",
  "knack", "knee", "knew", "knit", "knob", "knot", "know", "lace", "lack",
  "lacy", "lady", "lair", "lake", "lame", "lamp", "land", "lane", "lard",
  "lark", "lash", "lass", "last", "late", "laud", "lava", "lawn", "laws",
  "lazy", "lead", "leaf", "leak", "lean", "leap", "left", "lend", "lens",
  "lent", "less", "levy", "liar", "lick", "lien", "lieu", "life", "lift",
  "like", "lily", "limb", "lime", "limp", "line", "link", "lint", "lion",
  "lips", "list", "lite", "live", "load", "loaf", "loam", "loan", "lobe",
  "lock", "lode", "loft", "logo", "loin", "lone", "long", "look", "loom",
  "loon", "loop", "loot", "lord", "lore", "lose", "loss", "lost", "loti",
  "loud", "love", "luck", "luge", "lull", "lump", "lure", "lurk", "lush",
  "lust", "lute", "lynx", "lyre", "mace", "made", "mage", "maid", "mail",
  "main", "make", "male", "mall", "malt", "mane", "many", "mare", "mark",
  "mars", "mart", "mash", "mask", "mass", "mast", "mate", "math", "maul",
  "maze", "mead", "meal", "mean", "meat", "meek", "meet", "mega", "meld",
  "melt", "memo", "mend", "menu", "mere", "mesa", "mesh", "mess", "mica",
  "mild", "mile", "milk", "mill", "mime", "mind", "mine", "mini", "mint",
  "mire", "miss", "mist", "mite", "mitt", "moan", "moat", "mock", "mode",
  "mojo", "mold", "molt", "monk", "mood", "moon", "moor", "moot", "more",
  "moss", "most", "moth", "move", "much", "muck", "muff", "mugs", "mule",
  "mull", "mung", "murk", "muse", "mush", "musk", "must", "mute", "myth",
  "nada", "nail", "name", "nape", "navy", "near", "neat", "neck", "need",
  "neon", "nerd", "nest", "nets", "news", "next", "nice", "nick", "nine",
  "nits", "node", "none", "nook", "norm", "nose", "note", "noun", "nova",
  "nude", "null", "numb", "nuts", "oafs", "oaks", "oars", "oath", "oats",
  "obey", "odds", "odor", "offs", "ogle", "ogre", "oils", "oily", "okay",
  "omen", "omit", "once", "ones", "only", "onto", "ooze", "opal", "open",
  "opts", "opus", "oral", "orca", "ores", "oust", "oven", "over", "owed",
  "owes", "owls", "owns", "oxen", "pace", "pack", "pact", "page", "paid",
  "pail", "pain", "pair", "pale", "pall", "palm", "pane", "pang", "papa",
  "pare", "park", "part", "pass", "past", "pave", "pawn", "pays", "peak",
  "pear", "peas", "peat", "peck", "peel", "peep", "peer", "pelt", "pend",
  "pens", "peon", "peps", "peri", "perk", "perm", "pert", "peso", "pest",
  "pets", "pick", "pier", "pike", "pile", "pill", "pine", "ping", "pink",
  "pins", "pint", "pipe", "pith", "pits", "pity", "plan", "plat", "play",
  "plea", "plod", "plop", "plot", "plow", "ploy", "plug", "plum", "plus",
  "pock", "pods", "poem", "poet", "poke", "pole", "poll", "polo", "pomp",
  "pond", "pony", "pool", "poop", "poor", "pope", "pops", "pore", "pork",
  "port", "pose", "posh", "post", "pour", "pout", "pray", "prep", "prey",
  "prig", "prim", "prod", "prof", "prom", "prop", "pros", "prow", "prude",
  "prune", "pubs", "puck", "puff", "pugs", "pull", "pulp", "pump", "punk",
  "puns", "pupa", "pups", "pure", "push", "puts", "putt", "quiz", "race",
  "rack", "raft", "rage", "rags", "raid", "rail", "rain", "rake", "ramp",
  "rams", "rang", "rank", "rant", "raps", "rash", "rasp", "rate", "rave",
  "rays", "raze", "read", "real", "ream", "reap", "rear", "reed", "reef",
  "reek", "reel", "rein", "rely", "rend", "rent", "repo", "rest", "rich",
  "ride", "rife", "rift", "rill", "rime", "rind", "ring", "riot", "ripe",
  "rise", "risk", "rite", "road", "roam", "roar", "robe", "rock", "rode",
  "roil", "role", "roll", "romp", "roof", "rook", "room", "root", "rope",
  "rose", "rosy", "rote", "rout", "rove", "rude", "ruff", "rugs", "ruin",
  "rule", "rump", "rune", "rung", "runs", "runt", "ruse", "rush", "rust",
  "ruts", "sack", "safe", "saga", "sage", "sags", "said", "sail", "sake",
  "sale", "salt", "same", "sand", "sane", "sang", "sank", "sari", "sash",
  "save", "saws", "says", "scab", "scam", "scan", "scar", "seal", "seam",
  "sear", "seas", "seat", "sect", "seed", "seek", "seem", "seen", "seep",
  "seer", "self", "sell", "semi", "send", "sent", "sept", "serf", "sewn",
  "shed", "shin", "ship", "shod", "shoe", "shoo", "shop", "show", "shun",
  "shut", "siam", "sick", "side", "sift", "sigh", "sign", "silk", "sill",
  "silo", "silt", "sing", "sink", "sips", "sire", "site", "sits", "size",
  "skid", "skim", "skin", "skip", "skit", "slab", "slag", "slam", "slap",
  "slat", "slaw", "slay", "sled", "slew", "slid", "slim", "slit", "slob",
  "sloe", "slog", "slop", "slot", "slow", "slug", "slum", "slur", "smog",
  "smug", "snag", "snap", "snip", "snit", "snob", "snot", "snow", "snub",
  "snug", "soak", "soap", "soar", "sock", "soda", "sofa", "soft", "soil",
  "sold", "sole", "solo", "some", "song", "soon", "soot", "sore", "sort",
  "soul", "soup", "sour", "span", "spar", "spat", "spec", "sped", "spin",
  "spit", "spot", "spry", "spur", "stab", "stag", "star", "stay", "stem",
  "step", "stew", "stir", "stop", "stub", "stud", "stun", "such", "suck",
  "suds", "suit", "sulk", "sumo", "sump", "sung", "sunk", "sure", "surf",
  "swab", "swam", "swan", "swap", "swat", "sway", "swim", "swum", "sync",
  "tabs", "tack", "taco", "tact", "tags", "tail", "take", "talc", "tale",
  "talk", "tall", "tame", "tamp", "tang", "tank", "tape", "taps", "tarn",
  "tarp", "tart", "task", "taxi", "teak", "teal", "team", "tear", "teat",
  "tech", "teem", "tell", "temp", "tend", "tens", "tent", "term", "tern",
  "test", "text", "than", "thaw", "them", "then", "they", "thin", "this",
  "thud", "thug", "thus", "tick", "tide", "tidy", "tied", "tier", "ties",
  "tiff", "tile", "till", "tilt", "time", "tine", "ting", "tins", "tiny",
  "tips", "tire", "toad", "toil", "told", "toll", "tomb", "tome", "tone",
  "tong", "tons", "took", "tool", "tops", "tore", "torn", "tort", "toss",
  "tote", "tour", "tout", "town", "toys", "tram", "trap", "tray", "tree",
  "trek", "trem", "trim", "trio", "trip", "trod", "trot", "true", "tsar",
  "tuba", "tube", "tubs", "tuck", "tuft", "tugs", "tulip", "tuna", "tune",
  "turf", "turn", "tusk", "tutu", "twig", "twin", "twit", "type", "typo",
  "ugly", "undo", "unit", "unto", "upon", "urge", "used", "user", "uses",
  "vain", "vale", "vane", "vary", "vase", "vast", "vats", "veal", "veer",
  "veil", "vein", "vend", "vent", "verb", "very", "vest", "veto", "vial",
  "vibe", "vice", "vied", "view", "vile", "vine", "visa", "void", "vole",
  "volt", "vote", "vows", "wade", "waft", "wage", "wail", "wait", "wake",
  "walk", "wall", "wand", "wane", "want", "ward", "ware", "warm", "warn",
  "warp", "wars", "wart", "wary", "wash", "wasp", "wave", "wavy", "waxy",
  "ways", "weak", "weal", "wean", "wear", "weed", "week", "weep", "weld",
  "well", "welt", "went", "wept", "were", "west", "wham", "what", "when",
  "whet", "whey", "whig", "whim", "whip", "whir", "whit", "whiz", "whom",
  "wick", "wide", "wife", "wigs", "wild", "will", "wilt", "wily", "wimp",
  "wind", "wine", "wing", "wink", "wino", "wipe", "wire", "wise", "wish",
  "wisp", "with", "wits", "woes", "woke", "wolf", "womb", "wont", "wood",
  "woof", "wool", "word", "wore", "work", "worm", "worn", "wove", "wrap",
  "wren", "writ", "yack", "yaks", "yank", "yaps", "yard", "yarn", "yawl",
  "yawn", "yawp", "year", "yell", "yelp", "yens", "yeoman", "yews", "yoga",
  "yoke", "yolk", "yore", "your", "yowl", "yuan", "yule", "zeal", "zebu",
  "zephyr", "zero", "zest", "zinc", "zing", "zips", "zone", "zoom", "zoos",
  // ─── COMPREHENSIVE 5-LETTER WORDS (brandable & compound building blocks) ───
  "abbot", "abide", "abort", "about", "above", "abuse", "abyss", "adapt",
  "adept", "admin", "admit", "adopt", "adult", "aegis", "afoot", "after",
  "again", "agave", "agent", "aging", "aglow", "agree", "ahold", "aisle",
  "alarm", "album", "alder", "algae", "alias", "alibi", "align", "alive",
  "allay", "alley", "allot", "allow", "alloy", "aloft", "alone", "along",
  "aloof", "alpha", "altar", "alter", "amass", "amaze", "amber", "amble",
  "amend", "ample", "amply", "angel", "anger", "angle", "angry", "ankle",
  "annex", "anvil", "apart", "apple", "apply", "arena", "argue", "arise",
  "armor", "aroma", "arose", "array", "arrow", "aside", "asset", "atone",
  "audio", "audit", "avert", "avian", "avoid", "await", "awake", "award",
  "aware", "awful", "bacon", "badge", "badly", "baker", "balmy", "baron",
  "based", "basic", "basin", "basis", "batch", "beach", "beast", "begin",
  "being", "belly", "below", "bench", "berry", "birth", "bison", "black",
  "blade", "blame", "bland", "blank", "blast", "blaze", "bleed", "bless",
  "blimp", "blind", "bliss", "blitz", "block", "blond", "blood", "blown",
  "blues", "bluff", "blunt", "board", "boast", "bonus", "booby", "boost",
  "booth", "borax", "bound", "brace", "braid", "brain", "brake", "brand",
  "brass", "brave", "bravo", "bread", "break", "breed", "brick", "bride",
  "brief", "brine", "bring", "brink", "brisk", "broad", "broil", "broke",
  "brook", "brood", "brown", "brunt", "brush", "brute", "buddy", "budge",
  "build", "built", "bulge", "bumpy", "bunch", "burst", "buyer", "cabal",
  "cache", "cadet", "camel", "cameo", "candy", "canoe", "caper", "cargo",
  "carol", "carry", "carve", "catch", "cater", "cause", "cedar", "chain",
  "chair", "chalk", "champ", "chant", "chaos", "charm", "chart", "chase",
  "cheap", "cheat", "check", "cheek", "cheer", "chess", "chest", "chick",
  "chief", "child", "chill", "chime", "china", "chirp", "choke", "chord",
  "chore", "chose", "chunk", "cider", "cigar", "cinch", "circa", "civic",
  "civil", "claim", "clamp", "clang", "clank", "clash", "clasp", "class",
  "claws", "clean", "clear", "clerk", "click", "cliff", "climb", "cling",
  "clink", "cloak", "clock", "clone", "close", "cloth", "cloud", "clout",
  "clown", "clubs", "cluck", "coast", "cobra", "cocoa", "comet", "comic",
  "coral", "couch", "could", "count", "coupe", "court", "cover", "covet",
  "crack", "craft", "cramp", "crane", "crash", "crate", "crave", "crawl",
  "craze", "crazy", "creak", "cream", "creek", "creep", "crest", "crime",
  "crisp", "cross", "crowd", "crown", "crude", "cruel", "crush", "crust",
  "cubic", "curry", "curse", "curve", "cycle", "daily", "dairy", "dance",
  "datum", "debut", "decal", "decay", "decor", "decoy", "decry", "defer",
  "deity", "delay", "delta", "delve", "demon", "demur", "denim", "dense",
  "depot", "derby", "depth", "deter", "detox", "devil", "diary", "digit",
  "diner", "dirty", "disco", "ditch", "divert", "dizzy", "dodge", "doing",
  "donor", "doubt", "dough", "dowdy", "draft", "drain", "drake", "drama",
  "drape", "drawl", "drawn", "dread", "dream", "dress", "dried", "drift",
  "drill", "drink", "drive", "droit", "drone", "drool", "droop", "drops",
  "dross", "drove", "drown", "drunk", "dryer", "duchy", "dully", "dummy",
  "dunce", "dwarf", "dwell", "eager", "eagle", "early", "earth", "easel",
  "eaten", "eater", "eaves", "ebony", "eclat", "edict", "eight", "elbow",
  "elder", "elect", "elite", "elope", "elude", "email", "embed", "ember",
  "emcee", "emery", "emote", "empty", "enact", "endow", "enemy", "enjoy",
  "ennui", "ensue", "enter", "entry", "envoy", "epoch", "equal", "equip",
  "erase", "erode", "error", "essay", "ethic", "evade", "event", "every",
  "evict", "evoke", "exact", "exalt", "exile", "exist", "expat", "expel",
  "extra", "exude", "exult", "fable", "facet", "faint", "fairy", "faith",
  "false", "fancy", "farce", "fatal", "fatty", "fault", "fauna", "feast",
  "feign", "feint", "felon", "femur", "fence", "ferry", "fetal", "fetch",
  "fever", "fewer", "fiber", "fibre", "field", "fiend", "fiery", "fifth",
  "fifty", "fight", "filth", "final", "finch", "finer", "first", "fixed",
  "fizzy", "fjord", "flack", "flair", "flake", "flaky", "flame", "flank",
  "flare", "flash", "flask", "fleet", "flesh", "flick", "fling", "flint",
  "float", "flock", "flood", "floor", "flora", "floss", "flour", "flout",
  "fluid", "fluke", "flung", "flunk", "flush", "flute", "focal", "foggy",
  "folly", "force", "forge", "forgo", "forte", "forth", "forty", "forum",
  "found", "frame", "frank", "fraud", "freak", "freed", "fresh", "friar",
  "fried", "frill", "frisk", "fritz", "front", "frost", "froze", "frugal",
  "fruit", "fully", "fungi", "funky", "funny", "furry", "fuzzy", "gaily",
  "gamma", "gamut", "gauge", "gaunt", "gauze", "genre", "ghost", "giant",
  "giddy", "given", "gland", "glare", "glass", "glaze", "gleam", "glean",
  "glide", "glint", "glitch", "globe", "gloom", "glory", "gloss", "glove",
  "gnash", "golem", "goose", "gorge", "gouge", "gourd", "grace", "grade",
  "graft", "grain", "grand", "grant", "grape", "graph", "grasp", "grass",
  "grate", "grave", "gravy", "graze", "greed", "green", "greet", "grief",
  "grill", "grind", "gripe", "groan", "groin", "groom", "grope", "gross",
  "group", "grout", "grove", "growl", "grown", "gruel", "grunt", "guard",
  "guess", "guest", "guide", "guild", "guilt", "guise", "gulch", "gully",
  "gummy", "gusto", "gusty", "gypsy", "habit", "haiku", "happy", "harsh",
  "haste", "hasty", "haunt", "haven", "havoc", "hazel", "heart", "heave",
  "heavy", "hedge", "hefty", "heist", "hello", "hence", "herbs", "heron",
  "hitch", "hoard", "hobby", "homer", "honey", "honor", "horse", "hotel",
  "hound", "house", "hover", "human", "humid", "humor", "hunky", "hurry",
  "husky", "hyena", "hyper", "icing", "ideal", "idiom", "idiot", "image",
  "imbue", "imply", "incur", "index", "indie", "inept", "inert", "infer",
  "ingot", "inner", "input", "inter", "intro", "ionic", "irate", "irony",
  "ivory", "jaunt", "jazzy", "jelly", "jewel", "jiffy", "joker", "jolly",
  "joust", "judge", "juice", "juicy", "jumbo", "jumpy", "juror", "karma",
  "kayak", "kebab", "khaki", "kinky", "kiosk", "knack", "knead", "kneel",
  "knelt", "knife", "knock", "knoll", "known", "koala", "kudos", "label",
  "labor", "lance", "lanky", "lapse", "large", "larva", "laser", "latch",
  "later", "latex", "lathe", "layer", "leach", "leafy", "learn", "lease",
  "leash", "least", "leave", "ledge", "legal", "legit", "lemon", "lemur",
  "level", "lever", "libel", "light", "lilac", "liken", "limit", "linen",
  "liner", "lingo", "liven", "llama", "lobby", "local", "lodge", "lofty",
  "logic", "login", "loofa", "loose", "lorry", "lotus", "lousy", "lover",
  "lower", "loyal", "lucid", "lucky", "lunar", "lunch", "lunge", "lusty",
  "lyric", "macro", "mafia", "magic", "magma", "major", "manor", "maple",
  "march", "marsh", "mason", "masse", "match", "mayor", "mealy", "meant",
  "medal", "media", "medic", "melee", "melon", "mercy", "merit", "merry",
  "metal", "meter", "metro", "micro", "midst", "might", "mimic", "mince",
  "miner", "minor", "minus", "mirth", "miser", "mixer", "mocha", "model",
  "modem", "mogul", "moist", "molar", "money", "month", "moose", "moral",
  "moron", "morph", "mossy", "motel", "motif", "motor", "motto", "mound",
  "mount", "mourn", "mouse", "mouth", "mover", "movie", "muddy", "mulch",
  "mural", "murky", "mushy", "music", "musty", "muted", "naive", "nerve",
  "nervy", "never", "newly", "nexus", "nicer", "niche", "night", "nimby",
  "ninja", "noble", "nobly", "noise", "noisy", "nomad", "north", "notch",
  "noted", "novel", "nudge", "nurse", "nylon", "oasis", "occur", "ocean",
  "oddly", "offer", "often", "olive", "omega", "onset", "opera", "optic",
  "orbit", "order", "organ", "other", "otter", "ought", "ounce", "outer",
  "outdo", "owned", "owner", "oxide", "ozone", "paddy", "pager", "paint",
  "panel", "panic", "pants", "paper", "party", "paste", "pasty", "patch",
  "patio", "pause", "payee", "peace", "peach", "pearl", "pecan", "pedal",
  "penal", "pence", "penny", "perch", "peril", "perky", "perms", "phase",
  "phone", "photo", "piano", "picky", "piece", "piggy", "pilot", "pinch",
  "piper", "pitch", "pithy", "pivot", "pixel", "pizza", "place", "plaid",
  "plain", "plane", "plank", "plant", "plate", "plaza", "plead", "pleat",
  "plier", "pluck", "plumb", "plume", "plump", "plums", "plunk", "plush",
  "plyer", "poach", "point", "poise", "poker", "polar", "polka", "polyp",
  "pooch", "poppy", "porch", "posed", "poser", "potty", "pouch", "pound",
  "power", "prank", "prawn", "press", "price", "prick", "pride", "prime",
  "primo", "print", "prior", "prism", "privy", "prize", "probe", "prodigy",
  "prone", "prong", "proof", "prose", "proud", "prove", "prowl", "proxy",
  "prude", "prune", "psalm", "pudgy", "pulse", "punch", "pupil", "puppy",
  "purge", "purse", "pushy", "pygmy", "quack", "qualm", "quart", "quasi",
  "queen", "query", "quest", "queue", "quick", "quiet", "quill", "quirk",
  "quota", "quote", "rabbi", "racer", "radar", "radio", "radon", "rager",
  "raise", "rally", "ranch", "range", "rapid", "rarer", "ratio", "raven",
  "rayon", "razor", "reach", "react", "ready", "realm", "rebel", "rebus",
  "recap", "recur", "refer", "regal", "reign", "relax", "relay", "relic",
  "remit", "renew", "repay", "repel", "reply", "rerun", "reset", "resin",
  "retry", "reuse", "revel", "rhyme", "rider", "ridge", "rifle", "rigid",
  "rigor", "rinse", "risky", "rival", "river", "rivet", "roast", "robin",
  "robot", "rocky", "rodeo", "rogue", "roost", "rouge", "rough", "round",
  "rouse", "route", "rover", "rowdy", "royal", "rugby", "ruins", "ruler",
  "rumba", "rumor", "rupee", "rural", "rusty", "saber", "saint", "salad",
  "salon", "salsa", "salty", "salve", "sandy", "sapid", "sassy", "satin",
  "sauce", "saucy", "sauna", "savor", "savvy", "scale", "scalp", "scald",
  "scaly", "scamp", "scant", "scare", "scarf", "scary", "scene", "scent",
  "scone", "scoop", "scope", "score", "scorn", "scout", "scowl", "scram",
  "scrap", "scree", "screw", "scrub", "sedan", "seize", "sense", "sepia",
  "serif", "serum", "serve", "setup", "seven", "sever", "shack", "shade",
  "shady", "shaft", "shake", "shaky", "shall", "shame", "shape", "shard",
  "share", "shark", "sharp", "shave", "shawl", "shear", "sheen", "sheer",
  "sheet", "shelf", "shell", "shift", "shine", "shiny", "shire", "shirt",
  "shoal", "shock", "shoot", "shore", "short", "shout", "shove", "shown",
  "shrub", "shrug", "shrub", "shuck", "shunt", "siege", "sight", "sigma",
  "since", "sinew", "sixth", "sixty", "sized", "skate", "skiff", "skill",
  "skimp", "skull", "skunk", "slack", "slain", "slang", "slant", "slash",
  "slate", "slave", "sleek", "sleep", "sleet", "slice", "slide", "slime",
  "slimy", "sling", "slink", "slope", "sloth", "slugs", "slump", "slurp",
  "smack", "small", "smart", "smash", "smell", "smelt", "smile", "smirk",
  "smith", "smock", "smoke", "smoky", "snack", "snafu", "snail", "snake",
  "snare", "snarl", "sneak", "sneer", "snide", "sniff", "snipe", "snore",
  "snort", "snout", "snowy", "snuff", "soggy", "solar", "solid", "solve",
  "sonar", "sonic", "sorry", "sound", "south", "space", "spade", "spare",
  "spark", "spawn", "speak", "spear", "specs", "speed", "spell", "spend",
  "spent", "spice", "spicy", "spiel", "spike", "spill", "spine", "spiny",
  "spite", "split", "spoke", "spoof", "spook", "spoon", "spore", "sport",
  "spout", "spray", "spree", "sprout", "spunk", "spurn", "squad", "squat",
  "squid", "stack", "staff", "stage", "staid", "stain", "stair", "stake",
  "stale", "stalk", "stall", "stamp", "stand", "stank", "staph", "stare",
  "stark", "start", "stash", "state", "stave", "stays", "steak", "steal",
  "steam", "steel", "steep", "steer", "stern", "stick", "stiff", "still",
  "sting", "stink", "stint", "stock", "stoic", "stoke", "stole", "stomp",
  "stone", "stood", "stool", "stoop", "store", "stork", "storm", "story",
  "stout", "stove", "strap", "straw", "stray", "strip", "strut", "stuck",
  "study", "stuff", "stump", "stung", "stunk", "stunt", "style", "suave",
  "sugar", "suite", "sulky", "sunny", "super", "surge", "swamp", "swank",
  "swarm", "swath", "swear", "sweat", "sweep", "sweet", "swell", "swept",
  "swift", "swill", "swine", "swing", "swipe", "swirl", "swoon", "swoop",
  "sword", "swore", "sworn", "swung", "syrup", "tabby", "table", "tacit",
  "taffy", "taint", "taken", "taker", "talon", "tango", "tangy", "tapir",
  "tardy", "tarot", "taste", "tasty", "taunt", "tawny", "taxes", "teach",
  "tears", "tease", "tempo", "tempt", "tenet", "tenor", "tense", "tenth",
  "tepid", "terra", "terse", "thank", "theft", "theme", "there", "these",
  "thick", "thief", "thigh", "thing", "think", "third", "thorn", "those",
  "three", "threw", "throw", "thrum", "thumb", "thump", "tiara", "tidal",
  "tiger", "tight", "timer", "timid", "tinge", "titan", "title", "toast",
  "today", "token", "tonal", "tonic", "tooth", "topaz", "topic", "torch",
  "total", "totem", "touch", "tough", "towel", "tower", "toxic", "trace",
  "track", "tract", "trade", "trail", "train", "trait", "tramp", "trash",
  "trawl", "tread", "treat", "trend", "triad", "trial", "tribe", "trick",
  "tried", "trill", "tripe", "trite", "troll", "troop", "trout", "trove",
  "truce", "truck", "truly", "trump", "trunk", "truss", "trust", "truth",
  "tubby", "tuber", "tulip", "tumor", "tuner", "tunic", "turbo", "tutor",
  "twang", "tweak", "tweed", "tweet", "twerp", "twice", "twill", "twine",
  "twirl", "twist", "tycoon", "udder", "ultra", "umbra", "uncle", "under",
  "undue", "unfit", "unify", "union", "unite", "unity", "unlit", "until",
  "upper", "upset", "urban", "usage", "usher", "usual", "utter", "uvula",
  "vague", "valid", "valor", "value", "valve", "vapor", "vault", "vaunt",
  "vegan", "venue", "verge", "verse", "vigor", "villa", "vinyl", "viola",
  "viper", "viral", "visor", "visit", "vista", "vital", "vivid", "vixen",
  "vocal", "vodka", "vogue", "voice", "voter", "vouch", "vowel", "vulva",
  "wacky", "wader", "wafer", "wager", "wages", "wagon", "waist", "waive",
  "waltz", "watch", "water", "waver", "weary", "weave", "wedge", "weedy",
  "weigh", "weird", "whale", "wheat", "wheel", "where", "which", "while",
  "whiff", "whine", "whiny", "whirl", "whisk", "white", "whole", "whose",
  "widen", "wider", "widow", "width", "wield", "windy", "winch", "woman",
  "women", "woods", "woody", "world", "wormy", "worry", "worse", "worst",
  "worth", "would", "wound", "wrack", "wrath", "wreak", "wreck", "wring",
  "wrist", "write", "wrong", "wrote", "yacht", "yearn", "yeast", "yield",
  "young", "youth", "zebra", "zippy", "zombi",
  // ─── COMPREHENSIVE 6-LETTER WORDS (compound building blocks & brandable) ───
  "absorb", "absurd", "accent", "accept", "access", "accord", "accrue", "accuse",
  "across", "action", "active", "actual", "addict", "adjust", "admire", "advent",
  "advice", "advise", "aerial", "affair", "affect", "affirm", "afford", "agenda",
  "agenda", "aghast", "almost", "amount", "anchor", "annual", "anyone", "anyway",
  "appeal", "appear", "arctic", "arisen", "armada", "around", "arrive", "artery",
  "artist", "ashram", "aspire", "assert", "assess", "assign", "assist", "assume",
  "assure", "attach", "attain", "attend", "attest", "autumn", "avatar", "avenge",
  "babble", "badger", "baffle", "ballot", "bamboo", "bandit", "banter", "barber",
  "barely", "barley", "barren", "basket", "battle", "beacon", "beauty", "beckon",
  "become", "befall", "before", "behalf", "behave", "behind", "belong", "bemoan",
  "benign", "beside", "bestow", "betray", "better", "beware", "beyond", "bisect",
  "bishop", "blanch", "blazer", "bleach", "blouse", "blurry", "bodily", "bolster",
  "bomber", "bonnet", "bounce", "bounty", "braise", "breach", "breath", "breeze",
  "bridle", "bright", "broach", "bronze", "bruise", "bubble", "bucket", "budget",
  "buffet", "bumble", "bundle", "bunker", "burden", "bureau", "burner", "burrow",
  "bushel", "bustle", "butter", "button", "bypass", "cactus", "canopy", "canyon",
  "carbon", "career", "carpet", "carrot", "casino", "castle", "cattle", "causal",
  "cavern", "cellar", "cement", "census", "center", "centre", "cereal", "chalet",
  "chance", "change", "chapel", "charge", "chrome", "chunks", "church", "cipher",
  "circle", "citrus", "claims", "classy", "clause", "clergy", "clever", "client",
  "climax", "clinic", "clique", "closed", "closet", "clumsy", "coarse", "cobalt",
  "cobble", "cockle", "coddle", "coerce", "coffee", "coffin", "column", "combat",
  "comedy", "coming", "commit", "common", "compel", "comply", "convex", "convoy",
  "cookie", "cooler", "copper", "corner", "corona", "corpse", "cosmos", "cotton",
  "cougar", "county", "couple", "coupon", "course", "cousin", "covers", "coward",
  "coyote", "cradle", "crafty", "cranky", "crater", "craven", "create", "credit",
  "creepy", "crisis", "crispy", "critic", "crotch", "crouch", "cruise", "crunch",
  "cuddle", "cumuli", "cupola", "curfew", "cursor", "curtsy", "custom", "cutout",
  "dainty", "damage", "dampen", "dancer", "danger", "dapper", "daring", "darken",
  "dazzle", "debris", "decade", "deceit", "decent", "decide", "decode", "decore",
  "decree", "deduce", "defeat", "defect", "defend", "define", "deftly", "degree",
  "deject", "delete", "deluge", "demand", "demise", "denote", "dental", "depart",
  "depend", "depict", "deploy", "derive", "desert", "design", "desire", "detach",
  "detail", "detect", "detour", "device", "devise", "devote", "devour", "dialog",
  "differ", "digest", "dilemma", "dilute", "dimple", "dinner", "dipped", "direct",
  "disarm", "discus", "dismay", "divine", "doctor", "dollar", "domain", "donkey",
  "double", "doting", "doubtful", "draper", "dredge", "drench", "driven", "driver",
  "droopy", "duplex", "during", "earthy", "easily", "eating", "edible", "editor",
  "effect", "effort", "eighth", "elapse", "eleven", "elicit", "emerge", "empire",
  "employ", "enable", "endear", "ending", "endure", "energy", "engage", "engine",
  "engulf", "enough", "enrich", "enroll", "ensure", "entail", "entice", "entire",
  "entity", "entomb", "envied", "equity", "errand", "escape", "esprit", "estate",
  "esteem", "ethics", "evenly", "evolve", "exceed", "except", "excise", "excite",
  "excuse", "exempt", "exhale", "exhort", "exodus", "exotic", "expand", "expect",
  "expert", "expire", "export", "expose", "extend", "extent", "extern", "eyelet",
  "fabric", "facial", "factor", "fairly", "falcon", "famine", "famous", "fathom",
  "fealty", "fellow", "ferret", "fervid", "fester", "fickle", "fiddle", "fierce",
  "figure", "filled", "filler", "finale", "finder", "finish", "fiscal", "flashy",
  "flavor", "flimsy", "flinch", "floppy", "floral", "florid", "fluent", "fluffy",
  "flying", "fodder", "follow", "fondle", "forage", "forbid", "forced", "forest",
  "forget", "formal", "format", "former", "fossil", "foster", "fought", "frenzy",
  "friday", "fringe", "frisky", "frosty", "frozen", "frugal", "fumble", "furious",
  "fusion", "futile", "future", "gadget", "gaffer", "galaxy", "gallon", "gambit",
  "gamble", "gander", "garage", "garden", "garlic", "garner", "garnet", "gather",
  "geezer", "gender", "genius", "gentle", "gently", "giggle", "ginger", "glacial",
  "glance", "global", "gloomy", "glossy", "gobble", "goblet", "golden", "gospel",
  "gossip", "gothic", "govern", "gravel", "grassy", "grater", "gravel", "grazer",
  "grease", "greasy", "grille", "grimly", "grocer", "groove", "groovy", "ground",
  "growth", "grumpy", "gutter", "gyrate", "hackle", "hamper", "handle", "happen",
  "harbor", "harden", "hardly", "harken", "harmon", "harness", "hasten", "hatred",
  "hazard", "headed", "healer", "health", "hearth", "heated", "heater", "heaven",
  "height", "helmet", "herbal", "heroic", "hidden", "hiking", "hinder", "hollow",
  "honest", "hookup", "hoping", "horrid", "horror", "hostel", "hostile", "huddle",
  "hugely", "humble", "humbly", "humming", "hunger", "hungry", "hunter", "hurdle",
  "hybrid", "ignore", "illume", "imbibe", "immune", "impact", "impair", "impart",
  "impede", "import", "impose", "impure", "incite", "income", "indeed", "indoor",
  "induce", "infant", "infect", "inflow", "inform", "infuse", "ingest", "inject",
  "injure", "inland", "inmate", "innate", "insect", "insert", "inside", "insist",
  "insole", "insult", "insure", "intact", "intend", "intent", "intern", "intone",
  "invade", "invent", "invest", "invite", "invoke", "inward", "island", "itself",
  "jabber", "jacket", "jargon", "jersey", "jiggle", "jigsaw", "jingle", "jogger",
  "jostle", "jovial", "juggle", "jumble", "jumper", "jungle", "junior", "juries",
  "justle", "kettle", "kidney", "kindle", "kindly", "knight", "launch", "lavish",
  "lawful", "lawyer", "layout", "league", "legacy", "lender", "lesson", "letter",
  "likely", "linger", "liquid", "listen", "litter", "lively", "lizard", "locust",
  "locker", "lonely", "loosen", "lovely", "lumber", "luxury", "madden", "magnet",
  "maiden", "mainly", "making", "malice", "manage", "mangle", "manner", "mantle",
  "manual", "marble", "margin", "marina", "marine", "market", "marvel", "master",
  "matter", "mature", "mayhem", "meadow", "medium", "mellow", "memoir", "memory",
  "menace", "mental", "mentor", "merger", "method", "metric", "middle", "mighty",
  "mingle", "mirror", "mishap", "modern", "modest", "modify", "moment", "morsel",
  "mortal", "mosque", "mostly", "motion", "motive", "muffin", "mumble", "murder",
  "murmur", "muscle", "museum", "muster", "muzzle", "mystic", "namely", "napkin",
  "narrow", "nation", "nature", "nearby", "nearly", "neatly", "nestle", "nickel",
  "nimble", "nimbly", "nobles", "nobody", "noodle", "normal", "notary", "notice",
  "notion", "novice", "nozzle", "nudity", "number", "nutmeg", "oblong", "obtain",
  "occult", "occupy", "offend", "office", "offset", "onward", "opener", "openly",
  "oppose", "option", "oracle", "orange", "ordain", "ordeal", "origin", "osprey",
  "others", "outfit", "outlaw", "outlet", "output", "outset", "overdo", "oxygen",
  "oyster", "pacify", "paddle", "pallet", "pamper", "pander", "pantry", "papaya",
  "parcel", "pardon", "parent", "parish", "parody", "parrot", "parsec", "partly",
  "patron", "patter", "pebble", "peddle", "pellet", "pelvis", "pencil", "people",
  "pepper", "period", "permit", "person", "petite", "phenol", "phenom", "phlegm",
  "piazza", "picket", "pickle", "pierce", "pigeon", "pillar", "pillow", "pincer",
  "pirate", "pistol", "pledge", "plenty", "pliant", "plunge", "plying", "pocket",
  "podium", "poetry", "poison", "policy", "polish", "polite", "ponder", "portal",
  "poster", "potato", "potent", "potion", "potter", "poultry", "powder", "praise",
  "prayer", "preach", "prefix", "pretty", "profit", "prompt", "propel", "proper",
  "proven", "public", "puddle", "pulpit", "pummel", "punish", "puppet", "purely",
  "purify", "purple", "pursue", "puzzle", "python", "quarry", "quartz", "quench",
  "quietly", "rabbit", "racket", "radial", "radish", "radius", "raffle", "rafter",
  "ragout", "raisin", "ramble", "random", "ransom", "rapids", "rascal", "rather",
  "rattle", "ravage", "reason", "reboot", "recall", "recast", "recipe", "reckon",
  "recoup", "rector", "redeem", "reduce", "refine", "reform", "refuge", "refund",
  "refuse", "regain", "regard", "regime", "region", "rehash", "reject", "relate",
  "relent", "relief", "relish", "reluct", "remain", "remedy", "remind", "remote",
  "remove", "render", "renown", "rental", "repair", "repeal", "repeat", "repent",
  "report", "resent", "reside", "resign", "resist", "resort", "result", "resume",
  "retail", "retain", "retire", "retort", "return", "reveal", "revamp", "review",
  "revive", "revolt", "reward", "ribbon", "riddle", "ripple", "ritual", "robust",
  "rocket", "rotten", "royale", "rubble", "rugged", "rumble", "runway", "rustic",
  "rustle", "sacred", "saddle", "safari", "safety", "saliva", "salmon", "sample",
  "sandal", "sanity", "savage", "scarce", "scenic", "scheme", "scorch", "scroll",
  "search", "season", "second", "secret", "sector", "secure", "seemly", "select",
  "senior", "sensor", "serial", "series", "sermon", "server", "settle", "severe",
  "sewing", "shadow", "shaker", "shanty", "sheath", "shield", "shimmy", "shiver",
  "shrink", "shroud", "shrunk", "sickle", "signal", "silent", "silken", "silver",
  "simmer", "simple", "simply", "single", "siphon", "sketch", "sizzle", "slight",
  "slogan", "smithy", "smooth", "snappy", "snatch", "snazzy", "sneaky", "snitch",
  "social", "socket", "soften", "solemn", "sought", "source", "speech", "speedy",
  "sphere", "spider", "spiral", "spirit", "splash", "sponge", "sporty", "sprain",
  "sprawl", "spread", "sprint", "sprout", "square", "squash", "squeal", "squint",
  "squire", "stable", "static", "statue", "status", "steady", "steamy", "stench",
  "stereo", "sticky", "stingy", "stitch", "stolen", "stooge", "strain", "strand",
  "strata", "streak", "stream", "street", "stress", "stride", "strife", "strike",
  "string", "stripe", "strive", "stroke", "strong", "struck", "studio", "stumpy",
  "stupid", "sturdy", "subdue", "submit", "subtle", "suburb", "sucker", "sudden",
  "suffer", "suffix", "summit", "summon", "sundry", "sunken", "superb", "supple",
  "supply", "surely", "surety", "surfer", "survey", "suture", "swerve", "switch",
  "symbol", "syntax", "syrupy", "system", "tablet", "tackle", "tailor", "tangle",
  "tanker", "target", "tariff", "tavern", "teapot", "temple", "tenant", "tender",
  "tenure", "thatch", "thorny", "thrice", "thrift", "thrill", "thrive", "throat",
  "throng", "throne", "thrown", "thrust", "thwart", "tickle", "tidbit", "timber",
  "timely", "tinder", "tissue", "toggle", "tongue", "trophy", "trough", "truant",
  "tumble", "tumult", "tundra", "tunnel", "turban", "turtle", "tuxedo", "twelve",
  "twenty", "typify", "tyrant", "unfair", "unfold", "unholy", "unique", "united",
  "unless", "unlike", "unlock", "unrest", "unruly", "unseen", "untold", "unveil",
  "unwary", "unwind", "upbeat", "update", "uphold", "uplift", "uproar", "uproot",
  "upshot", "uptake", "uptown", "upward", "usable", "utmost", "utopia", "vacant",
  "vacuum", "valley", "vanish", "vanity", "vastly", "vector", "velvet", "vendor",
  "veneer", "venom", "verily", "vertex", "vessel", "viable", "victim", "vigils",
  "violet", "virgin", "virtue", "vision", "visual", "vivify", "volume", "voodoo",
  "voyage", "vulgar", "waffle", "walker", "wallet", "walnut", "wander", "wanton",
  "warble", "warden", "warmly", "warmth", "warren", "washer", "wealth", "weapon",
  "weaken", "weekly", "weight", "whimsy", "whisky", "wholly", "wicked", "widely",
  "widget", "wiggly", "wildly", "willow", "winder", "window", "winner", "winter",
  "wisdom", "witchy", "wizard", "wobble", "wonder", "wooden", "woolly", "worker",
  "worthy", "wraith", "writhe", "yeoman", "yogurt", "zenith", "zigzag", "zombie",
  // ─── COMPREHENSIVE 7-LETTER WORDS (compound building blocks & premium) ───
  "ability", "abolish", "abridge", "absence", "absolve", "abstain", "academy",
  "acclaim", "account", "achieve", "acrobat", "adamant", "address", "adjourn",
  "admiral", "adorned", "advance", "adverse", "afflict", "agility", "alchemy",
  "aligned", "alleged", "already", "amateur", "amenity", "amplify", "analyst",
  "ancient", "angrily", "anguish", "animate", "another", "antenna", "anthrop",
  "anxiety", "anxious", "anybody", "anytime", "aplenty", "apparel", "applied",
  "appoint", "appraise", "approve", "aptness", "arrange", "article", "artwork",
  "ascetic", "assault", "auction", "audible", "auditor", "augment", "autopsy",
  "average", "awesome", "baggage", "balance", "balloon", "bandage", "banking",
  "baptism", "bargain", "barrier", "battery", "bearing", "because", "bedroom",
  "bedevil", "believe", "beneath", "benefit", "bequest", "besides", "between",
  "bewitch", "billing", "billion", "biscuit", "bizarre", "blanket", "blatant",
  "blazing", "bleeder", "blender", "blemish", "blessed", "blocker", "blunder",
  "bombing", "bonanza", "booklet", "booster", "borough", "bottled", "boulder",
  "bowling", "bracket", "braided", "brewing", "brigade", "bristle", "brittle",
  "broaden", "broader", "broadly", "broiler", "buckets", "buckler", "buffalo",
  "builder", "buildup", "bumping", "burgeon", "cabinet", "caesura", "caliber",
  "calling", "capable", "capital", "captain", "captive", "capture", "cardiac",
  "careful", "caribou", "carrier", "catalog", "caution", "cavalry", "ceiling",
  "central", "ceramic", "certain", "chamber", "channel", "chapter", "charges",
  "charity", "charter", "cheaper", "checked", "cherish", "chicken", "chronic",
  "circuit", "citizen", "claimed", "classic", "cleaner", "cleaned", "clement",
  "climate", "clinics", "closure", "cluster", "coastal", "coaster", "cockpit",
  "coldest", "collect", "college", "collide", "colonel", "combine", "comfort",
  "command", "commend", "comment", "compact", "company", "compare", "compel",
  "compete", "compile", "complex", "compose", "compute", "conceal", "concept",
  "concern", "concise", "condemn", "conduct", "confess", "confide", "confine",
  "confirm", "conform", "confuse", "conjure", "connect", "conquer", "consent",
  "consist", "console", "consort", "consume", "contact", "contain", "contend",
  "content", "contest", "context", "contort", "control", "convene", "convert",
  "convict", "cooking", "cooling", "correct", "council", "counsel", "counter",
  "country", "coupled", "courage", "courses", "covered", "cracker", "cramped",
  "creator", "cricket", "crimson", "crinkle", "crisper", "crucial", "crusade",
  "crystal", "cuisine", "culture", "cunning", "curator", "curious", "current",
  "curtain", "cushion", "custody", "customs", "cyclist", "cypress", "daffodil",
  "damaged", "dancing", "darkest", "darling", "daycare", "dealing", "decided",
  "decline", "decrypt", "deepest", "default", "defence", "deficit", "deflate",
  "delight", "deliver", "density", "deposit", "derived", "descent", "deserve",
  "desired", "desktop", "despair", "despite", "destiny", "destroy", "develop",
  "devoted", "dialect", "diamond", "digital", "dignity", "dilemma", "diploma",
  "discard", "discuss", "disease", "disgust", "dislike", "dismiss", "display",
  "dispose", "dispute", "disrupt", "dissect", "distant", "distill", "distort",
  "disturb", "diverse", "divided", "divulge", "donated", "dormant", "dragged",
  "drawing", "dressed", "drifted", "drilled", "drought", "durable", "dynamic",
  "earlier", "earnest", "eastern", "ecology", "economy", "edifice", "edition",
  "educate", "effects", "elegant", "element", "elevate", "embrace", "emerald",
  "emotion", "emperor", "empower", "enabled", "enacted", "endless", "endowed",
  "enforce", "engaged", "enhance", "environ", "episode", "epitome", "equator",
  "erosion", "essence", "eternal", "evident", "examine", "example", "excited",
  "execute", "exhaust", "exhibit", "expense", "explain", "exploit", "explore",
  "express", "extinct", "extract", "extreme", "factory", "faculty", "failing",
  "failure", "fairway", "fantasy", "farming", "fashion", "fatigue", "feature",
  "federal", "feeding", "fertile", "fervent", "fiction", "fidgety", "fighter",
  "filings", "filling", "finance", "finding", "firefly", "fitness", "fixture",
  "flannel", "flatter", "fledged", "flicker", "flights", "flipper", "flutter",
  "focused", "fondest", "footwear", "forever", "forfeit", "formula", "fortune",
  "forward", "founded", "founder", "fragile", "frankly", "freedom", "freight",
  "freshen", "fretful", "fulfill", "funding", "furnace", "furnish", "further",
  "galahad", "gallery", "gateway", "general", "genesis", "genetic", "genuine",
  "gesture", "ghostly", "glimpse", "glitter", "glorify", "glowing", "glutton",
  "gondola", "goodbye", "gorilla", "gourmet", "governo", "gradual", "granite",
  "graphic", "grapple", "gravity", "greater", "greatly", "grizzly", "grounds",
  "grouper", "growing", "growler", "grumble", "gunshot", "habitat", "halfway",
  "halibut", "hallway", "hamster", "handful", "handout", "hanging", "harmony",
  "harness", "harvest", "haunted", "healthy", "hearten", "heating", "heavily",
  "helpful", "heroine", "heroism", "highway", "himself", "history", "holiday",
  "holster", "honored", "hopeful", "horizon", "hormone", "hosting", "hostage",
  "however", "huddled", "hunting", "hurried", "husband", "hustled", "iceberg",
  "illness", "imagine", "imagery", "immense", "immerse", "implied", "imposed",
  "impress", "imprint", "improve", "impulse", "incline", "include", "indexed",
  "indoors", "indulge", "inflate", "inherit", "inhibit", "initial", "innings",
  "inquire", "inquiry", "inscribe", "insider", "insight", "inspect", "install",
  "instant", "instead", "insulin", "interim", "invalid", "invoice", "involve",
  "isolate", "javelin", "jealous", "jointly", "journal", "journey", "jubilee",
  "justice", "justify", "keynote", "kingdom", "kitchen", "knacker", "knowing",
  "labeled", "lacking", "landing", "lasting", "lateral", "launder", "lawsuit",
  "leading", "leaflet", "learned", "leather", "lecture", "legally", "lending",
  "lengthy", "leopard", "lessons", "liberty", "license", "lighter", "limited",
  "linkage", "literal", "loading", "located", "lodging", "logical", "longest",
  "loyalty", "luggage", "machine", "magical", "magnify", "mammoth", "managed",
  "manager", "mandate", "mankind", "mansion", "mapping", "marital", "martial",
  "massive", "mastery", "matched", "matters", "maximum", "meaning", "measure",
  "medical", "meeting", "melodic", "memento", "mention", "mercury", "message",
  "midterm", "militia", "million", "mindful", "mineral", "minimal", "minimum",
  "miracle", "missing", "mission", "mistake", "mixture", "modular", "mollify",
  "monitor", "monster", "monthly", "morning", "mounted", "mundane", "musical",
  "mustard", "mystery", "mythical", "napping", "narrate", "natural", "nearest",
  "necklace", "needful", "neither", "network", "neutral", "notably", "nothing",
  "noticed", "nucleus", "nurture", "nursing", "obesity", "obliged", "obscure",
  "observe", "obvious", "octagon", "offense", "offered", "officer", "offline",
  "opening", "operate", "opinion", "optimal", "orchard", "organic", "outcome",
  "outdoor", "outlined", "outpost", "outside", "overall", "overlay", "overlap",
  "oversee", "package", "padding", "painful", "painted", "painter", "paladin",
  "pancake", "panther", "parking", "partial", "partner", "passage", "passion",
  "passive", "pastime", "patient", "patriot", "pattern", "payload", "payment",
  "peacock", "peasant", "penalty", "pending", "penguin", "pension", "percent",
  "perfect", "perform", "persist", "persona", "phoenix", "physics", "picking",
  "picture", "pilgrim", "pinnacle", "pioneer", "pivotal", "placebo", "placing",
  "planned", "planner", "plastic", "platter", "playful", "pleased", "pledged",
  "plenary", "plotted", "plumber", "poacher", "podcast", "pointed", "polaris",
  "policed", "politic", "polling", "polygon", "popular", "portion", "posture",
  "potency", "pottery", "poverty", "powered", "prairie", "predict", "premium",
  "prepare", "present", "preside", "pressed", "presume", "prevent", "primate",
  "printer", "privacy", "private", "probing", "problem", "proceed", "process",
  "produce", "product", "profile", "profuse", "program", "project", "prolific",
  "promise", "promote", "prosper", "protect", "protest", "provide", "provoke",
  "prudent", "publish", "pugnant", "pumpkin", "purpose", "pyramid", "qualify",
  "quarrel", "quarter", "quietly", "radical", "railcar", "rainbow", "raising",
  "rampage", "rapidly", "reactor", "readout", "reality", "realize", "receive",
  "reclaim", "recover", "recruit", "recycle", "reduced", "refined", "reflect",
  "refresh", "refugee", "refusal", "regards", "regular", "related", "relaxed",
  "release", "reliant", "remains", "remarks", "remedey", "removal", "removed",
  "renewal", "replace", "replica", "reports", "request", "require", "rescued",
  "reserve", "reshape", "resolve", "respect", "respond", "restore", "retired",
  "retreat", "returns", "reveals", "revenge", "revenue", "reverse", "revival",
  "revolve", "rigging", "rivalry", "roaming", "rooftop", "routine", "running",
  "rushing", "sadness", "salvage", "sandbox", "satisfy", "scatter", "scholar",
  "science", "scripts", "seafood", "section", "segment", "seizure", "seminar",
  "serious", "serpent", "service", "session", "setback", "setting", "settler",
  "several", "sharing", "shelter", "sheriff", "shining", "shipment", "shocked",
  "shortly", "shrivel", "shuffle", "shuttle", "similar", "skilled", "slacker",
  "slender", "slicing", "slither", "smaller", "smarter", "soldier", "solemn",
  "solicit", "solving", "somehow", "soprano", "sparked", "spatial", "speaker",
  "special", "specify", "spinach", "spinner", "sponsor", "squeeze", "stadium",
  "staging", "stamina", "standby", "stapler", "startup", "stealth", "stipend",
  "storage", "strange", "stratum", "stretch", "student", "stunned", "styling",
  "subject", "sublime", "subsidy", "succeed", "success", "suggest", "summary",
  "summons", "sunrise", "support", "supreme", "surface", "surgeon", "surplus",
  "survive", "suspect", "suspend", "sustain", "sweater", "symptom", "tempest",
  "therapy", "thought", "thunder", "tobacco", "tonight", "topmost", "tornado",
  "totally", "touched", "tourism", "tourist", "towards", "tracker", "trading",
  "traffic", "trained", "trainer", "transit", "trapper", "trouble", "trusted",
  "trustee", "tundra", "tuition", "turning", "tweaker", "twelfth", "typical",
  "unified", "uniform", "unknown", "unleash", "unusual", "updated", "upgrade",
  "urgency", "usually", "utility", "uttered", "vacancy", "vaccine", "valiant",
  "variety", "venture", "verdict", "version", "veteran", "vibrant", "victory",
  "village", "vintage", "violate", "virtual", "visible", "visitor", "vitally",
  "voltage", "vouloir", "voucher", "voyager", "warrior", "weather", "website",
  "wedding", "weekend", "welcome", "welfare", "western", "whisper", "whistle",
  "whoever", "wildest", "willing", "windmill", "winding", "winning", "without",
  "witness", "wizards", "worried", "worship", "wrapper", "writing", "written",
  "zealous",
]);

// Trending keywords with heat multipliers (curated from publicly reported aftermarket trends)
export const TRENDING_KEYWORDS: Record<string, number> = {
  // AI / Machine Learning
  "ai": 2.5, "gpt": 2.0, "neural": 1.8, "neura": 1.8, "machine": 1.5, "deep": 1.5, "learn": 1.5,
  "robot": 1.6, "auto": 1.6, "smart": 1.5, "quantum": 2.0, "intel": 1.5,
  "agent": 2.2, "agentic": 2.2, "synthetic": 1.6, "cognitive": 1.5, "spatial": 1.7, "copilot": 1.8, "genai": 2.0, "llm": 1.9,
  // Fintech / Crypto / DeFi
  "pay": 1.8, "bank": 1.8, "cash": 1.6, "loan": 1.5, "credit": 1.6, "finance": 1.8,
  "trade": 1.6, "invest": 1.7, "wallet": 1.5, "token": 1.3, "defi": 1.4, "fintech": 1.8,
  "money": 1.7, "fund": 1.6, "wealth": 1.5, "capital": 1.6, "equity": 1.5, "profit": 1.4,
  // Health & Wellness
  "health": 1.7, "med": 1.5, "fit": 1.4, "care": 1.5, "dental": 1.4, "clinic": 1.4,
  "therapy": 1.3, "mental": 1.3, "wellness": 1.4, "organic": 1.3,
  // E-commerce
  "shop": 1.6, "store": 1.5, "buy": 1.5, "sell": 1.4, "deal": 1.3, "sale": 1.3,
  "market": 1.5, "retail": 1.4, "commerce": 1.5, "cart": 1.3, "order": 1.3,
  // SaaS / Cloud / Tech
  "cloud": 1.7, "tech": 1.6, "code": 1.4, "data": 1.6, "app": 1.4, "web": 1.3,
  "server": 1.3, "host": 1.3, "stack": 1.4, "saas": 1.6, "api": 1.5, "dev": 1.3,
  "cyber": 1.5, "digital": 1.4, "platform": 1.4, "software": 1.3, "system": 1.3,
  // Real Estate & Property
  "home": 1.6, "homes": 1.5, "house": 1.5, "land": 1.5, "estate": 1.6, "rent": 1.4, "property": 1.5,
  "build": 1.3, "room": 1.3, "space": 1.4, "real": 1.4,
  // Energy & Sustainability
  "solar": 1.6, "green": 1.4, "energy": 1.5, "power": 1.4, "electric": 1.4, "carbon": 1.3,
  "climate": 1.3, "eco": 1.3,
  // Travel & Lifestyle
  "travel": 1.5, "hotel": 1.5, "flight": 1.4, "trip": 1.3, "tour": 1.3, "cruise": 1.3,
  "food": 1.4, "chef": 1.3, "wine": 1.3, "luxury": 1.4, "life": 1.4,
  // Security
  "secure": 1.5, "guard": 1.3, "shield": 1.3, "vault": 1.4, "safe": 1.3, "protect": 1.3,
  "defense": 1.3, "lock": 1.3,
  // Gaming & Entertainment
  "game": 1.5, "play": 1.4, "stream": 1.4, "video": 1.3, "music": 1.3, "sport": 1.3,
  "bet": 1.7, "club": 1.4,
  // Jobs & Education
  "jobs": 1.5, "hire": 1.4, "work": 1.3, "career": 1.4, "talent": 1.3,
  "school": 1.3, "course": 1.3, "tutor": 1.3, "academy": 1.3,
  // Legal & Insurance
  "legal": 1.5, "law": 1.5, "lawyer": 1.5, "insure": 1.5, "claim": 1.3, "policy": 1.3,
  // Top recurring aftermarket keywords
  "group": 1.6, "solutions": 1.5, "services": 1.4, "hub": 1.5,
  "global": 1.4, "company": 1.4, "business": 1.4, "pro": 1.5,
  "car": 1.4, "my": 1.3, "best": 1.3, "go": 1.3, "new": 1.3,
  // 2026 hot keywords
  "claw": 1.4, "clean": 1.3, "beauty": 1.4, "fire": 1.3,
  // Biotech & life science
  "bio": 1.7, "gene": 1.6, "genome": 1.5, "dna": 1.5, "protein": 1.4, "vaccine": 1.4,
  "stem": 1.3, "therapeutic": 1.4, "clinical": 1.3, "antibody": 1.4,
  // Beauty & fashion
  "skin": 1.4, "glow": 1.4, "lash": 1.3, "serum": 1.3, "cosmetic": 1.3,
  "fashion": 1.4, "style": 1.3, "wear": 1.3, "boutique": 1.3,
  // Pet industry
  "pet": 1.5, "dog": 1.4, "cat": 1.3, "vet": 1.4, "paw": 1.3, "puppy": 1.3,
  // Insurance
  "insurance": 1.5, "coverage": 1.3, "premium": 1.3,
  // IoT / Smart home
  "iot": 1.5, "sensor": 1.4, "wearable": 1.4,
  // Space & aerospace
  "rocket": 1.5, "satellite": 1.4, "lunar": 1.3, "mars": 1.4, "aerospace": 1.3,
  // VR/AR/Metaverse
  "vr": 1.4, "ar": 1.3, "metaverse": 1.3, "virtual": 1.3, "immersive": 1.3,
  // Cannabis/CBD
  "cbd": 1.3, "cannabis": 1.3, "hemp": 1.3,
  // Content & creator economy
  "creator": 1.5, "influencer": 1.4, "podcast": 1.4, "content": 1.3, "newsletter": 1.3,
  // Additional trending compound terms
  "ev": 1.5, "charging": 1.4, "fleet": 1.3,
  "remote": 1.3, "freelance": 1.3, "gig": 1.3,
};

// ─── NICHE CATEGORIES with current market multipliers ───
export interface NicheDetection {
  niche: string;
  label: string;
  multiplier: number;
  confidence: "High" | "Medium" | "Low";
  matchedKeywords: string[];
}

export const NICHE_CATEGORIES: Record<string, { label: string; keywords: string[]; multiplier: number; heat: "hot" | "warm" | "stable" | "cooling" }> = {
  ai_tech: {
    label: "AI / Tech",
    keywords: ["ai", "gpt", "neural", "neura", "machine", "deep", "learn", "robot", "auto", "smart", "quantum", "intel", "agent", "agentic", "synthetic", "cognitive", "algorithm", "compute", "llm", "model", "vision", "prompt", "copilot", "chatbot", "genai", "spatial"],
    multiplier: 1.55,
    heat: "hot",
  },
  fintech: {
    label: "Finance / Fintech",
    keywords: ["pay", "bank", "cash", "loan", "credit", "finance", "trade", "invest", "wallet", "fintech", "money", "fund", "wealth", "capital", "equity", "profit", "defi", "token", "ledger", "audit", "fiscal", "revenue", "treasury", "dividend", "stock", "bond", "forex", "payment", "banking", "lending"],
    multiplier: 1.40,
    heat: "hot",
  },
  health: {
    label: "Health / Wellness",
    keywords: ["health", "med", "fit", "care", "dental", "clinic", "therapy", "mental", "wellness", "organic", "nutrition", "vitamin", "supplement", "telehealth", "pharma", "patient", "doctor", "nurse", "hospital", "diagnosis", "symptom", "treatment", "recovery", "rehab", "mindful", "yoga", "meditate"],
    multiplier: 1.35,
    heat: "warm",
  },
  biotech: {
    label: "Biotech / Life Science",
    keywords: ["bio", "biotech", "gene", "genome", "dna", "rna", "protein", "cell", "stem", "enzyme", "peptide", "antibody", "vaccine", "clinical", "trial", "molecular", "pathology", "oncology", "neuro", "immuno", "therapeutic", "diagnostic", "lab", "research", "science", "specimen"],
    multiplier: 1.45,
    heat: "hot",
  },
  ecommerce: {
    label: "E-Commerce",
    keywords: ["shop", "store", "buy", "sell", "deal", "sale", "market", "retail", "commerce", "cart", "order", "wholesale", "merchant", "checkout", "fulfillment", "inventory", "dropship", "marketplace", "vendor", "product", "catalog"],
    multiplier: 1.30,
    heat: "warm",
  },
  saas: {
    label: "SaaS / Cloud",
    keywords: ["cloud", "tech", "code", "data", "app", "web", "server", "host", "stack", "saas", "api", "dev", "cyber", "digital", "platform", "software", "system", "deploy", "devops", "infra", "pipeline", "microservice", "container", "kubernetes", "terraform", "backend", "frontend", "fullstack"],
    multiplier: 1.35,
    heat: "warm",
  },
  real_estate: {
    label: "Real Estate",
    keywords: ["home", "homes", "house", "land", "estate", "rent", "property", "build", "room", "space", "real", "mortgage", "apartment", "condo", "lease", "tenant", "landlord", "realty", "housing", "dwelling", "townhouse", "penthouse", "listing", "broker", "appraisal"],
    multiplier: 1.30,
    heat: "stable",
  },
  energy: {
    label: "Energy / Green",
    keywords: ["solar", "green", "energy", "power", "electric", "carbon", "climate", "eco", "renewable", "hydrogen", "wind", "battery", "grid", "volt", "watt", "charge", "clean", "sustain", "emission", "thermal", "biofuel", "geothermal"],
    multiplier: 1.25,
    heat: "warm",
  },
  travel: {
    label: "Travel / Lifestyle",
    keywords: ["travel", "hotel", "flight", "trip", "tour", "cruise", "food", "chef", "wine", "luxury", "life", "vacation", "resort", "booking", "passport", "destination", "adventure", "hostel", "airline", "itinerary", "getaway", "explorer"],
    multiplier: 1.20,
    heat: "stable",
  },
  security: {
    label: "Cybersecurity",
    keywords: ["secure", "guard", "shield", "vault", "safe", "protect", "defense", "lock", "cyber", "firewall", "encryption", "threat", "breach", "phishing", "malware", "antivirus", "sentinel", "compliance", "identity", "access", "zero", "trust", "siem", "pentest"],
    multiplier: 1.35,
    heat: "hot",
  },
  gaming: {
    label: "Gaming / Entertainment",
    keywords: ["game", "play", "stream", "video", "music", "sport", "bet", "club", "esport", "casino", "arcade", "quest", "level", "guild", "arena", "twitch", "gamer", "console", "pixel", "loot", "pvp", "mmo", "rpg", "raid", "clash", "rank", "boost", "drop", "rift", "blade", "forge", "win", "team"],
    multiplier: 1.30,
    heat: "warm",
  },
  jobs: {
    label: "Jobs / HR",
    keywords: ["jobs", "hire", "work", "career", "talent", "recruit", "staff", "team", "employer", "resume", "payroll", "workforce", "remote", "freelance", "gig", "interview", "onboard", "applicant", "headhunt"],
    multiplier: 1.20,
    heat: "stable",
  },
  education: {
    label: "Education",
    keywords: ["school", "course", "tutor", "academy", "learn", "study", "university", "teach", "training", "education", "campus", "student", "degree", "diploma", "lecture", "syllabus", "homework", "exam", "scholarship", "mentor", "bootcamp", "mooc"],
    multiplier: 1.15,
    heat: "cooling",
  },
  legal: {
    label: "Legal",
    keywords: ["legal", "law", "lawyer", "claim", "attorney", "court", "litigation", "contract", "counsel", "judge", "verdict", "arbitration", "compliance", "statute", "patent", "trademark", "copyright", "paralegal", "deposition", "lawsuit"],
    multiplier: 1.30,
    heat: "stable",
  },
  insurance: {
    label: "Insurance",
    keywords: ["insure", "insurance", "policy", "premium", "coverage", "underwrite", "actuary", "claim", "annuity", "liability", "indemnity", "broker", "reinsure", "deductible", "beneficiary", "casualty", "risk"],
    multiplier: 1.35,
    heat: "warm",
  },
  automotive: {
    label: "Automotive",
    keywords: ["car", "auto", "vehicle", "motor", "drive", "electric", "ev", "truck", "dealer", "fleet", "hybrid", "sedan", "suv", "garage", "mechanic", "tire", "engine", "fuel", "racing", "tesla", "charging"],
    multiplier: 1.20,
    heat: "stable",
  },
  crypto: {
    label: "Crypto / Web3",
    keywords: ["crypto", "blockchain", "token", "defi", "nft", "web3", "dao", "chain", "coin", "mining", "staking", "swap", "dex", "ledger", "hash", "node", "validator", "wallet", "satoshi", "ethereum", "solana", "layer"],
    multiplier: 1.15,
    heat: "cooling",
  },
  beauty: {
    label: "Beauty / Fashion",
    keywords: ["beauty", "skin", "hair", "makeup", "cosmetic", "glow", "lash", "nail", "serum", "cream", "fashion", "style", "wear", "cloth", "apparel", "boutique", "designer", "couture", "trend", "glamour", "skincare", "haircare"],
    multiplier: 1.25,
    heat: "warm",
  },
  food: {
    label: "Food / Restaurant",
    keywords: ["food", "eat", "meal", "recipe", "cook", "chef", "kitchen", "restaurant", "cafe", "bistro", "bakery", "grill", "pizza", "sushi", "burger", "vegan", "organic", "snack", "catering", "delivery", "dine", "menu", "brunch"],
    multiplier: 1.20,
    heat: "stable",
  },
  pet: {
    label: "Pet / Animal",
    keywords: ["pet", "dog", "cat", "puppy", "kitten", "vet", "paw", "bark", "fur", "breed", "groom", "kennel", "animal", "shelter", "rescue", "leash", "treat", "collar", "fetch", "aquarium", "bird", "horse"],
    multiplier: 1.20,
    heat: "warm",
  },
  iot: {
    label: "IoT / Smart Home",
    keywords: ["iot", "sensor", "device", "connect", "smart", "home", "mesh", "beacon", "wearable", "embedded", "gateway", "monitor", "automate", "thermostat", "remote", "wireless", "bluetooth", "zigbee"],
    multiplier: 1.25,
    heat: "warm",
  },
  space: {
    label: "Space / Aerospace",
    keywords: ["space", "rocket", "orbit", "satellite", "lunar", "mars", "astro", "cosmos", "launch", "payload", "mission", "galaxy", "star", "nova", "aerospace", "propulsion", "drone", "altitude"],
    multiplier: 1.30,
    heat: "warm",
  },
  vr_ar: {
    label: "VR / AR / Metaverse",
    keywords: ["vr", "ar", "virtual", "augmented", "reality", "metaverse", "immersive", "hologram", "avatar", "3d", "render", "simulation", "headset", "spatial", "mixed", "xr", "haptic", "portal"],
    multiplier: 1.25,
    heat: "warm",
  },
  cannabis: {
    label: "Cannabis / CBD",
    keywords: ["cannabis", "cbd", "hemp", "thc", "weed", "dispensary", "edible", "tincture", "extract", "indica", "sativa", "gummy", "vape", "420", "marijuana", "grower", "cultivate"],
    multiplier: 1.15,
    heat: "cooling",
  },
};

export function detectNiche(words: string[], tld: string): NicheDetection {
  let bestNiche = "";
  let bestScore = 0;
  let bestMatches: string[] = [];

  for (const [key, cat] of Object.entries(NICHE_CATEGORIES)) {
    const matches = words.filter(w => cat.keywords.includes(w));
    // TLD boost: .ai boosts ai_tech, etc.
    let score = matches.length;
    // TLD synergy boosts
    if (tld === "ai" && key === "ai_tech") score += 1.5;
    if (tld === "io" && (key === "saas" || key === "ai_tech")) score += 0.5;
    if (tld === "finance" && key === "fintech") score += 1;
    if (tld === "bio" && key === "biotech") score += 1.5;
    if (tld === "health" && key === "health") score += 1;
    if (tld === "law" && key === "legal") score += 1;
    if (tld === "insurance" && key === "insurance") score += 1;
    if (tld === "auto" && key === "automotive") score += 1;
    if (tld === "pet" && key === "pet") score += 1;
    if (tld === "beauty" && key === "beauty") score += 1;
    if (tld === "food" && key === "food") score += 1;
    if (tld === "space" && key === "space") score += 1;
    if (tld === "game" && key === "gaming") score += 1;
    if (tld === "gg" && key === "gaming") score += 1.5;
    if (tld === "dev" && (key === "saas" || key === "ai_tech")) score += 0.5;
    if (tld === "app" && (key === "saas" || key === "ecommerce")) score += 0.5;

    if (score > bestScore) {
      bestScore = score;
      bestNiche = key;
      bestMatches = matches;
    }
  }

  if (bestScore === 0 || !bestNiche) {
    return { niche: "general", label: "General / Brandable", multiplier: 1.0, confidence: "Low", matchedKeywords: [] };
  }

  const cat = NICHE_CATEGORIES[bestNiche];
  const confidence: NicheDetection["confidence"] = bestScore >= 3 ? "High" : bestScore >= 1.5 ? "Medium" : "Low";
  return { niche: bestNiche, label: cat.label, multiplier: cat.multiplier, confidence, matchedKeywords: bestMatches };
}

/** Compute a 0-100 trend score based on keyword heat and niche alignment */
export function computeTrendScore(words: string[], tld: string, nicheOverride?: string): { score: number; label: string; niche: NicheDetection } {
  const niche = nicheOverride
    ? { ...detectNiche(words, tld), niche: nicheOverride, label: NICHE_CATEGORIES[nicheOverride]?.label || "General", multiplier: NICHE_CATEGORIES[nicheOverride]?.multiplier || 1.0 }
    : detectNiche(words, tld);

  let score = 0;

  // Base: trending keyword heat (0-50)
  let maxHeat = 0;
  let trendingCount = 0;
  for (const word of words) {
    const m = TRENDING_KEYWORDS[word];
    if (m && m > 1.0) {
      maxHeat = Math.max(maxHeat, m);
      trendingCount++;
    }
  }
  if (maxHeat > 0) {
    // Scale: 1.3 = ~20, 1.8 = ~35, 2.5 = ~50
    score += Math.min(50, Math.round((maxHeat - 1.0) * 33));
  }
  // Multi-trend combo bonus
  if (trendingCount >= 2) score += 10;

  // Niche alignment bonus (0-25)
  if (niche.confidence === "High") score += 25;
  else if (niche.confidence === "Medium") score += 15;
  else if (niche.matchedKeywords.length > 0) score += 8;

  // TLD synergy bonus (0-15)
  const tldNicheMap: Record<string, string[]> = {
    ai: ["ai_tech"], io: ["saas", "ai_tech"], bio: ["biotech"], health: ["health"],
    law: ["legal"], auto: ["automotive"], pet: ["pet"], beauty: ["beauty"],
    food: ["food"], space: ["space"], game: ["gaming"], gg: ["gaming"], dev: ["saas", "ai_tech"],
    app: ["saas", "ecommerce"], finance: ["fintech"],
  };
  const synergies = tldNicheMap[tld];
  if (synergies && synergies.includes(niche.niche)) score += 15;
  else if (tld === "com") score += 8;
  else if (["co", "app", "dev", "net", "io"].includes(tld)) score += 5;

  score = Math.min(100, Math.max(0, score));

  let label = "";
  if (score >= 85) label = "🔥 On Fire";
  else if (score >= 70) label = "📈 Hot";
  else if (score >= 50) label = "⬆️ Rising";
  else if (score >= 30) label = "➡️ Stable";
  else label = "⬇️ Cool";

  return { score, label, niche };
}

export const COMMON_WORDS = new Set([
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
  const s = name.toLowerCase();
  const n = s.length;
  if (n === 0) return [];

  const isWord = (w: string) => COMMON_WORDS.has(w) || DICTIONARY_WORDS.has(w) || PREMIUM_KEYWORDS.has(w);

  // DP: dp[i] = max number of characters covered by dictionary words in s[0..i-1]
  const dp = new Array(n + 1).fill(0);
  const parent: (null | { start: number; wordLen: number })[] = new Array(n + 1).fill(null);

  for (let i = 1; i <= n; i++) {
    dp[i] = dp[i - 1];
    parent[i] = null;

    for (let len = 2; len <= Math.min(i, 15); len++) {
      const start = i - len;
      const candidate = s.substring(start, i);
      if (isWord(candidate)) {
        const coverage = dp[start] + len;
        if (coverage > dp[i]) {
          dp[i] = coverage;
          parent[i] = { start, wordLen: len };
        }
      }
    }
  }

  // Backtrack to find the words
  const words: string[] = [];
  let pos = n;
  while (pos > 0) {
    const p = parent[pos];
    if (p) {
      words.push(s.substring(p.start, p.start + p.wordLen));
      pos = p.start;
    } else {
      words.push(s[pos - 1]);
      pos--;
    }
  }
  words.reverse();

  // Portmanteau detection: if coverage is incomplete, try overlapping splits
  // e.g. "chainalysis" → "chain" + "analysis" (overlap at "an")
  const coveredByWords = words.filter(w => w.length >= 2 && isWord(w));
  const totalCoveredChars = coveredByWords.reduce((sum, w) => sum + w.length, 0);
  if (totalCoveredChars < n) {
    // Try all split points: check if s[0..i+k] and s[i..n] are both words (with overlap k)
    let bestOverlapWords: string[] | null = null;
    let bestOverlapCoverage = totalCoveredChars;

    for (let i = 2; i < n - 1; i++) {
      // Try overlaps from 0 to 4 characters
      for (let overlap = 0; overlap <= Math.min(4, i, n - i); overlap++) {
        // Method 1: left extends past split, right starts at split
        const left1 = s.substring(0, i + overlap);
        const right1 = s.substring(i);
        if (isWord(left1) && isWord(right1)) {
          const coverage = left1.length + right1.length;
          if (coverage > bestOverlapCoverage) {
            bestOverlapCoverage = coverage;
            bestOverlapWords = [left1, right1];
          }
        }
        // Method 2: left ends at split, right starts before split (overlap backwards)
        if (overlap > 0) {
          const left2 = s.substring(0, i);
          const right2 = s.substring(i - overlap);
          if (isWord(left2) && isWord(right2)) {
            const coverage = left2.length + right2.length;
            if (coverage > bestOverlapCoverage) {
              bestOverlapCoverage = coverage;
              bestOverlapWords = [left2, right2];
            }
          }
        }
      }
    }

    if (bestOverlapWords) {
      return bestOverlapWords;
    }

    // Truncation detection: if DP found a strong prefix word, check if the remaining
    // suffix is a recognizable truncation of a dictionary word (≥5 chars, matches end of a known word).
    // e.g. "chainalysis" → "chain" + "alysis" where "alysis" is end of "analysis"
    const dpWords = words.filter(w => w.length >= 3 && isWord(w));
    if (dpWords.length >= 1) {
      const firstWord = dpWords[0];
      const firstWordEnd = s.indexOf(firstWord) + firstWord.length;
      const remainder = s.substring(firstWordEnd);
      if (remainder.length >= 4) {
        // Check if remainder matches the end of any dictionary word
        const COMMON_WORDS_ARRAY = [...COMMON_WORDS, ...DICTIONARY_WORDS, ...PREMIUM_KEYWORDS];
        let bestParentWord: string | null = null;
        let bestParentLen = 0;
        for (const dictWord of COMMON_WORDS_ARRAY) {
          if (dictWord.length >= remainder.length + 1 && dictWord.endsWith(remainder) && dictWord.length > bestParentLen) {
            bestParentWord = dictWord;
            bestParentLen = dictWord.length;
          }
        }
        if (bestParentWord) {
          return [firstWord, bestParentWord];
        }
      }
    }
  }

  return words;
}

export function isSingleDictionaryWord(name: string): boolean {
  return DICTIONARY_WORDS.has(name.toLowerCase());
}

/**
 * Check if all characters in a domain name are covered by meaningful words,
 * accounting for portmanteaus (overlapping words like "chainalysis" = "chain" + "analysis").
 */
export function isFullyCoveredByWords(name: string, meaningfulWords: string[]): boolean {
  if (meaningfulWords.length === 0) return false;
  const totalMeaningfulChars = meaningfulWords.join("").length;
  // Exact match: words perfectly tile the name
  if (totalMeaningfulChars === name.length) return true;
  // Portmanteau: words overlap by a few chars (e.g. "chain"+"analysis" = 13 chars for 11-char name)
  // Allow overlap up to 4 chars per word boundary
  const maxOverlap = (meaningfulWords.length - 1) * 4;
  if (totalMeaningfulChars > name.length && totalMeaningfulChars <= name.length + maxOverlap) {
    return true;
  }
  return false;
}

/**
 * Semantic synergy detection for two-word compounds.
 * Returns a multiplier bonus when both words are semantically related
 * (e.g. "chain" + "analysis" in crypto/data, "opus" + "growth" in business).
 */
const SEMANTIC_SYNERGY_PAIRS: Record<string, string[]> = {
  // Data/analytics combos
  "analysis": ["chain", "data", "deep", "risk", "market", "trend", "price", "trade", "stock", "fund", "credit", "web", "code", "cloud", "smart", "cyber", "bio", "gene", "health", "med", "legal", "cost", "sales", "growth", "profit", "revenue"],
  "analytics": ["chain", "data", "deep", "risk", "market", "trend", "web", "cloud", "cyber", "bio", "health", "sales", "growth"],
  // Growth/scale combos
  "growth": ["opus", "work", "trade", "health", "wealth", "capital", "revenue", "profit", "sales", "fund", "pay", "data", "cloud", "tech", "green", "solar", "energy", "bio", "market", "brand", "talent", "career", "home", "stock", "fast", "smart", "rapid", "true", "real"],
  // Business/work combos  
  "opus": ["growth", "trade", "work", "capital", "fund", "tech", "digital", "global", "ventures", "solutions", "group", "labs", "forge", "hub"],
  // Chain/crypto combos
  "chain": ["analysis", "analytics", "link", "trade", "fund", "pay", "lock", "guard", "vault", "forge", "block", "data", "flow", "smart", "secure", "safe"],
  // Tech combos
  "code": ["forge", "flow", "craft", "shift", "spark", "stack", "hub", "lab", "base"],
  "cloud": ["forge", "shift", "stack", "gate", "path", "guard", "vault", "sync", "flow", "bridge"],
  "data": ["flow", "forge", "vault", "bridge", "mesh", "sync", "stack", "pulse", "core", "hub", "lab", "lens", "wave"],
  // Finance combos
  "pay": ["wall", "gate", "flow", "stack", "hub", "shift", "forge", "guard", "smart", "bolt"],
  "trade": ["flow", "craft", "forge", "shift", "wind", "mark", "hub", "gate", "vault", "guard"],
  "fund": ["flow", "forge", "gate", "rise", "stack", "vault", "shift"],
  // Brand/business authority combos
  "smart": ["home", "pay", "trade", "flow", "grid", "lock", "guard", "hire", "path", "care", "health", "med", "learn"],
  "deep": ["flow", "mind", "code", "sync", "forge", "learn", "vision", "trade", "link", "care", "health"],
  // Healthcare combos
  "health": ["care", "hub", "flow", "sync", "path", "link", "guard", "pulse", "track", "tech", "wise", "bridge", "gate", "stack", "med", "net", "zone", "point", "force", "shift"],
  "med": ["tech", "flow", "sync", "hub", "link", "gate", "point", "pulse", "vault", "guard", "forge", "stack", "bridge", "care", "track", "wise", "zone", "shift", "spark"],
  "care": ["flow", "hub", "path", "point", "sync", "link", "pulse", "bridge", "tech", "forge", "stack", "shift", "guard", "zone", "wise", "track", "gate", "net"],
  "clinic": ["flow", "hub", "sync", "path", "gate", "forge", "stack", "wise", "guard", "pulse"],
  "pharma": ["flow", "hub", "sync", "gate", "forge", "stack", "pulse", "link", "bridge", "track"],
  "bio": ["tech", "forge", "sync", "hub", "link", "flow", "pulse", "code", "gen", "labs", "spark", "stack"],
  "gene": ["flow", "forge", "sync", "hub", "link", "code", "spark", "labs", "stack", "pulse", "track"],
  "wellness": ["hub", "flow", "path", "sync", "gate", "forge", "track", "pulse", "point"],
  // Real estate combos
  "home": ["find", "flow", "hub", "path", "base", "nest", "stack", "gate", "guard", "wise", "link", "point", "sync", "forge", "shift", "scout", "match", "snap", "zone"],
  "house": ["find", "flow", "hub", "path", "stack", "gate", "wise", "link", "point", "scout", "match", "snap"],
  "property": ["flow", "hub", "gate", "guard", "stack", "link", "wise", "pulse", "forge", "scout", "sync"],
  "estate": ["flow", "hub", "gate", "forge", "link", "wise", "stack", "pulse", "scout", "sync"],
  "realty": ["flow", "hub", "gate", "forge", "link", "wise", "stack", "pulse", "scout", "sync"],
  "rent": ["flow", "hub", "path", "gate", "wise", "link", "scout", "match", "sync", "forge", "snap"],
  "land": ["flow", "hub", "gate", "forge", "link", "wise", "stack", "scout", "mark", "bridge", "sync"],
  "nest": ["flow", "hub", "path", "find", "gate", "wise", "link", "scout", "match", "sync"],
  // Education combos
  "learn": ["path", "flow", "hub", "sync", "forge", "stack", "gate", "spark", "pulse", "link", "bridge", "wise", "shift", "craft", "lab", "zone", "quest", "track"],
  "teach": ["flow", "hub", "sync", "path", "forge", "stack", "spark", "link", "wise", "craft", "lab", "pulse"],
  "study": ["flow", "hub", "sync", "path", "forge", "stack", "spark", "link", "wise", "pulse", "zone", "gate"],
  "course": ["flow", "hub", "sync", "path", "forge", "stack", "spark", "craft", "gate", "wise"],
  "tutor": ["flow", "hub", "sync", "path", "forge", "link", "spark", "match", "wise", "gate"],
  "skill": ["flow", "hub", "sync", "path", "forge", "stack", "spark", "shift", "craft", "pulse", "link", "bridge"],
  "brain": ["flow", "forge", "sync", "hub", "spark", "pulse", "stack", "link", "wave", "storm", "shift"],
  "mentor": ["flow", "hub", "sync", "path", "forge", "link", "spark", "match", "wise", "shift"],
  "academy": ["flow", "hub", "sync", "forge", "stack", "spark", "gate", "pulse", "link"],
  // Green/energy combos
  "green": ["flow", "hub", "forge", "shift", "pulse", "stack", "path", "gate", "link", "sync", "spark"],
  "solar": ["flow", "hub", "forge", "shift", "pulse", "stack", "path", "gate", "link", "sync", "spark", "grid"],
  "energy": ["flow", "hub", "forge", "shift", "pulse", "stack", "path", "gate", "link", "sync", "spark", "grid"],
  // Travel/hospitality combos
  "travel": ["flow", "hub", "gate", "path", "forge", "link", "wise", "sync", "scout", "snap", "pulse"],
  "trip": ["flow", "hub", "gate", "path", "forge", "wise", "sync", "scout", "snap", "match"],
  "stay": ["flow", "hub", "gate", "path", "forge", "wise", "sync", "scout", "match", "nest"],
  "book": ["flow", "hub", "gate", "path", "forge", "wise", "sync", "stack", "snap", "match"],
  // Food/wellness combos
  "food": ["flow", "hub", "forge", "path", "link", "sync", "pulse", "stack", "wise", "snap"],
  "meal": ["flow", "hub", "forge", "path", "sync", "prep", "stack", "wise", "match", "snap"],
  "fit": ["flow", "hub", "forge", "path", "pulse", "sync", "stack", "track", "zone", "spark"],
  // Legal combos
  "legal": ["flow", "hub", "forge", "gate", "stack", "link", "wise", "guard", "sync", "path", "vault", "shield"],
  "law": ["flow", "hub", "forge", "gate", "stack", "link", "wise", "guard", "sync", "path"],
  // Security/Cyber combos
  "cyber": ["flow", "hub", "forge", "gate", "stack", "link", "guard", "sync", "shield", "vault", "lock", "pulse", "watch", "wall"],
  "secure": ["flow", "hub", "forge", "gate", "stack", "link", "guard", "sync", "vault", "lock", "path", "zone", "shift"],
  "guard": ["flow", "hub", "forge", "gate", "stack", "link", "vault", "sync", "shield", "lock", "watch", "wall", "zone"],
  "shield": ["flow", "hub", "forge", "gate", "stack", "link", "guard", "sync", "vault", "lock", "cyber", "wall"],
  "vault": ["flow", "hub", "forge", "gate", "stack", "link", "guard", "sync", "lock", "safe", "key", "core"],
  // AI/ML combos
  "neural": ["flow", "hub", "forge", "link", "sync", "pulse", "stack", "spark", "shift", "path", "labs", "code"],
  "vector": ["flow", "hub", "forge", "sync", "shift", "stack", "pulse", "labs", "code", "spark"],
  "logic": ["flow", "hub", "forge", "gate", "sync", "stack", "spark", "shift", "path", "core"],
  "pixel": ["flow", "hub", "forge", "sync", "shift", "stack", "spark", "craft", "labs", "pulse"],
  "quantum": ["flow", "hub", "forge", "sync", "shift", "stack", "spark", "labs", "leap", "pulse", "core"],
  "vision": ["flow", "hub", "forge", "sync", "shift", "stack", "spark", "labs", "pulse", "craft", "ai"],
  // SaaS/Startup combos
  "launch": ["flow", "hub", "pad", "forge", "stack", "path", "gate", "shift", "spark", "sync"],
  "scale": ["flow", "hub", "forge", "stack", "shift", "path", "gate", "sync", "spark", "grid"],
  "venture": ["flow", "hub", "forge", "stack", "shift", "path", "gate", "sync", "spark", "labs"],
  "pivot": ["flow", "hub", "forge", "stack", "shift", "path", "sync", "spark"],
  "sprint": ["flow", "hub", "forge", "stack", "shift", "path", "sync", "spark"],
  "agile": ["flow", "hub", "forge", "stack", "shift", "path", "sync", "spark"],
  // Logistics/Supply chain combos
  "ship": ["flow", "hub", "forge", "gate", "stack", "sync", "track", "pulse", "link", "fast", "wise", "guard"],
  "cargo": ["flow", "hub", "forge", "gate", "stack", "sync", "track", "pulse", "link", "shift"],
  "freight": ["flow", "hub", "forge", "gate", "stack", "sync", "track", "pulse", "link", "shift"],
  "fleet": ["flow", "hub", "forge", "gate", "stack", "sync", "track", "pulse", "guard", "wise"],
  "route": ["flow", "hub", "forge", "gate", "sync", "track", "pulse", "link", "wise", "shift", "match"],
  "supply": ["flow", "hub", "forge", "gate", "stack", "sync", "chain", "link", "track", "pulse", "shift"],
  // Marketing/Sales combos
  "brand": ["flow", "hub", "forge", "gate", "stack", "sync", "spark", "pulse", "shift", "craft", "wise", "boost"],
  "lead": ["flow", "hub", "forge", "gate", "stack", "sync", "spark", "pulse", "shift", "gen", "match"],
  "sales": ["flow", "hub", "forge", "gate", "stack", "sync", "spark", "pulse", "shift", "boost", "track"],
  "market": ["flow", "hub", "forge", "gate", "stack", "sync", "spark", "pulse", "shift", "wise", "scout"],
  "advert": ["flow", "hub", "forge", "sync", "spark", "pulse", "shift", "boost", "stack"],
  "promo": ["flow", "hub", "forge", "sync", "spark", "pulse", "shift", "boost", "stack"],
  // HR/Talent combos
  "hire": ["flow", "hub", "forge", "gate", "sync", "spark", "match", "pulse", "shift", "wise", "scout", "path"],
  "talent": ["flow", "hub", "forge", "gate", "sync", "spark", "match", "pulse", "shift", "scout", "path", "stack"],
  "recruit": ["flow", "hub", "forge", "gate", "sync", "match", "pulse", "shift", "wise", "scout"],
  "career": ["flow", "hub", "forge", "gate", "sync", "spark", "path", "pulse", "shift", "wise", "scout", "match"],
  "staff": ["flow", "hub", "forge", "gate", "sync", "match", "pulse", "shift", "wise", "stack"],
  // Insurance combos
  "insure": ["flow", "hub", "forge", "gate", "sync", "guard", "pulse", "shift", "wise", "shield", "path", "stack"],
  "risk": ["flow", "hub", "forge", "gate", "sync", "guard", "pulse", "shift", "wise", "shield", "stack", "watch"],
  "cover": ["flow", "hub", "forge", "gate", "sync", "guard", "pulse", "shift", "wise", "shield", "stack"],
  "claim": ["flow", "hub", "forge", "gate", "sync", "guard", "pulse", "shift", "wise", "stack", "track"],
  // Auto/EV combos
  "auto": ["flow", "hub", "forge", "gate", "sync", "pulse", "shift", "stack", "track", "wise", "guard", "spark"],
  "drive": ["flow", "hub", "forge", "gate", "sync", "pulse", "shift", "stack", "wise", "spark", "path"],
  "motor": ["flow", "hub", "forge", "gate", "sync", "pulse", "shift", "stack", "wise", "spark"],
  "charge": ["flow", "hub", "forge", "gate", "sync", "pulse", "shift", "stack", "point", "grid", "bolt"],
  "volt": ["flow", "hub", "forge", "gate", "sync", "pulse", "shift", "stack", "spark", "grid"],
  // Gaming/Entertainment combos
  "game": ["flow", "hub", "forge", "gate", "sync", "pulse", "stack", "spark", "shift", "craft", "zone", "quest"],
  "play": ["flow", "hub", "forge", "gate", "sync", "pulse", "stack", "spark", "shift", "craft", "zone"],
  "quest": ["flow", "hub", "forge", "gate", "sync", "pulse", "stack", "spark", "path", "craft"],
  "arena": ["flow", "hub", "forge", "gate", "sync", "pulse", "stack", "spark", "shift"],
  "stream": ["flow", "hub", "forge", "gate", "sync", "pulse", "stack", "spark", "shift", "cast", "wave"],
  // Social/Community combos
  "social": ["flow", "hub", "forge", "gate", "sync", "pulse", "stack", "spark", "shift", "link", "mesh", "hive"],
  "connect": ["flow", "hub", "forge", "gate", "sync", "pulse", "stack", "spark", "shift", "link", "mesh"],
  "tribe": ["flow", "hub", "forge", "sync", "pulse", "spark", "shift", "link", "hive"],
  "crowd": ["flow", "hub", "forge", "gate", "sync", "pulse", "stack", "spark", "shift", "fund", "source"],
  "chat": ["flow", "hub", "forge", "gate", "sync", "pulse", "stack", "spark", "shift", "bolt"],
  "hive": ["flow", "hub", "forge", "sync", "pulse", "stack", "spark", "shift", "mind", "link"],
  // Pet/Vet combos
  "pet": ["flow", "hub", "forge", "sync", "pulse", "path", "care", "wise", "match", "guard", "nest"],
  "vet": ["flow", "hub", "forge", "sync", "pulse", "path", "care", "wise", "guard", "stack"],
  "paw": ["flow", "hub", "forge", "sync", "pulse", "path", "scout", "match", "wise"],
  // Crypto/DeFi combos
  "token": ["flow", "hub", "forge", "gate", "sync", "swap", "vault", "stack", "mint", "chain", "lock", "guard", "shift", "pulse", "launch"],
  "swap": ["flow", "hub", "forge", "gate", "sync", "stack", "chain", "pulse", "shift", "vault", "lock", "bolt", "link"],
  "yield": ["flow", "hub", "forge", "gate", "sync", "stack", "vault", "farm", "pulse", "shift", "boost", "guard"],
  "stake": ["flow", "hub", "forge", "gate", "sync", "stack", "vault", "pool", "pulse", "shift", "guard", "lock"],
  "mint": ["flow", "hub", "forge", "gate", "sync", "stack", "vault", "pulse", "shift", "spark", "labs", "craft"],
  "defi": ["flow", "hub", "forge", "gate", "sync", "stack", "vault", "pulse", "shift", "guard", "labs", "chain"],
  "coin": ["flow", "hub", "forge", "gate", "sync", "stack", "vault", "pulse", "shift", "swap", "base", "track"],
  "crypto": ["flow", "hub", "forge", "gate", "sync", "stack", "vault", "pulse", "shift", "guard", "labs", "swap"],
  "wallet": ["flow", "hub", "forge", "gate", "sync", "stack", "vault", "guard", "lock", "shift", "link"],
  "ledger": ["flow", "hub", "forge", "gate", "sync", "stack", "vault", "guard", "lock", "link"],
  // Web3/Metaverse combos
  "meta": ["flow", "hub", "forge", "gate", "sync", "stack", "pulse", "shift", "verse", "labs", "link", "spark", "craft"],
  "dao": ["flow", "hub", "forge", "gate", "sync", "stack", "pulse", "shift", "labs", "link", "fund", "vote"],
  "nft": ["flow", "hub", "forge", "gate", "sync", "stack", "pulse", "shift", "labs", "mint", "vault", "drop"],
  "dapp": ["flow", "hub", "forge", "gate", "sync", "stack", "pulse", "shift", "labs", "link", "craft"],
  "web3": ["flow", "hub", "forge", "gate", "sync", "stack", "pulse", "shift", "labs", "link", "spark"],
  "block": ["flow", "hub", "forge", "gate", "sync", "stack", "pulse", "shift", "chain", "mint", "craft", "labs"],
  "hash": ["flow", "hub", "forge", "gate", "sync", "stack", "pulse", "shift", "labs", "link", "guard"],
};

export function getSemanticSynergyBonus(words: string[]): { bonus: number; reason: string } {
  if (words.length !== 2) return { bonus: 1.0, reason: "" };
  const [a, b] = words.map(w => w.toLowerCase());
  
  // Check both directions
  const aRelated = SEMANTIC_SYNERGY_PAIRS[a];
  const bRelated = SEMANTIC_SYNERGY_PAIRS[b];
  
  if (aRelated?.includes(b) || bRelated?.includes(a)) {
    return { bonus: 1.4, reason: `"${a}" + "${b}" form a semantically coherent brand compound` };
  }
  
  // Check if both words belong to the same niche category (weaker synergy)
  for (const [, cat] of Object.entries(NICHE_CATEGORIES)) {
    const aInNiche = cat.keywords.includes(a);
    const bInNiche = cat.keywords.includes(b);
    if (aInNiche && bInNiche) {
      return { bonus: 1.25, reason: `Both "${a}" and "${b}" are ${cat.label} keywords — strong niche alignment` };
    }
  }
  
  return { bonus: 1.0, reason: "" };
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

export interface ValueDrivers {
  domain_length: number;
  keywords: number;
  tld: number;
  brandability: number;
  niche_demand: number;
  comparable_sales: number;
  liquidity: number;
}

export interface SellabilityInsight {
  strengths: string[];
  weaknesses: string[];
  buyerType: "End-User" | "Startup" | "Investor" | "Enterprise" | "Local Business" | "Speculative";
  buyerPool: "Large" | "Medium" | "Small" | "Niche";
}

export interface QuickValuationResult {
  band: string;
  score: number;
  valueMin: number;
  valueMax: number;
  /** Wholesale (investor) value — what a domainer would pay */
  wholesaleMin: number;
  wholesaleMax: number;
  wholesaleBand: string;
  /** Liquidity score 0-100: how quickly/easily this domain can sell */
  liquidityScore: number;
  liquidityLabel: string;
  drivers: ValueDrivers;
  confidence: "High" | "Medium" | "Low";
  /** Confidence as percentage 0-100 for granular display */
  confidencePct: number;
  /** Sellability insights: strengths, weaknesses, buyer type */
  sellability: SellabilityInsight;
}

// ─── SELLABILITY INSIGHTS ───
function computeSellability(
  name: string, tld: string, isDictWord: boolean, isPronounceable: boolean,
  meaningfulWords: string[], allMeaningful: boolean, premiumMatches: string[],
  trends: string[], liquidityScore: number, trademark: TrademarkResult, stance: string,
): SellabilityInsight {
  const strengths: string[] = [];
  const weaknesses: string[] = [];

  // Strengths
  if (isDictWord && tld === "com") strengths.push("Single dictionary .com — evergreen demand");
  else if (isDictWord) strengths.push("Single dictionary word — brandable & memorable");
  if (tld === "com") strengths.push(".com TLD — highest liquidity");
  if (name.length <= 5) strengths.push(`Ultra-short (${name.length} chars) — premium length`);
  else if (name.length <= 7) strengths.push(`Short domain (${name.length} chars)`);
  if (premiumMatches.length >= 2) strengths.push(`Multiple premium keywords: ${premiumMatches.join(", ")}`);
  else if (premiumMatches.length === 1) strengths.push(`Premium keyword: ${premiumMatches[0]}`);
  if (trends.length >= 1) strengths.push(`Trending keywords: ${trends.join(", ")}`);
  if (allMeaningful && meaningfulWords.length === 2) strengths.push("Clean two-word compound");
  if (isPronounceable && stance === "brandable") strengths.push("Highly pronounceable — strong brand potential");

  // Weaknesses
  if (meaningfulWords.length >= 3) weaknesses.push(`${meaningfulWords.length}-word domain — low buyer appeal`);
  if (name.length >= 15) weaknesses.push("Too long — hard to remember or type");
  if (tld !== "com" && tld !== "ai" && tld !== "io") weaknesses.push(`.${tld} has limited aftermarket demand`);
  if (!isPronounceable && !isDictWord) weaknesses.push("Difficult to pronounce");
  if (liquidityScore < 30) weaknesses.push("Very low liquidity — may take years to sell");
  if (trademark.riskLevel === "high") weaknesses.push("High trademark risk — legal liability");
  else if (trademark.riskLevel === "medium") weaknesses.push("Moderate trademark overlap");
  if (trends.length >= 2 && meaningfulWords.length >= 3) weaknesses.push("Trend-dependent — value may decline");
  if (!allMeaningful && !isDictWord && meaningfulWords.length <= 1) weaknesses.push("Low word clarity — perceived as random");

  // Buyer type detection
  let buyerType: SellabilityInsight["buyerType"] = "Investor";
  if (isDictWord && name.length <= 6 && tld === "com") buyerType = "Enterprise";
  else if (allMeaningful && meaningfulWords.length === 2 && premiumMatches.length >= 1) buyerType = "Startup";
  else if (isDictWord || (isPronounceable && name.length <= 7)) buyerType = "End-User";
  else if (meaningfulWords.length >= 3) buyerType = "Speculative";
  else if (premiumMatches.length >= 1 && tld === "com") buyerType = "Startup";

  // Buyer pool
  let buyerPool: SellabilityInsight["buyerPool"] = "Medium";
  if (liquidityScore >= 70) buyerPool = "Large";
  else if (liquidityScore >= 40) buyerPool = "Medium";
  else if (liquidityScore >= 20) buyerPool = "Small";
  else buyerPool = "Niche";

  return { strengths: strengths.slice(0, 5), weaknesses: weaknesses.slice(0, 5), buyerType, buyerPool };
}

// ─── LIQUIDITY SCORING ───
function computeLiquidity(
  name: string,
  tld: string,
  isDictWord: boolean,
  isPronounceable: boolean,
  meaningfulWords: string[],
  allMeaningful: boolean,
): { score: number; label: string } {
  let score = 0;

  // TLD liquidity: .com is king
  if (tld === "com") score += 35;
  else if (tld === "ai") score += 18;
  else if (tld === "io") score += 15;
  else if (tld === "co" || tld === "net") score += 12;
  else if (tld === "org") score += 10;
  else if (tld === "gg" || tld === "app" || tld === "dev") score += 8;
  else score += 3;

  // Length: shorter = more liquid
  if (name.length <= 3) score += 25;
  else if (name.length <= 5) score += 20;
  else if (name.length <= 7) score += 15;
  else if (name.length <= 10) score += 8;
  else if (name.length <= 14) score += 3;
  else score += 0;

  // Clarity: dictionary words and clean compounds are liquid
  if (isDictWord) score += 25;
  else if (allMeaningful && meaningfulWords.length === 2) score += 18;
  else if (allMeaningful && meaningfulWords.length === 1) score += 12;
  else if (meaningfulWords.length >= 1) score += 6;
  else score += 0;

  // Pronounceability bonus
  if (isPronounceable) score += 8;

  // Word count penalty: 3+ words dramatically reduce liquidity
  if (meaningfulWords.length >= 3) score -= 15;
  if (meaningfulWords.length >= 4) score -= 20;

  score = Math.max(0, Math.min(100, score));

  const label = score >= 80 ? "Very High" : score >= 60 ? "High" : score >= 40 ? "Moderate" : score >= 20 ? "Low" : "Very Low";
  return { score, label };
}

export function quickValuation(domain: string, pronounceScore?: number, domainAge?: number | null): QuickValuationResult {
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
  const allMeaningful = meaningfulWords.length >= 1 && junkChars === 0 && isFullyCoveredByWords(name, meaningfulWords);

  // ─── GIBBERISH / JUNK DETECTION ───
  // Long domains with poor dictionary coverage are essentially worthless
  const meaningfulChars = meaningfulWords.reduce((sum, w) => sum + w.length, 0);
  const coverageRatio = name.length > 0 ? meaningfulChars / name.length : 0;

  // If most of the name is covered by dictionary words (≥80%), it's NOT junk —
  // this protects real words with minor suffixes like "creativex", "lunari", etc.
  const highCoverage = coverageRatio >= 0.8;

  // Even stricter: very long random strings with almost no word content
  const isHopelessJunk = !highCoverage && !isDictWord && name.length >= 12 && coverageRatio < 0.5;
  // Medium-length names that are clearly noise — require BOTH zero words AND low coverage
  const isMediumJunk = !highCoverage && !isDictWord && name.length >= 8 && meaningfulWords.length === 0 && coverageRatio < 0.3;
  // Gibberish: long names where dictionary words cover less than 60%
  const isGibberish = !highCoverage && !isDictWord && name.length >= 10 && coverageRatio < 0.6;
  // ─── SPAM DETECTION: too many words = spam, even if dictionary words ───
  const isSpamMultiWord = meaningfulWords.length >= 4 && name.length >= 15;

  // ─── EARLY EXIT: Junk domains are essentially worthless ───
  const junkDrivers: ValueDrivers = { domain_length: 5, keywords: 0, tld: 0, brandability: 0, niche_demand: 0, comparable_sales: 0, liquidity: 0 };
  const junkSellability: SellabilityInsight = { strengths: [], weaknesses: ["Unsellable — no market demand"], buyerType: "Speculative", buyerPool: "Niche" };
  if (isHopelessJunk || isMediumJunk || isSpamMultiWord) {
    return { band: "$5 – $15", score: 2, valueMin: 5, valueMax: 15, wholesaleMin: 0, wholesaleMax: 5, wholesaleBand: "$0 – $5", liquidityScore: 2, liquidityLabel: "Very Low", drivers: junkDrivers, confidence: "Low", confidencePct: 10, sellability: junkSellability };
  }
  if (isGibberish) {
    return { band: "$5 – $50", score: 5, valueMin: 5, valueMax: 50, wholesaleMin: 0, wholesaleMax: 10, wholesaleBand: "$0 – $10", liquidityScore: 5, liquidityLabel: "Very Low", drivers: junkDrivers, confidence: "Low", confidencePct: 12, sellability: junkSellability };
  }

  // ─── AUTO-STANCE DETECTION ───
  // Brandable: short, pronounceable, coined or single-word
  // Keyword-rich: contains premium/trending keywords, longer compound names
  const vowelCount = [...name].filter(c => "aeiouy".includes(c)).length;
  const ratio = vowelCount / name.length;
  const isPronounceable = ratio >= 0.25 && ratio <= 0.6 && !/[bcdfghjklmnpqrstvwxz]{4,}/i.test(name);
  const isBrandable = (isDictWord && name.length <= 8) || (isPronounceable && name.length <= 7 && junkChars === 0);
  const isKeywordRich = premiumMatches.length >= 2 || (premiumMatches.length === 1 && meaningfulWords.length >= 2);
  
  // Stance adjusts weight distribution:
  // Brandable → heavier weight on length, brandability, pronounceability
  // Keyword → heavier weight on keywords, niche demand, trending
  const stance = isBrandable && !isKeywordRich ? "brandable" : isKeywordRich ? "keyword" : "balanced";

  let score = 0;

  // Length (max 20) — exponential curve: short domains are dramatically more valuable
  if (name.length <= 2) score += 20;
  else if (name.length === 3) score += 19;
  else if (name.length === 4) score += 17;
  else if (name.length === 5) score += 14;
  else if (name.length === 6) score += 11;
  else if (name.length <= 8) score += 8;
  else if (name.length <= 10) score += 5;
  else if (name.length <= 14) score += 2;
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

  // Brandability (max 15) — boosted for brandable stance
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

  // Pronounceability bonus (max 5) — boosted for brandable stance
  if (pronounceScore !== undefined) {
    const pronounceBonus = stance === "brandable" ? 0.08 : 0.05;
    score += Math.round(pronounceScore * pronounceBonus);
  }

  // Stance adjustment: brandable domains get a bonus for high pronounceability + short length
  if (stance === "brandable" && isPronounceable && name.length <= 6) score += 3;
  // Keyword-rich domains get bonus for multiple premium keywords  
  if (stance === "keyword" && premiumMatches.length >= 2) score += 3;

  // TM penalty — softer for multi-word domains where brand is partial
  const isMultiWord = meaningfulWords.length >= 2;
  if (trademark.riskLevel === "high" && !isMultiWord) score = Math.min(score, 15);
  else if (trademark.riskLevel === "high" && isMultiWord) score = Math.round(score * 0.7);
  else if (trademark.riskLevel === "medium" && !isMultiWord) score = Math.round(score * 0.6);

  // ─── #4 FIX: AGGRESSIVE WORD-COUNT PENALTIES ───
  // 3+ word domains are dramatically harder to sell and should be severely penalized
  if (meaningfulWords.length >= 3) {
    score = Math.round(score * 0.55); // 45% penalty for 3-word domains
  }
  if (meaningfulWords.length >= 4) {
    score = Math.round(score * 0.4); // additional 60% penalty for 4+ word domains
  }

  // Total max ~115, normalize to 100
  const normalizedTotal = Math.min(100, Math.round((score / 115) * 100));

  // ─── RETAIL VALUE BANDS (lowered ~40% to align with market reality) ───
  let valueMin: number, valueMax: number;
  if ((hasPenaltyWord) || (trademark.riskLevel === "high" && !isMultiWord)) {
    valueMin = 5; valueMax = 50;
  } else if (normalizedTotal >= 97) {
    valueMin = 250000; valueMax = 1000000;
  } else if (normalizedTotal >= 92) {
    valueMin = 80000; valueMax = 350000;
  } else if (normalizedTotal >= 85) {
    valueMin = 25000; valueMax = 100000;
  } else if (normalizedTotal >= 78) {
    valueMin = 8000; valueMax = 40000;
  } else if (normalizedTotal >= 70) {
    valueMin = 3000; valueMax = 15000;
  } else if (normalizedTotal >= 62) {
    valueMin = 1000; valueMax = 5000;
  } else if (normalizedTotal >= 55) {
    valueMin = 300; valueMax = 1500;
  } else if (normalizedTotal >= 45) {
    valueMin = 75; valueMax = 500;
  } else if (normalizedTotal >= 35) {
    valueMin = 20; valueMax = 150;
  } else {
    valueMin = 5; valueMax = 50;
  }

  // ─── ADDITIVE BOOST MODEL (replaces multiplicative stacking) ───
  // Collect all boosts as additive percentages, cap total at +200% (3x max)
  let totalBoostPct = 0;
  const notPenalized = !hasPenaltyWord && trademark.riskLevel !== "high";

  if (notPenalized) {
    // Trending boost: conditional on domain quality
    if (trendMult > 1.0) {
      // Dampen: only give full boost to short, clean domains
      const trendQualityFactor = (name.length <= 8 && (isDictWord || allMeaningful)) ? 1.0
        : (name.length <= 10 && meaningfulWords.length >= 1) ? 0.5
        : 0.2; // long/junk domains get minimal trend benefit
      const trendPct = (trendMult - 1.0) * 100 * trendQualityFactor;
      totalBoostPct += Math.min(60, trendPct); // cap trend at +60%
    }

    // Semantic synergy boost
    if (meaningfulWords.length === 2) {
      const { bonus: synergyBonus } = getSemanticSynergyBonus(meaningfulWords);
      if (synergyBonus > 1.0) {
        totalBoostPct += Math.min(25, (synergyBonus - 1.0) * 100);
      }
    }

    // Niche boost
    const { niche } = computeTrendScore(meaningfulWords, tld);
    if (niche.multiplier > 1.0 && niche.confidence !== "Low") {
      totalBoostPct += Math.min(30, (niche.multiplier - 1.0) * 50);
    }

    // Domain age boost (additive instead of multiplicative)
    if (domainAge !== undefined && domainAge !== null) {
      const ageMult = getAgeMultiplier(domainAge);
      if (ageMult > 1.0) {
        totalBoostPct += Math.min(25, (ageMult - 1.0) * 100);
      }
    }

    // Short .com length premium (additive, capped)
    if (!isDictWord && tld === "com") {
      if (name.length <= 2) totalBoostPct += 80;
      else if (name.length === 3) totalBoostPct += 60;
      else if (name.length === 4) totalBoostPct += 35;
      else if (name.length === 5) totalBoostPct += 15;
    }
  }

  // CAP total boost at 200% (so max multiplier is 3x)
  totalBoostPct = Math.min(200, totalBoostPct);
  const totalMultiplier = 1 + totalBoostPct / 100;
  
  valueMin = Math.round(valueMin * totalMultiplier);
  valueMax = Math.round(valueMax * totalMultiplier);

  // ─── SOFT FLOORS (confidence-weighted, not hard minimums) ───
  if (notPenalized) {
    // Dictionary .com — soft floors (reduced ~50% from previous hard floors)
    if (isDictWord && tld === "com") {
      const dictFloorMin = name.length <= 3 ? 500000 : name.length <= 4 ? 150000 : name.length <= 5 ? 50000 : name.length <= 6 ? 25000 : name.length <= 8 ? 12000 : 5000;
      const dictFloorMax = name.length <= 3 ? 3000000 : name.length <= 4 ? 800000 : name.length <= 5 ? 250000 : name.length <= 6 ? 120000 : name.length <= 8 ? 60000 : 25000;
      // Soft: blend toward floor rather than hard Math.max
      valueMin = Math.round(valueMin * 0.3 + dictFloorMin * 0.7);
      valueMax = Math.round(valueMax * 0.3 + dictFloorMax * 0.7);
    }

    // EMD premium (reduced)
    const emdKey = name.toLowerCase();
    const cpcMult = HIGH_CPC_KEYWORDS[emdKey];
    if (cpcMult && tld === "com") {
      valueMin = Math.max(valueMin, Math.round(15000 * cpcMult));
      valueMax = Math.max(valueMax, Math.round(150000 * cpcMult));
    } else if (cpcMult && PREMIUM_TLDS[tld] && PREMIUM_TLDS[tld] >= 10) {
      const tldDiscount = tld === "ai" ? 0.4 : tld === "io" ? 0.25 : 0.15;
      valueMin = Math.max(valueMin, Math.round(15000 * cpcMult * tldDiscount));
      valueMax = Math.max(valueMax, Math.round(150000 * cpcMult * tldDiscount));
    }

    // Two-word .com soft floors (reduced ~50%)
    if (!isDictWord && allMeaningful && meaningfulWords.length === 2 && tld === "com") {
      const bothDictionary = meaningfulWords.every(w => DICTIONARY_WORDS.has(w));
      const hasPremium = premiumMatches.length >= 1;
      const hasTrending = trends.length >= 1;
      const bothShort = meaningfulWords.every(w => w.length <= 6);

      let floorMin: number, floorMax: number;
      if (bothDictionary && hasPremium && hasTrending) {
        floorMin = 8000; floorMax = 35000;
      } else if (bothDictionary && (hasPremium || hasTrending)) {
        floorMin = 5000; floorMax = 25000;
      } else if (bothDictionary && bothShort) {
        floorMin = 3000; floorMax = 15000;
      } else if (bothDictionary) {
        floorMin = 2000; floorMax = 10000;
      } else if (hasPremium) {
        floorMin = 1500; floorMax = 8000;
      } else {
        floorMin = 500; floorMax = 3000;
      }
      // Soft blend
      valueMin = Math.round(Math.max(valueMin, valueMin * 0.4 + floorMin * 0.6));
      valueMax = Math.round(Math.max(valueMax, valueMax * 0.4 + floorMax * 0.6));
    }

    // Two-word on other premium TLDs (reduced)
    if (!isDictWord && allMeaningful && meaningfulWords.length === 2 && tld !== "com" && PREMIUM_TLDS[tld] && PREMIUM_TLDS[tld] >= 10) {
      const bothDictionary = meaningfulWords.every(w => DICTIONARY_WORDS.has(w));
      const hasPremium = premiumMatches.length >= 1;
      const tldFactor = tld === "ai" ? 0.4 : tld === "io" ? 0.25 : tld === "gg" ? 0.2 : 0.15;

      let altFloor: number;
      if (bothDictionary && hasPremium) altFloor = Math.round(5000 * tldFactor);
      else if (bothDictionary) altFloor = Math.round(2500 * tldFactor);
      else if (hasPremium) altFloor = Math.round(1500 * tldFactor);
      else altFloor = Math.round(500 * tldFactor);
      valueMin = Math.max(valueMin, altFloor);
      valueMax = Math.max(valueMax, Math.round(altFloor * 3));
    }
  }

  // Tighten band
  const maxSpread = valueMin >= 100000 ? 4 : 3;
  if (valueMax > valueMin * maxSpread) {
    valueMax = Math.round(valueMin * maxSpread);
  }

  // ─── WHOLESALE (INVESTOR) VALUE ───
  // Typically 15-35% of retail, depending on liquidity
  const liq = computeLiquidity(name, tld, isDictWord, isPronounceable, meaningfulWords, allMeaningful);
  const wholesaleFactor = liq.score >= 80 ? 0.35 : liq.score >= 60 ? 0.25 : liq.score >= 40 ? 0.18 : liq.score >= 20 ? 0.12 : 0.08;
  let wholesaleMin = Math.round(valueMin * wholesaleFactor);
  let wholesaleMax = Math.round(valueMax * (wholesaleFactor + 0.1));
  // Wholesale can't exceed retail
  wholesaleMax = Math.min(wholesaleMax, valueMax);
  
  // Cap wholesale for low-liquidity domains
  if (liq.score < 30) {
    wholesaleMax = Math.min(wholesaleMax, 2000);
  }

  const band = `$${valueMin.toLocaleString()} – $${valueMax.toLocaleString()}`;
  const wholesaleBand = `$${wholesaleMin.toLocaleString()} – $${wholesaleMax.toLocaleString()}`;

  // Compute value drivers (normalized to 0-100)
  const lengthDriver = name.length <= 2 ? 100 : name.length === 3 ? 95 : name.length === 4 ? 85 : name.length === 5 ? 70 : name.length === 6 ? 55 : name.length <= 8 ? 40 : name.length <= 10 ? 25 : name.length <= 14 ? 10 : 5;
  const tldDriver = Math.min(100, (PREMIUM_TLDS[tld] || 3) * 4);
  const keywordDriver = hasPenaltyWord ? 0 : isDictWord ? 100 : premiumMatches.length >= 2 ? 90 : premiumMatches.length === 1 ? 70 : meaningfulWords.length >= 2 ? 55 : meaningfulWords.length === 1 ? 35 : 5;
  const brandDriver = hasPenaltyWord ? 0 : isDictWord && name.length <= 8 ? 100 : isPronounceable && meaningfulWords.length >= 1 && name.length <= 8 ? 90 : isPronounceable && meaningfulWords.length >= 1 ? 70 : isPronounceable ? 50 : 20;
  const { niche: nicheForDrivers } = computeTrendScore(meaningfulWords, tld);
  const nicheDriver = nicheForDrivers.multiplier > 1.0 && nicheForDrivers.confidence !== "Low" ? Math.min(100, Math.round((nicheForDrivers.multiplier - 1) * 200)) : trends.length > 0 ? Math.min(100, Math.round((trendMult - 1) * 150)) : 10;

  const drivers: ValueDrivers = {
    domain_length: lengthDriver,
    keywords: keywordDriver,
    tld: tldDriver,
    brandability: brandDriver,
    niche_demand: nicheDriver,
    comparable_sales: 0,
    liquidity: liq.score,
  };

  // ─── #6 FIX: CONFIDENCE SCORE (data-quality based, not just score-based) ───
  let confidencePct = 40; // base
  if (isDictWord) confidencePct += 15;
  if (tld === "com") confidencePct += 10;
  if (allMeaningful && meaningfulWords.length <= 2) confidencePct += 10;
  if (liq.score >= 60) confidencePct += 10;
  if (meaningfulWords.length >= 3) confidencePct -= 15;
  if (coverageRatio < 0.7 && !isDictWord) confidencePct -= 10;
  if (isPronounceable) confidencePct += 5;
  confidencePct = Math.max(10, Math.min(95, confidencePct));
  const confidence: QuickValuationResult["confidence"] = confidencePct >= 70 ? "High" : confidencePct >= 45 ? "Medium" : "Low";

  // ─── #5 FIX: SELLABILITY INSIGHTS ───
  const sellability = computeSellability(name, tld, isDictWord, isPronounceable, meaningfulWords, allMeaningful, premiumMatches, trends, liq.score, trademark, stance);

  return { band, score: normalizedTotal, valueMin, valueMax, wholesaleMin, wholesaleMax, wholesaleBand, liquidityScore: liq.score, liquidityLabel: liq.label, drivers, confidence, confidencePct, sellability };
}

// ─── ENRICHED QUICK VALUATION (async — adds trend enrichment + domain age) ───

export interface EnrichedQuickValuationResult extends QuickValuationResult {
  trendBoost: number;
  trendFactors: { label: string; points: number; detail: string }[];
  ageApplied: boolean;
}

/**
 * Async variant of quickValuation that layers in:
 * 1. Domain age multiplier (if provided)
 * 2. AI trend enrichment boost (±15 points influence on value band)
 *
 * Use this in contexts where you already have (or can fetch) enrichment data.
 * Falls back gracefully if enrichment is unavailable.
 */
export async function quickValuationEnriched(
  domain: string,
  opts?: { pronounceScore?: number; domainAge?: number | null; enrichment?: TrendEnrichment | null },
): Promise<EnrichedQuickValuationResult> {
  const pronounceScore = opts?.pronounceScore;
  const domainAge = opts?.domainAge;

  // Get base valuation (with age multiplier baked in)
  const base = quickValuation(domain, pronounceScore, domainAge);

  // Fetch enrichment if not provided
  let enrichment = opts?.enrichment;
  if (enrichment === undefined) {
    enrichment = await fetchTrendEnrichment();
  }

  // Extract meaningful words for trend boost calculation
  const parts = domain.toLowerCase().replace(/^www\./, "").split(".");
  const name = parts[0].replace(/[^a-z0-9]/g, "");
  const tld = parts[1] || "com";
  const wordParts = splitIntoWords(name);
  const meaningfulWords = wordParts.filter(w => w.length >= 2 && (COMMON_WORDS.has(w) || DICTIONARY_WORDS.has(w) || PREMIUM_KEYWORDS.has(w)));

  // Determine niche key for trend boost
  let nicheKey = "general";
  for (const [key, cat] of Object.entries(NICHE_CATEGORIES)) {
    if (cat.keywords.some(kw => meaningfulWords.includes(kw))) {
      nicheKey = key;
      break;
    }
  }

  const { boost, factors } = computeTrendBoost(meaningfulWords, nicheKey, enrichment);

  let { valueMin, valueMax, score, wholesaleMin, wholesaleMax } = base;

  // Apply trend boost as a value multiplier (each boost point ≈ 2% adjustment)
  if (boost !== 0) {
    const boostMult = 1 + boost * 0.02; // e.g. +15 → 1.30x, -10 → 0.80x
    valueMin = Math.round(valueMin * boostMult);
    valueMax = Math.round(valueMax * boostMult);
    wholesaleMin = Math.round(wholesaleMin * boostMult);
    wholesaleMax = Math.round(wholesaleMax * boostMult);
  }

  // Re-tighten band
  const maxSpread = valueMin >= 100000 ? 4 : 3;
  if (valueMax > valueMin * maxSpread) {
    valueMax = Math.round(valueMin * maxSpread);
  }

  const band = `$${valueMin.toLocaleString()} – $${valueMax.toLocaleString()}`;
  const wholesaleBand = `$${wholesaleMin.toLocaleString()} – $${wholesaleMax.toLocaleString()}`;

  return {
    band,
    score,
    valueMin,
    valueMax,
    wholesaleMin,
    wholesaleMax,
    wholesaleBand,
    liquidityScore: base.liquidityScore,
    liquidityLabel: base.liquidityLabel,
    drivers: base.drivers,
    confidence: base.confidence,
    trendBoost: boost,
    trendFactors: factors,
    ageApplied: domainAge !== undefined && domainAge !== null && getAgeMultiplier(domainAge) > 1.0,
  };
}
