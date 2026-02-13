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
    keywords: ["ai", "gpt", "neural", "machine", "deep", "learn", "robot", "auto", "smart", "quantum", "intel", "agent", "agentic", "synthetic", "cognitive", "algorithm", "compute"],
    multiplier: 1.55,
    heat: "hot",
  },
  fintech: {
    label: "Finance / Fintech",
    keywords: ["pay", "bank", "cash", "loan", "credit", "finance", "trade", "invest", "wallet", "fintech", "money", "fund", "wealth", "capital", "equity", "profit", "defi", "token"],
    multiplier: 1.40,
    heat: "hot",
  },
  health: {
    label: "Health / Wellness",
    keywords: ["health", "med", "fit", "care", "dental", "clinic", "therapy", "mental", "wellness", "organic", "nutrition", "vitamin", "supplement", "telehealth"],
    multiplier: 1.35,
    heat: "warm",
  },
  ecommerce: {
    label: "E-Commerce",
    keywords: ["shop", "store", "buy", "sell", "deal", "sale", "market", "retail", "commerce", "cart", "order", "wholesale"],
    multiplier: 1.30,
    heat: "warm",
  },
  saas: {
    label: "SaaS / Cloud",
    keywords: ["cloud", "tech", "code", "data", "app", "web", "server", "host", "stack", "saas", "api", "dev", "cyber", "digital", "platform", "software", "system"],
    multiplier: 1.35,
    heat: "warm",
  },
  real_estate: {
    label: "Real Estate",
    keywords: ["home", "homes", "house", "land", "estate", "rent", "property", "build", "room", "space", "real", "mortgage", "apartment", "condo"],
    multiplier: 1.30,
    heat: "stable",
  },
  energy: {
    label: "Energy / Green",
    keywords: ["solar", "green", "energy", "power", "electric", "carbon", "climate", "eco", "renewable", "hydrogen"],
    multiplier: 1.25,
    heat: "warm",
  },
  travel: {
    label: "Travel / Lifestyle",
    keywords: ["travel", "hotel", "flight", "trip", "tour", "cruise", "food", "chef", "wine", "luxury", "life", "vacation", "resort"],
    multiplier: 1.20,
    heat: "stable",
  },
  security: {
    label: "Cybersecurity",
    keywords: ["secure", "guard", "shield", "vault", "safe", "protect", "defense", "lock", "cyber", "firewall", "encryption"],
    multiplier: 1.35,
    heat: "hot",
  },
  gaming: {
    label: "Gaming / Entertainment",
    keywords: ["game", "play", "stream", "video", "music", "sport", "bet", "club", "esport", "casino"],
    multiplier: 1.25,
    heat: "stable",
  },
  jobs: {
    label: "Jobs / HR",
    keywords: ["jobs", "hire", "work", "career", "talent", "recruit", "staff", "team", "employer"],
    multiplier: 1.20,
    heat: "stable",
  },
  education: {
    label: "Education",
    keywords: ["school", "course", "tutor", "academy", "learn", "study", "university", "teach", "training", "education"],
    multiplier: 1.15,
    heat: "cooling",
  },
  legal: {
    label: "Legal / Insurance",
    keywords: ["legal", "law", "lawyer", "insure", "claim", "policy", "attorney", "court", "litigation"],
    multiplier: 1.30,
    heat: "stable",
  },
  automotive: {
    label: "Automotive",
    keywords: ["car", "auto", "vehicle", "motor", "drive", "electric", "ev", "truck", "dealer"],
    multiplier: 1.20,
    heat: "stable",
  },
  crypto: {
    label: "Crypto / Web3",
    keywords: ["crypto", "blockchain", "token", "defi", "nft", "web3", "dao", "chain", "coin", "mining"],
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
    if (tld === "ai" && key === "ai_tech") score += 1.5;
    if (tld === "io" && (key === "saas" || key === "ai_tech")) score += 0.5;
    if (tld === "finance" && key === "fintech") score += 1;

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
  if (tld === "ai" && niche.niche === "ai_tech") score += 15;
  else if (tld === "io" && (niche.niche === "saas" || niche.niche === "ai_tech")) score += 10;
  else if (tld === "com") score += 8;
  else if (["co", "app", "dev", "net"].includes(tld)) score += 5;

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

  // Dictionary .com bonus — single dictionary words on .com are ultra-premium
  if (isDictWord && tld === "com" && !hasPenaltyWord && trademark.riskLevel !== "high") {
    const dictFloorMin = name.length <= 3 ? 200000 : name.length <= 4 ? 100000 : name.length <= 5 ? 50000 : name.length <= 6 ? 25000 : name.length <= 8 ? 12000 : 8000;
    const dictFloorMax = name.length <= 3 ? 500000 : name.length <= 4 ? 400000 : name.length <= 5 ? 250000 : name.length <= 6 ? 150000 : name.length <= 8 ? 50000 : 30000;
    valueMin = Math.max(valueMin, dictFloorMin);
    valueMax = Math.max(valueMax, dictFloorMax);
  }

  // Two-word brandable .com bonus — clean compound words on .com deserve a floor
  if (!isDictWord && allMeaningful && meaningfulWords.length === 2 && tld === "com" && !hasPenaltyWord && trademark.riskLevel !== "high") {
    const hasPremium = premiumMatches.length >= 1;
    const twoWordFloorMin = hasPremium ? 3000 : 1500;
    const twoWordFloorMax = hasPremium ? 10000 : 5000;
    valueMin = Math.max(valueMin, twoWordFloorMin);
    valueMax = Math.max(valueMax, twoWordFloorMax);
  }

  // Tighten band
  if (valueMax > valueMin * 3) {
    valueMax = Math.round(valueMin * 3);
  }

  const band = `$${valueMin.toLocaleString()} – $${valueMax.toLocaleString()}`;
  return { band, score: normalizedTotal, valueMin, valueMax };
}
