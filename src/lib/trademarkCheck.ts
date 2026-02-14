/**
 * Client-side trademark/brand risk detection for domain names.
 * NOT legal advice — flags obvious conflicts with well-known brands.
 */

export type TrademarkRiskLevel = "high" | "medium" | "low" | "none";

export interface TrademarkResult {
  riskLevel: TrademarkRiskLevel;
  matches: { brand: string; matchType: "exact" | "contains" | "variant" }[];
  summary: string;
}

// ~500+ well-known brands/trademarks that domainers should avoid
// Includes global, US, UK, EU, Asian mega-brands
const KNOWN_BRANDS = new Set([
  // ─── Tech giants ───
  "google", "apple", "microsoft", "amazon", "facebook", "meta", "netflix", "spotify",
  "tesla", "nvidia", "intel", "amd", "samsung", "sony", "tiktok", "snapchat",
  "twitter", "instagram", "whatsapp", "linkedin", "pinterest", "reddit", "discord",
  "uber", "lyft", "airbnb", "stripe", "paypal", "venmo", "shopify", "squarespace",
  "wordpress", "salesforce", "oracle", "cisco", "adobe", "autodesk", "dropbox",
  "slack", "zoom", "twitch", "youtube", "github", "gitlab", "docker", "kubernetes",
  "openai", "anthropic", "midjourney", "chatgpt", "copilot", "alibaba", "tencent",
  "baidu", "huawei", "xiaomi", "oppo", "vivo", "oneplus", "lenovo", "asus",
  "dell", "hewlett packard", "ibm", "qualcomm", "broadcom", "vmware", "palantir",
  "snowflake", "datadog", "cloudflare", "netlify", "vercel", "supabase", "firebase",
  "heroku", "twilio", "sendgrid", "mailchimp", "hubspot", "zendesk", "atlassian",
  "jira", "confluence", "trello", "asana", "notion", "figma", "canva", "sketch",
  "wix", "godaddy", "namecheap", "cloudfront", "akamai",

  // ─── UK Retail & Supermarkets ───
  "tesco", "sainsburys", "sainsbury", "asda", "morrisons", "waitrose", "aldi", "lidl",
  "marks and spencer", "marksandspencer", "primark", "john lewis", "johnlewis",
  "argos", "currys", "boots", "superdrug", "wilko", "poundland", "greggs",
  "iceland", "ocado", "deliveroo", "justeat", "asos", "boohoo", "missguided",
  "topshop", "next", "debenhams", "selfridges", "harrods", "fortnum", "liberty",

  // ─── UK Telecom & Media ───
  "vodafone", "three", "ee", "bt", "virgin media", "virginmedia", "sky", "talktalk",
  "plusnet", "giffgaff", "bbc", "itv", "channel4",

  // ─── UK Finance ───
  "barclays", "lloyds", "hsbc", "natwest", "halifax", "santander", "nationwide",
  "monzo", "revolut", "starling", "wise", "transferwise",

  // ─── UK Brands ───
  "dyson", "rolls royce", "rollsroyce", "jaguar", "land rover", "landrover",
  "mclaren", "aston martin", "astonmartin", "bentley", "burberry", "barbour",
  "ted baker", "tedbaker", "joules", "superdry", "lush", "the body shop",

  // ─── Consumer brands (Fashion/Luxury) ───
  "nike", "adidas", "puma", "reebok", "gucci", "prada", "chanel", "louisvuitton",
  "hermes", "versace", "armani", "balenciaga", "supreme", "rolex",
  "cartier", "tiffany", "pandora", "dior", "fendi", "valentino", "givenchy",
  "yves saint laurent", "bottega veneta", "bottegaveneta", "moncler", "ralph lauren",
  "ralphlauren", "tommy hilfiger", "tommyhilfiger", "calvin klein", "calvinklein",
  "hugo boss", "hugoboss", "zara", "hm", "uniqlo", "lululemon", "patagonia",
  "north face", "northface", "columbia", "timberland", "converse", "vans",
  "new balance", "newbalance", "under armour", "underarmour", "skechers",
  "ray ban", "rayban", "oakley", "swarovski",

  // ─── Auto ───
  "toyota", "honda", "ford", "bmw", "mercedes", "audi", "porsche", "ferrari",
  "lamborghini", "maserati", "lexus", "volvo", "hyundai", "subaru",
  "chevrolet", "jeep", "dodge", "chrysler", "cadillac", "buick", "mazda", "nissan",
  "mitsubishi", "kia", "rivian", "lucid", "polestar", "genesis", "infiniti",
  "fiat", "alfa romeo", "alfaromeo", "citroen", "peugeot", "renault", "skoda",
  "seat", "vauxhall", "suzuki", "isuzu", "dacia",

  // ─── Food & beverage ───
  "cocacola", "coca cola", "pepsi", "pepsico", "starbucks", "mcdonalds",
  "burgerking", "wendys", "subway", "dominos", "pizzahut", "chipotle", "dunkin",
  "redbull", "monster", "gatorade", "nestle", "kraft", "heinz", "kellogg",
  "oreo", "doritos", "lays", "pringles", "cadbury", "lindt", "ferrero",
  "nutella", "toblerone", "haribo", "walkers", "guinness", "heineken",
  "budweiser", "carlsberg", "stella artois", "johnnie walker", "jack daniels",
  "absolut", "smirnoff", "bacardi", "nandos", "kfc", "popeyes", "chick fil a",
  "chickfila", "tacobell", "papajohns", "fiveguys", "shakeshack",
  "krispy kreme", "krispykreme", "costa", "tim hortons", "panera",

  // ─── Finance ───
  "visa", "mastercard", "amex", "american express", "chase", "citibank",
  "goldman", "jpmorgan", "morgan stanley", "schwab", "fidelity", "vanguard",
  "robinhood", "coinbase", "binance", "kraken", "blackrock", "state street",
  "capital one", "capitalone", "wells fargo", "wellsfargo", "bank of america",
  "bankofamerica", "deutsche bank", "ubs", "credit suisse", "bnp paribas",
  "societe generale", "ing", "rabobank", "klarna", "affirm", "sofi", "chime",
  "plaid", "square", "block",

  // ─── Retail ───
  "walmart", "target", "costco", "ikea", "homedepot", "lowes", "macys",
  "nordstrom", "sephora", "ulta", "bestbuy", "gamestop", "ebay", "etsy",
  "wayfair", "chewy", "instacart", "doordash", "grubhub", "ubereats",
  "wish", "shein", "temu", "aliexpress",

  // ─── Media & entertainment ───
  "disney", "pixar", "marvel", "warner", "hbo", "paramount", "universal",
  "lionsgate", "dreamworks", "nintendo", "playstation", "xbox", "roblox",
  "fortnite", "minecraft", "pokemon", "starwars", "hulu", "peacock",
  "crunchyroll", "funimation", "paramount plus", "discovery", "espn",
  "bbc", "cnn", "fox", "nbc", "cbs", "abc", "reuters", "bloomberg",
  "new york times", "washington post", "guardian", "telegraph", "financial times",

  // ─── Pharma & health ───
  "pfizer", "moderna", "johnson", "bayer", "merck", "novartis", "roche",
  "abbvie", "amgen", "gilead", "astrazeneca", "glaxosmithkline", "gsk",
  "sanofi", "eli lilly", "bristol myers", "regeneron", "biogen",

  // ─── Airlines & travel ───
  "delta", "united", "southwest", "jetblue", "emirates", "qatar", "lufthansa",
  "british airways", "ryanair", "easyjet", "wizz air", "wizzair",
  "booking", "expedia", "tripadvisor", "marriott",
  "hilton", "hyatt", "sheraton", "radisson", "wyndham", "accor", "ihg",
  "airfrance", "klm", "singapore airlines", "cathay pacific", "qantas",
  "virgin atlantic", "norwegian", "turkish airlines",

  // ─── Telecom (global) ───
  "att", "verizon", "tmobile", "sprint", "comcast", "xfinity",
  "orange", "telefonica", "movistar", "dtag", "telekom", "swisscom",
  "singtel", "ntt", "softbank", "jio", "airtel",

  // ─── Sports ───
  "nfl", "nba", "mlb", "nhl", "fifa", "uefa", "premier league", "premierleague",
  "formula one", "f1", "olympics", "espn",

  // ─── Software & SaaS ───
  "sap", "workday", "servicenow", "okta", "crowdstrike", "palo alto",
  "splunk", "elastic", "mongodb", "redis", "postgres", "mysql",
  "tableau", "power bi", "looker", "dbt",

  // ─── Misc globally famous ───
  "lego", "mattel", "hasbro", "bandai", "fisher price", "hot wheels",
  "barbie", "transformers",
  "fedex", "ups", "dhl", "royal mail", "hermes parcel", "evri",
  "xerox", "canon", "nikon", "gopro", "bose", "sonos", "jbl", "beats",
  "philips", "siemens", "bosch", "whirlpool", "electrolux", "lg", "panasonic",
  "sharp", "toshiba", "hitachi", "mitsubishi electric",
  "3m", "caterpillar", "deere", "honeywell", "ge", "general electric",
  "shell", "bp", "exxonmobil", "chevron", "total", "petrochina", "aramco",
  "spacex", "virgin galactic",
]);

// Flatten multi-word brands for matching
const BRAND_WORDS: string[] = [];
KNOWN_BRANDS.forEach((b) => {
  const collapsed = b.replace(/\s+/g, "");
  BRAND_WORDS.push(collapsed);
});
const UNIQUE_BRANDS = [...new Set(BRAND_WORDS)].sort((a, b) => b.length - a.length);

// Words that naturally contain brand names as substrings — NOT infringement
const BRAND_IN_WORD: Record<string, string[]> = {
  "intel": ["intelligence", "intelligent", "intellectual", "intelligently"],
  "uber": ["tuber", "exuberant", "exuberance"],
  "chase": ["purchase", "purchased", "purchaser"],
  "ford": ["afford", "affordable", "oxford", "stanford", "bedford", "comfort"],
  "visa": ["advise", "advisor", "advisory", "visual", "revision", "television"],
  "apple": ["pineapple", "grapple", "dapple"],
  "bing": ["binding", "climbing", "plumbing"],
  "amd": ["named", "framed", "gamed"],
  "kia": ["akia", "nokia"],
  "slack": ["slacker"],
  "bayer": ["player", "prayer", "layer"],
  "shell": ["seashell", "nutshell", "eggshell", "bombshell"],
  "ally": ["rally", "tally", "valley", "literally", "finally", "usually"],
  "mars": ["marshals", "marshal", "nightmare"],
  "cox": ["coxswain"],
  "next": ["nextgen", "nextlevel"], // "next" the brand is common, but "nextgen" is generic
  "sky": ["skyline", "skydive", "skyscraper"],
  "boots": ["bootstrap", "bootstrapping"],
  "costa": ["coastal"],
  "ee": [], // too short, handled by length check
  "bp": [], // too short
  "lg": [], // too short
  "ge": [], // too short
  "bt": [], // too short
  "ing": ["amazing", "running", "coming", "going", "being", "doing", "making", "taking",
          "looking", "finding", "working", "living", "giving", "telling", "calling",
          "moving", "playing", "trying", "building", "setting", "trading", "hosting",
          "coding", "mining", "dining", "fishing", "banking", "booking", "cooking",
          "parking", "shopping", "spring", "string", "thing", "king", "ring", "sing",
          "bring", "swing", "fling", "cling", "sting", "wring"],
  "three": [],
  "block": ["blockchain", "blocker", "blocking"],
  "square": ["squared"],
  "target": ["targeted", "targeting"],
  "canon": ["canonical"],
  "sharp": ["sharpen", "sharpened"],
  "total": ["totally"],
};

// Common letter substitutions used in typosquatting
const LEET_MAP: Record<string, string> = {
  "0": "o", "1": "i", "3": "e", "4": "a", "5": "s", "7": "t", "8": "b", "@": "a",
};

function normalizeLeet(s: string): string {
  return [...s].map((c) => LEET_MAP[c] || c).join("");
}

/** Check a domain name for potential trademark conflicts */
export function checkTrademarkRisk(domainInput: string): TrademarkResult {
  const parts = domainInput.toLowerCase().replace(/^www\./, "").split(".");
  const rawName = parts[0].replace(/[-_]/g, "");
  const normalizedName = normalizeLeet(rawName);

  const matches: TrademarkResult["matches"] = [];

  for (const brand of UNIQUE_BRANDS) {
    if (brand.length < 3) continue; // skip very short brands

    // Exact match (domain IS the brand)
    if (rawName === brand || normalizedName === brand) {
      matches.push({ brand, matchType: "exact" });
      continue;
    }

    // Contains match (brand appears as substring)
    if (rawName.includes(brand) || normalizedName.includes(brand)) {
      // Check if the brand is naturally embedded in a larger legitimate word
      const allowedWords = BRAND_IN_WORD[brand];
      if (allowedWords && allowedWords.length > 0) {
        const isFalsePositive = allowedWords.some(word => rawName.includes(word) || normalizedName.includes(word));
        if (isFalsePositive) continue;
      }
      matches.push({ brand, matchType: "contains" });
      continue;
    }

    // Variant detection: off-by-one (simple Levenshtein distance = 1 for short brands)
    if (brand.length >= 4 && brand.length <= 10 && Math.abs(rawName.length - brand.length) <= 1) {
      if (levenshteinDistance(normalizedName, brand) === 1) {
        matches.push({ brand, matchType: "variant" });
      }
    }
  }

  // Deduplicate by brand (keep highest severity)
  const seen = new Map<string, typeof matches[0]>();
  const priority: Record<string, number> = { exact: 3, contains: 2, variant: 1 };
  for (const m of matches) {
    const existing = seen.get(m.brand);
    if (!existing || priority[m.matchType] > priority[existing.matchType]) {
      seen.set(m.brand, m);
    }
  }
  const deduped = [...seen.values()];

  // Determine risk level
  let riskLevel: TrademarkRiskLevel = "none";
  let summary = "No known trademark conflicts detected";

  const hasExact = deduped.some((m) => m.matchType === "exact");
  const hasContains = deduped.some((m) => m.matchType === "contains");
  const hasVariant = deduped.some((m) => m.matchType === "variant");

  if (hasExact) {
    riskLevel = "high";
    summary = `Exact match with "${deduped.find(m => m.matchType === "exact")!.brand}" — likely UDRP/trademark claim`;
  } else if (hasContains) {
    riskLevel = deduped.length > 1 ? "high" : "medium";
    const brandNames = deduped.filter(m => m.matchType === "contains").map(m => m.brand).join(", ");
    summary = `Contains trademarked term: ${brandNames}`;
  } else if (hasVariant) {
    riskLevel = "low";
    const brandNames = deduped.filter(m => m.matchType === "variant").map(m => m.brand).join(", ");
    summary = `Resembles "${brandNames}" — could be flagged as typosquatting`;
  }

  return { riskLevel, matches: deduped, summary };
}

/** Simple Levenshtein distance for short strings */
function levenshteinDistance(a: string, b: string): number {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const matrix: number[][] = [];
  for (let i = 0; i <= a.length; i++) matrix[i] = [i];
  for (let j = 0; j <= b.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }
  return matrix[a.length][b.length];
}

/** Get display info for risk level */
export function getTrademarkRiskDisplay(level: TrademarkRiskLevel) {
  switch (level) {
    case "high":
      return { label: "High TM Risk", color: "text-red-600 border-red-500/30 bg-red-500/10 dark:text-red-400", emoji: "⚠️" };
    case "medium":
      return { label: "Med TM Risk", color: "text-orange-600 border-orange-500/30 bg-orange-500/10 dark:text-orange-400", emoji: "⚡" };
    case "low":
      return { label: "Low TM Risk", color: "text-yellow-600 border-yellow-500/30 bg-yellow-500/10 dark:text-yellow-400", emoji: "💡" };
    case "none":
      return { label: "TM Clear", color: "text-emerald-600 border-emerald-500/30 bg-emerald-500/10 dark:text-emerald-400", emoji: "✅" };
  }
}
