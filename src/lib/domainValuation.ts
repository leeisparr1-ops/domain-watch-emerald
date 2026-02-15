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
]);

// Trending keywords with heat multipliers (curated from publicly reported aftermarket trends)
export const TRENDING_KEYWORDS: Record<string, number> = {
  // AI / Machine Learning
  "ai": 2.5, "gpt": 2.0, "neural": 1.8, "machine": 1.5, "deep": 1.5, "learn": 1.5,
  "robot": 1.6, "auto": 1.6, "smart": 1.5, "quantum": 2.0, "intel": 1.5,
  "agent": 2.2, "agentic": 2.0, "synthetic": 1.6, "cognitive": 1.5,
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
  "vr": 1.4, "ar": 1.3, "metaverse": 1.3, "virtual": 1.3, "immersive": 1.3, "spatial": 1.4,
  // Cannabis/CBD
  "cbd": 1.3, "cannabis": 1.3, "hemp": 1.3,
  // Content & creator economy
  "creator": 1.5, "influencer": 1.4, "podcast": 1.4, "content": 1.3, "newsletter": 1.3,
  // Additional trending compound terms
  "copilot": 1.6, "chatbot": 1.5, "genai": 1.6, "llm": 1.5,
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
    keywords: ["ai", "gpt", "neural", "machine", "deep", "learn", "robot", "auto", "smart", "quantum", "intel", "agent", "agentic", "synthetic", "cognitive", "algorithm", "compute", "llm", "model", "vision", "prompt", "copilot", "chatbot", "genai"],
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
    keywords: ["game", "play", "stream", "video", "music", "sport", "bet", "club", "esport", "casino", "arcade", "quest", "level", "guild", "arena", "twitch", "gamer", "console", "pixel", "loot", "pvp", "mmo", "rpg"],
    multiplier: 1.25,
    heat: "stable",
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
    food: ["food"], space: ["space"], game: ["gaming"], dev: ["saas", "ai_tech"],
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
  const allMeaningful = meaningfulWords.length >= 1 && junkChars === 0 && isFullyCoveredByWords(name, meaningfulWords);

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

  // Semantic synergy bonus for related compound words
  if (meaningfulWords.length === 2 && !hasPenaltyWord && trademark.riskLevel !== "high") {
    const { bonus: synergyBonus } = getSemanticSynergyBonus(meaningfulWords);
    if (synergyBonus > 1.0) {
      valueMin = Math.round(valueMin * synergyBonus);
      valueMax = Math.round(valueMax * synergyBonus);
    }
  }

  // Niche multiplier (match full estimator logic)
  const { niche } = computeTrendScore(meaningfulWords, tld);
  if (niche.multiplier > 1.0 && niche.confidence !== "Low" && !hasPenaltyWord && trademark.riskLevel !== "high") {
    const nicheBoost = 1 + (niche.multiplier - 1) * 0.5;
    valueMin = Math.round(valueMin * nicheBoost);
    valueMax = Math.round(valueMax * nicheBoost);
  }

  // Dictionary .com bonus — single dictionary words on .com are ultra-premium
  if (isDictWord && tld === "com" && !hasPenaltyWord && trademark.riskLevel !== "high") {
    const dictFloorMin = name.length <= 3 ? 200000 : name.length <= 4 ? 100000 : name.length <= 5 ? 50000 : name.length <= 6 ? 25000 : name.length <= 8 ? 12000 : 8000;
    const dictFloorMax = name.length <= 3 ? 500000 : name.length <= 4 ? 400000 : name.length <= 5 ? 250000 : name.length <= 6 ? 150000 : name.length <= 8 ? 50000 : 30000;
    valueMin = Math.max(valueMin, dictFloorMin);
    valueMax = Math.max(valueMax, dictFloorMax);
  }

  // Two-word brandable .com bonus — tiered by word quality
  if (!isDictWord && allMeaningful && meaningfulWords.length === 2 && tld === "com" && !hasPenaltyWord && trademark.riskLevel !== "high") {
    const bothDictionary = meaningfulWords.every(w => DICTIONARY_WORDS.has(w));
    const hasPremium = premiumMatches.length >= 1;
    const hasTrending = trends.length >= 1;
    const bothShort = meaningfulWords.every(w => w.length <= 6);

    let twoWordFloorMin: number, twoWordFloorMax: number;

    if (bothDictionary && hasPremium && hasTrending) {
      twoWordFloorMin = 25000; twoWordFloorMax = 100000;
    } else if (bothDictionary && (hasPremium || hasTrending)) {
      twoWordFloorMin = 15000; twoWordFloorMax = 75000;
    } else if (bothDictionary && bothShort) {
      twoWordFloorMin = 10000; twoWordFloorMax = 50000;
    } else if (bothDictionary) {
      twoWordFloorMin = 8000; twoWordFloorMax = 35000;
    } else if (hasPremium) {
      twoWordFloorMin = 5000; twoWordFloorMax = 25000;
    } else {
      twoWordFloorMin = 2000; twoWordFloorMax = 10000;
    }

    valueMin = Math.max(valueMin, twoWordFloorMin);
    valueMax = Math.max(valueMax, twoWordFloorMax);
  }

  // Two-word brandable on other premium TLDs
  if (!isDictWord && allMeaningful && meaningfulWords.length === 2 && tld !== "com" && PREMIUM_TLDS[tld] && PREMIUM_TLDS[tld] >= 10 && !hasPenaltyWord && trademark.riskLevel !== "high") {
    const bothDictionary = meaningfulWords.every(w => DICTIONARY_WORDS.has(w));
    const hasPremium = premiumMatches.length >= 1;
    const tldFactor = tld === "ai" ? 0.6 : tld === "io" ? 0.4 : 0.3;

    let altFloorMin: number, altFloorMax: number;
    if (bothDictionary && hasPremium) {
      altFloorMin = Math.round(10000 * tldFactor); altFloorMax = Math.round(50000 * tldFactor);
    } else if (bothDictionary) {
      altFloorMin = Math.round(5000 * tldFactor); altFloorMax = Math.round(25000 * tldFactor);
    } else if (hasPremium) {
      altFloorMin = Math.round(3000 * tldFactor); altFloorMax = Math.round(15000 * tldFactor);
    } else {
      altFloorMin = Math.round(1000 * tldFactor); altFloorMax = Math.round(5000 * tldFactor);
    }
    valueMin = Math.max(valueMin, altFloorMin);
    valueMax = Math.max(valueMax, altFloorMax);
  }

  // Tighten band
  if (valueMax > valueMin * 3) {
    valueMax = Math.round(valueMin * 3);
  }

  const band = `$${valueMin.toLocaleString()} – $${valueMax.toLocaleString()}`;
  return { band, score: normalizedTotal, valueMin, valueMax };
}
