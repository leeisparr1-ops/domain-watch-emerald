/**
 * Semantic Similarity Engine
 *
 * Maps domain keywords into semantic categories and computes similarity
 * between domains based on category overlap. Used by the comparable sales
 * anchoring engine to find related domains even when exact keywords differ.
 *
 * Example: "auto" ↔ "car" ↔ "vehicle" all belong to the "automotive" category.
 */

// ─── Semantic category map ───
// Each category contains synonyms / closely-related terms that a domainer would
// consider interchangeable when evaluating comparable sales.

export const SEMANTIC_CATEGORIES: Record<string, Set<string>> = {
  automotive: new Set(["auto", "car", "cars", "vehicle", "motor", "drive", "driver", "driving", "garage", "dealer", "tire", "engine", "fuel", "ev", "hybrid", "sedan", "suv", "truck", "fleet", "racing", "speed", "ride", "park", "parking", "mechanic", "collision", "repair"]),
  finance: new Set(["finance", "financial", "money", "cash", "bank", "banking", "loan", "loans", "credit", "debit", "pay", "payment", "payments", "invest", "investing", "investment", "fund", "funding", "wealth", "capital", "equity", "stock", "stocks", "bond", "bonds", "forex", "trading", "trade", "trader", "mortgage", "insurance", "insure", "policy", "premium", "annuity", "budget", "savings", "tax", "taxes", "accounting", "audit", "fintech", "wallet", "profit", "revenue", "income", "pension", "retire", "retirement"]),
  realestate: new Set(["home", "homes", "house", "houses", "housing", "property", "properties", "estate", "realty", "real", "land", "lot", "lots", "apartment", "condo", "rent", "rental", "lease", "tenant", "landlord", "mortgage", "broker", "listing", "listings", "room", "rooms", "building", "build", "builder", "construction"]),
  health: new Set(["health", "healthy", "medical", "med", "doctor", "doctors", "nurse", "hospital", "clinic", "care", "wellness", "therapy", "therapist", "dental", "dentist", "pharma", "pharmacy", "drug", "drugs", "vitamin", "supplement", "nutrition", "diet", "fitness", "fit", "gym", "yoga", "mental", "rehab", "recovery", "patient", "diagnosis", "treatment", "telehealth", "surgery", "surgeon"]),
  tech: new Set(["tech", "technology", "software", "app", "apps", "web", "digital", "data", "code", "coding", "cloud", "server", "host", "hosting", "cyber", "api", "dev", "developer", "saas", "platform", "system", "systems", "compute", "computing", "network", "ai", "machine", "automation", "algorithm", "database", "analytics", "bot", "robot", "robotics"]),
  crypto: new Set(["crypto", "bitcoin", "blockchain", "token", "tokens", "defi", "nft", "web3", "dao", "chain", "coin", "coins", "mining", "staking", "swap", "dex", "ledger", "hash", "wallet", "ethereum", "solana"]),
  ecommerce: new Set(["shop", "shopping", "store", "stores", "buy", "sell", "deal", "deals", "sale", "sales", "market", "marketplace", "retail", "merchant", "checkout", "cart", "order", "orders", "product", "products", "wholesale", "commerce", "ecommerce", "coupon", "discount", "price", "cheap", "bargain"]),
  travel: new Set(["travel", "trip", "trips", "tour", "tours", "tourism", "hotel", "hotels", "flight", "flights", "airline", "cruise", "vacation", "resort", "booking", "book", "destination", "adventure", "explore", "hostel", "passport", "getaway", "beach", "island"]),
  education: new Set(["learn", "learning", "teach", "teaching", "school", "schools", "university", "college", "course", "courses", "class", "classes", "tutor", "tutoring", "academy", "study", "student", "students", "education", "training", "degree", "diploma", "scholarship", "mentor", "exam"]),
  food: new Set(["food", "foods", "recipe", "recipes", "cook", "cooking", "chef", "restaurant", "restaurants", "eat", "eating", "meal", "meals", "kitchen", "bakery", "cafe", "coffee", "tea", "wine", "beer", "bar", "grill", "pizza", "burger", "sushi", "vegan", "organic", "grocery", "delivery", "catering", "menu"]),
  gaming: new Set(["game", "games", "gaming", "play", "player", "players", "esport", "esports", "casino", "bet", "betting", "gamble", "gambling", "arcade", "quest", "level", "guild", "arena", "stream", "streaming", "twitch", "gamer", "console", "loot", "pvp", "mmo"]),
  legal: new Set(["legal", "law", "lawyer", "lawyers", "attorney", "attorneys", "court", "litigation", "contract", "contracts", "counsel", "judge", "verdict", "arbitration", "compliance", "patent", "trademark", "copyright", "lawsuit", "legislation"]),
  security: new Set(["secure", "security", "guard", "shield", "vault", "safe", "safety", "protect", "protection", "defense", "lock", "cyber", "firewall", "encryption", "threat", "breach", "antivirus", "sentinel", "identity", "access"]),
  energy: new Set(["solar", "green", "energy", "power", "electric", "electricity", "carbon", "climate", "eco", "renewable", "hydrogen", "wind", "battery", "grid", "volt", "watt", "charge", "charging", "clean", "sustain", "sustainability", "biofuel"]),
  beauty: new Set(["beauty", "skin", "skincare", "hair", "makeup", "cosmetic", "cosmetics", "glow", "lash", "nail", "nails", "serum", "cream", "fashion", "style", "wear", "apparel", "boutique", "designer", "glamour"]),
  pet: new Set(["pet", "pets", "dog", "dogs", "cat", "cats", "puppy", "kitten", "vet", "veterinary", "paw", "animal", "animals", "breed", "grooming", "kennel", "shelter", "adoption"]),
  jobs: new Set(["job", "jobs", "hire", "hiring", "work", "career", "careers", "talent", "recruit", "recruiting", "recruitment", "staff", "staffing", "employer", "resume", "payroll", "workforce", "remote", "freelance"]),
  biotech: new Set(["bio", "biotech", "gene", "genes", "genetic", "genome", "dna", "rna", "protein", "cell", "stem", "enzyme", "antibody", "vaccine", "clinical", "molecular", "oncology", "therapeutic", "diagnostic", "lab", "laboratory", "research", "science"]),
  media: new Set(["media", "news", "blog", "content", "creator", "influencer", "podcast", "video", "film", "movie", "music", "audio", "sound", "radio", "broadcast", "publishing", "magazine", "journalism", "photographer", "photography", "streaming"]),
  sports: new Set(["sport", "sports", "athletic", "athletics", "gym", "fitness", "run", "running", "marathon", "yoga", "training", "coach", "coaching", "team", "league", "championship", "tournament", "basketball", "football", "soccer", "tennis", "golf", "swimming", "boxing", "martial"]),
};

/**
 * Get all semantic categories a word belongs to.
 */
export function getCategories(word: string): string[] {
  const lower = word.toLowerCase();
  const cats: string[] = [];
  for (const [cat, words] of Object.entries(SEMANTIC_CATEGORIES)) {
    if (words.has(lower)) cats.push(cat);
  }
  return cats;
}

/**
 * Compute semantic similarity between two sets of keywords.
 * Returns 0-1 where 1 means perfect semantic overlap.
 */
export function semanticSimilarity(wordsA: string[], wordsB: string[]): number {
  if (wordsA.length === 0 || wordsB.length === 0) return 0;

  const catsA = new Set(wordsA.flatMap(getCategories));
  const catsB = new Set(wordsB.flatMap(getCategories));

  if (catsA.size === 0 || catsB.size === 0) return 0;

  // Jaccard similarity on categories
  let intersection = 0;
  for (const c of catsA) {
    if (catsB.has(c)) intersection++;
  }
  const union = new Set([...catsA, ...catsB]).size;
  return intersection / union;
}

/**
 * High-CPC keyword categories for EMD (Exact Match Domain) detection.
 * These keywords command significant premiums when they ARE the domain.
 * Values represent approximate CPC tier multipliers.
 */
export const HIGH_CPC_KEYWORDS: Record<string, number> = {
  // Insurance (highest CPC industry)
  insurance: 3.0, insure: 2.5, "car-insurance": 3.0, "health-insurance": 3.0,
  "life-insurance": 2.8, "home-insurance": 2.5, "auto-insurance": 2.8,
  coverage: 2.0, underwriting: 2.0, liability: 2.0,
  // Legal
  lawyer: 2.8, attorney: 2.8, litigation: 2.5, lawsuit: 2.3,
  mesothelioma: 3.0, settlement: 2.3, bail: 2.0, divorce: 2.2,
  // Finance
  mortgage: 2.8, loan: 2.5, loans: 2.5, credit: 2.3, refinance: 2.5,
  bankruptcy: 2.3, debt: 2.0, invest: 2.0, trading: 2.0,
  // Medical
  rehab: 2.5, treatment: 2.0, clinic: 2.0, surgery: 2.3, dental: 2.2,
  implant: 2.0, orthodontist: 2.2, dermatologist: 2.0,
  // Education
  degree: 2.0, mba: 2.2, college: 2.0, university: 1.8,
  // Real estate
  realtor: 2.0, homes: 2.0, realty: 2.0, property: 2.0,
  // Tech/Cloud
  hosting: 2.0, vpn: 2.2, cloud: 1.8, software: 1.8, saas: 2.0,
  // Casino/Gambling
  casino: 2.5, poker: 2.0, betting: 2.3, gambling: 2.2,
  slots: 2.0, sportsbook: 2.2,
};
