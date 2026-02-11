import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { DollarSign, TrendingUp, TrendingDown, Minus, ShieldAlert, ShieldCheck } from "lucide-react";
import { checkTrademarkRisk, getTrademarkRiskDisplay, type TrademarkResult } from "@/lib/trademarkCheck";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface ValuationResult {
  estimatedValue: string;
  confidence: "High" | "Medium" | "Low";
  overallScore: number;
  factors: { label: string; score: number; maxScore: number; detail: string }[];
  trademark: TrademarkResult;
}

const PREMIUM_TLDS: Record<string, number> = {
  com: 25, net: 14, org: 13, io: 16, ai: 18, co: 14, app: 12, dev: 11, me: 9, xyz: 5, info: 4, biz: 3,
};

const PREMIUM_KEYWORDS = new Set([
  "ai", "crypto", "cloud", "tech", "pay", "bet", "buy", "sell", "trade", "bank", "cash", "loan",
  "health", "fit", "auto", "car", "home", "solar", "green", "data", "code", "web", "app", "game",
  "shop", "store", "deal", "sale", "food", "travel", "hotel", "dating", "jobs", "news", "legal",
  "quantum", "meta", "cyber", "robot", "drone", "space", "block", "chain", "fintech", "saas",
  "defi", "token", "intel", "logic", "matrix", "pixel", "forge", "core", "hub", "lab",
  "stack", "flow", "grid", "sync", "bolt", "shift", "spark", "edge", "apex", "nova",
]);

// Domains containing these words are worth very little (trademark, pharma, adult)
const PENALTY_KEYWORDS = new Set([
  "viagra", "cialis", "porn", "sex", "xxx", "casino", "gambling", "weed", "marijuana",
  "pharma", "drug", "pill", "medication", "prescription", "erectile", "penis", "nude",
  "naked", "adult", "escort", "bitcoin", "ethereum", "nft", "forex", "mlm", "scam",
  "hack", "crack", "pirate", "torrent", "replica", "fake", "counterfeit",
]);

// ─── DICTIONARY WORDS: single real English words that carry intrinsic value ───
// These are common, meaningful dictionary words (not brand names)
const DICTIONARY_WORDS = new Set([
  // Action verbs (high commercial value)
  "delete", "control", "access", "launch", "boost", "build", "create", "design", "drive", "enable",
  "execute", "expand", "explore", "focus", "gather", "guard", "handle", "ignite", "impact", "import",
  "export", "invest", "manage", "master", "measure", "merge", "monitor", "multiply", "navigate", "observe",
  "operate", "optimize", "order", "perform", "permit", "power", "predict", "process", "produce", "protect",
  "provide", "publish", "purchase", "pursue", "qualify", "recover", "reduce", "refine", "refresh", "release",
  "render", "repair", "replace", "report", "request", "require", "rescue", "resolve", "respond", "restore",
  "retain", "reveal", "review", "reward", "rotate", "satisfy", "schedule", "secure", "select", "simplify",
  "solve", "supply", "support", "sustain", "target", "track", "transfer", "transform", "trigger", "unlock",
  "update", "upgrade", "upload", "verify", "connect", "deliver", "discover", "evolve", "generate",
  // Nouns with strong commercial meaning
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
  // Short powerful words (1-5 letters) — extremely high value on .com
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
  // Very high value single dictionary words
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

// GoDaddy's top keyword categories & trending niches for value multipliers
const TRENDING_KEYWORDS: Record<string, number> = {
  // AI / Machine Learning (huge demand 2024-2026)
  "ai": 2.5, "gpt": 2.0, "neural": 1.8, "machine": 1.5, "deep": 1.5, "learn": 1.5,
  "robot": 1.6, "auto": 1.4, "smart": 1.5, "quantum": 2.0, "intel": 1.5,
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
  "home": 1.6, "house": 1.5, "land": 1.5, "estate": 1.6, "rent": 1.4, "property": 1.5,
  "build": 1.3, "room": 1.3, "space": 1.4,
  // Energy & Sustainability
  "solar": 1.6, "green": 1.4, "energy": 1.5, "power": 1.4, "electric": 1.4, "carbon": 1.3,
  "climate": 1.3, "eco": 1.3,
  // Travel & Lifestyle
  "travel": 1.5, "hotel": 1.5, "flight": 1.4, "trip": 1.3, "tour": 1.3, "cruise": 1.3,
  "food": 1.4, "chef": 1.3, "wine": 1.3, "luxury": 1.4,
  // Security
  "secure": 1.5, "guard": 1.3, "shield": 1.3, "vault": 1.4, "safe": 1.3, "protect": 1.3,
  "defense": 1.3, "lock": 1.3,
  // Gaming & Entertainment
  "game": 1.5, "play": 1.4, "stream": 1.4, "video": 1.3, "music": 1.3, "sport": 1.3,
  // Jobs & Education
  "jobs": 1.5, "hire": 1.4, "work": 1.3, "career": 1.4, "talent": 1.3,
  "school": 1.3, "course": 1.3, "tutor": 1.3, "academy": 1.3,
  // Legal & Insurance
  "legal": 1.5, "law": 1.4, "insure": 1.5, "claim": 1.3, "policy": 1.3,
};

// Common English words for word-boundary detection (expanded)
const COMMON_WORDS = new Set([
  ...DICTIONARY_WORDS,
  ...PREMIUM_KEYWORDS,
  // Basic small words for splitting
  "the", "and", "for", "are", "but", "not", "you", "all", "can", "had", "her", "was", "one",
  "our", "out", "day", "get", "has", "him", "his", "how", "its", "may", "new", "now", "old",
  "see", "way", "who", "did", "got", "let", "say", "she", "too", "use", "big", "top", "best",
  "go", "no", "my", "up", "do", "so", "we", "if", "me", "on", "in", "it", "to", "be", "as",
  "at", "by", "or", "an", "of", "is",
]);

/** Try to split a domain name into recognizable words */
function splitIntoWords(name: string): string[] {
  const words: string[] = [];
  let remaining = name.toLowerCase();
  let iterations = 0;
  while (remaining.length > 0 && iterations < 30) {
    iterations++;
    let found = false;
    // Try longest match first (up to 10 chars for longer dictionary words)
    for (let len = Math.min(remaining.length, 10); len >= 2; len--) {
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

/** Check if the entire domain name is a single dictionary word */
function isSingleDictionaryWord(name: string): boolean {
  return DICTIONARY_WORDS.has(name.toLowerCase());
}

/** Get trending keyword multiplier for the domain */
function getTrendingMultiplier(words: string[]): { multiplier: number; trends: string[] } {
  let multiplier = 1.0;
  const trends: string[] = [];
  for (const word of words) {
    const m = TRENDING_KEYWORDS[word];
    if (m && m > 1.0) {
      multiplier = Math.max(multiplier, m); // Use highest single multiplier
      trends.push(word);
    }
  }
  // If multiple trending words combine, add a combo bonus
  if (trends.length >= 2) {
    multiplier *= 1.3;
  }
  return { multiplier, trends };
}

function estimateValue(domain: string): ValuationResult {
  const parts = domain.toLowerCase().replace(/^www\./, "").split(".");
  const name = parts[0].replace(/[^a-z0-9]/g, "");
  const tld = parts[1] || "com";
  const factors: ValuationResult["factors"] = [];
  let total = 0;

  // Run trademark check
  const trademark = checkTrademarkRisk(domain);

  // 1. Length (max 20)
  let lengthScore = 0;
  let lengthDetail = "";
  if (name.length <= 2) { lengthScore = 20; lengthDetail = "ultra-short premium"; }
  else if (name.length === 3) { lengthScore = 18; lengthDetail = "3-letter premium"; }
  else if (name.length === 4) { lengthScore = 16; lengthDetail = "4-letter — very strong"; }
  else if (name.length === 5) { lengthScore = 14; lengthDetail = "5-letter — strong"; }
  else if (name.length === 6) { lengthScore = 12; lengthDetail = "6-letter — solid"; }
  else if (name.length <= 8) { lengthScore = 10; lengthDetail = "good length"; }
  else if (name.length <= 10) { lengthScore = 6; lengthDetail = "moderate length"; }
  else if (name.length <= 14) { lengthScore = 3; lengthDetail = "getting long"; }
  else { lengthScore = 1; lengthDetail = "very long — low demand"; }
  factors.push({ label: "Length", score: lengthScore, maxScore: 20, detail: `${name.length} characters — ${lengthDetail}` });
  total += lengthScore;

  // 2. TLD Value (max 25)
  const tldScore = PREMIUM_TLDS[tld] || 3;
  factors.push({ label: "TLD Value", score: tldScore, maxScore: 25, detail: `.${tld} — ${tldScore >= 16 ? "high-demand extension" : tldScore >= 10 ? "solid extension" : "lower-demand extension"}` });
  total += tldScore;

  // 3. Word Quality & Meaning (max 25 — increased from 20)
  const wordParts = splitIntoWords(name);
  const meaningfulWords = wordParts.filter(w => w.length >= 2 && (COMMON_WORDS.has(w) || DICTIONARY_WORDS.has(w) || PREMIUM_KEYWORDS.has(w)));
  const junkChars = wordParts.filter(w => w.length === 1 && !COMMON_WORDS.has(w)).length;
  const hasPenaltyWord = [...PENALTY_KEYWORDS].some(kw => name.includes(kw));
  const premiumMatches = meaningfulWords.filter(w => PREMIUM_KEYWORDS.has(w));
  const isDictWord = isSingleDictionaryWord(name);
  const allMeaningful = meaningfulWords.length >= 1 && junkChars === 0 && meaningfulWords.join("").length === name.length;

  let wordScore = 0;
  if (hasPenaltyWord) {
    wordScore = 1;
  } else if (isDictWord) {
    // Single dictionary word = extremely valuable
    wordScore = 25;
  } else if (allMeaningful && meaningfulWords.length >= 2) {
    // Two clean meaningful words combined (e.g. "cloudpay", "aitech")
    wordScore = premiumMatches.length >= 1 ? 22 : 18;
  } else if (meaningfulWords.length >= 2 && junkChars <= 1) {
    wordScore = premiumMatches.length >= 1 ? 18 : 14;
  } else if (meaningfulWords.length === 1 && junkChars === 0 && name.length <= 8) {
    wordScore = premiumMatches.length >= 1 ? 16 : 12;
  } else if (meaningfulWords.length >= 1) {
    wordScore = 6 + Math.min(4, premiumMatches.length * 2);
  } else {
    wordScore = 2;
  }

  let wordDetail = "";
  if (hasPenaltyWord) {
    wordDetail = "Contains risky/trademark term — severely limits value";
  } else if (isDictWord) {
    wordDetail = `Single dictionary word "${name}" — ultra-premium`;
  } else if (allMeaningful && meaningfulWords.length >= 2) {
    wordDetail = `Clean compound: "${meaningfulWords.join(" + ")}" — strong brandable combo`;
  } else if (meaningfulWords.length >= 1) {
    wordDetail = `Found: ${meaningfulWords.join(", ")}${junkChars > 0 ? ` (${junkChars} extra chars)` : ""}`;
  } else {
    wordDetail = "No recognizable words — harder to brand";
  }
  factors.push({ label: "Word Quality", score: wordScore, maxScore: 25, detail: wordDetail });
  total += wordScore;

  // 4. Brandability (max 15)
  const vowelCount = [...name].filter(c => "aeiouy".includes(c)).length;
  const ratio = vowelCount / name.length;
  const isPronounceable = ratio >= 0.25 && ratio <= 0.6 && !/[bcdfghjklmnpqrstvwxz]{4,}/i.test(name);
  const hasNaturalFlow = meaningfulWords.length >= 1 && junkChars <= 1;
  let brandScore = 0;
  if (hasPenaltyWord) {
    brandScore = 1;
  } else if (isDictWord && name.length <= 8) {
    brandScore = 15;
  } else if (isPronounceable && hasNaturalFlow && name.length <= 8) {
    brandScore = 15;
  } else if (isPronounceable && hasNaturalFlow) {
    brandScore = 11;
  } else if (isPronounceable) {
    brandScore = 7;
  } else {
    brandScore = 3;
  }
  const brandDetail = hasPenaltyWord ? "Risky content — unbrandable" :
    isDictWord ? "Real dictionary word — instant brand recognition" :
    (isPronounceable && hasNaturalFlow) ? "Easy to say and remember" :
    isPronounceable ? "Pronounceable but not a natural brand" :
    "Difficult to pronounce and brand";
  factors.push({ label: "Brandability", score: brandScore, maxScore: 15, detail: brandDetail });
  total += brandScore;

  // 5. Character Composition (max 10)
  const isAlpha = /^[a-z]+$/.test(name);
  const hasNumbers = /\d/.test(name);
  const isNumeric = /^\d+$/.test(name);
  const hasDashes = /[-_]/.test(parts[0]);
  let compScore = isAlpha ? 10 : isNumeric && name.length <= 4 ? 7 : hasDashes ? 2 : hasNumbers ? 4 : 5;
  const charDetail = isAlpha ? "Pure letters — most desirable" : isNumeric ? "Numeric domain" : hasDashes ? "Contains hyphens — low demand" : "Mixed characters";
  factors.push({ label: "Character Mix", score: compScore, maxScore: 10, detail: charDetail });
  total += compScore;

  // 6. Trending / Niche Value (max 15 — NEW)
  const { multiplier: trendMult, trends } = getTrendingMultiplier(meaningfulWords);
  let trendScore = 0;
  let trendDetail = "";
  if (hasPenaltyWord) {
    trendScore = 0;
    trendDetail = "Penalty content — no trend value";
  } else if (trends.length >= 2) {
    trendScore = 15;
    trendDetail = `Trending combo: ${trends.join(" + ")} — high market demand`;
  } else if (trends.length === 1) {
    trendScore = Math.round((trendMult - 1) * 15);
    trendDetail = `Trending keyword: "${trends[0]}" — in-demand niche`;
  } else if (isDictWord) {
    trendScore = 8;
    trendDetail = "Dictionary word — evergreen value";
  } else {
    trendScore = 2;
    trendDetail = "No trending keywords detected";
  }
  trendScore = Math.min(15, Math.max(0, trendScore));
  factors.push({ label: "Trending / Niche", score: trendScore, maxScore: 15, detail: trendDetail });
  total += trendScore;

  // 7. Market Risk (max 10)
  let penaltyScore = 10;
  let penaltyDetail = "No negative signals";
  if (hasPenaltyWord) {
    penaltyScore = 0;
    penaltyDetail = "Trademark/adult/pharma content — major value penalty";
  } else if (name.length > 15) {
    penaltyScore = 3;
    penaltyDetail = "Excessive length reduces marketability";
  } else if (junkChars > 2) {
    penaltyScore = 4;
    penaltyDetail = "Unrecognizable character sequences";
  }
  factors.push({ label: "Market Risk", score: penaltyScore, maxScore: 10, detail: penaltyDetail });
  total += penaltyScore;

  // 8. Trademark Risk (max 10)
  let tmScore = 10;
  let tmDetail = "No known trademark conflicts";
  if (trademark.riskLevel === "high") {
    tmScore = 0;
    tmDetail = trademark.summary;
  } else if (trademark.riskLevel === "medium") {
    tmScore = 3;
    tmDetail = trademark.summary;
  } else if (trademark.riskLevel === "low") {
    tmScore = 6;
    tmDetail = trademark.summary;
  }
  factors.push({ label: "Trademark Risk", score: tmScore, maxScore: 10, detail: tmDetail });
  total += tmScore;

  // ─── VALUE CALCULATION ───
  // Total max = 20+25+25+15+10+15+10+10 = 130
  const normalizedTotal = Math.round((total / 130) * 100);

  // Base value from score tier
  let valueMin: number, valueMax: number;
  if (hasPenaltyWord || trademark.riskLevel === "high") {
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

  // Apply trending multiplier to value bands (capped)
  if (trendMult > 1.0 && !hasPenaltyWord && trademark.riskLevel !== "high") {
    valueMin = Math.round(valueMin * trendMult);
    valueMax = Math.round(valueMax * trendMult);
  }

  // Dictionary word on .com bonus — single real words on .com are ultra-premium
  if (isDictWord && tld === "com" && !hasPenaltyWord && trademark.riskLevel !== "high") {
    const dictBonus = name.length <= 4 ? 3.0 : name.length <= 6 ? 2.0 : 1.5;
    valueMin = Math.max(valueMin, Math.round(5000 * dictBonus));
    valueMax = Math.max(valueMax, Math.round(25000 * dictBonus));
  }

  // Tighten band: max should be at most 3x min
  if (valueMax > valueMin * 3) {
    valueMax = Math.round(valueMin * 3);
  }

  const confidence: ValuationResult["confidence"] = normalizedTotal >= 75 ? "High" : normalizedTotal >= 50 ? "Medium" : "Low";
  const estimatedValue = `$${valueMin.toLocaleString()} – $${valueMax.toLocaleString()}`;

  return { estimatedValue, confidence, overallScore: normalizedTotal, factors, trademark };
}

export function DomainValuationEstimator() {
  const [domain, setDomain] = useState("");
  const [result, setResult] = useState<ValuationResult | null>(null);

  const handleEstimate = () => {
    if (!domain.trim()) return;
    setResult(estimateValue(domain.trim()));
  };

  const confidenceColor = (c: string) => {
    if (c === "High") return "text-emerald-600 dark:text-emerald-400 border-emerald-300";
    if (c === "Medium") return "text-amber-600 dark:text-amber-400 border-amber-300";
    return "text-red-600 dark:text-red-400 border-red-300";
  };

  const scoreIcon = (score: number, max: number) => {
    const pct = score / max;
    if (pct >= 0.7) return <TrendingUp className="w-4 h-4 text-emerald-500" />;
    if (pct >= 0.4) return <Minus className="w-4 h-4 text-amber-500" />;
    return <TrendingDown className="w-4 h-4 text-red-500" />;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-primary" />
          Domain Valuation Estimator
        </CardTitle>
        <CardDescription>
          Get an instant estimated value based on length, TLD, keywords, brandability, character composition, and trademark risk.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex gap-3">
          <Input
            placeholder="Enter a domain (e.g. cloudpay.com)"
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleEstimate()}
            className="flex-1"
          />
          <Button onClick={handleEstimate} disabled={!domain.trim()}>
            Estimate
          </Button>
        </div>

        {result && (
          <div className="space-y-5 animate-fade-in">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <span className="text-sm text-muted-foreground">Estimated Value</span>
                <p className="text-3xl font-bold text-foreground">{result.estimatedValue}</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-center">
                  <span className="text-sm text-muted-foreground block">Score</span>
                  <span className="text-2xl font-bold text-foreground">{result.overallScore}</span>
                  <span className="text-sm text-muted-foreground"> / 100</span>
                </div>
                <Badge variant="outline" className={`text-sm px-3 py-1 ${confidenceColor(result.confidence)}`}>
                  {result.confidence} Confidence
                </Badge>
              </div>
            </div>

            <Progress value={result.overallScore} className="h-3" />

            {/* Trademark Alert */}
            {result.trademark.riskLevel !== "none" && (
              <div className={`p-3 rounded-lg border ${result.trademark.riskLevel === "high" ? "border-red-500/20 bg-red-500/5" : result.trademark.riskLevel === "medium" ? "border-orange-500/20 bg-orange-500/5" : "border-yellow-500/20 bg-yellow-500/5"}`}>
                <div className="flex items-start gap-3">
                  <ShieldAlert className="w-5 h-5 text-red-500 mt-0.5" />
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-semibold text-foreground">Trademark Warning</span>
                      <Badge variant="outline" className={`text-xs ${getTrademarkRiskDisplay(result.trademark.riskLevel).color}`}>
                        {getTrademarkRiskDisplay(result.trademark.riskLevel).label}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{result.trademark.summary}</p>
                    {result.trademark.matches.length > 0 && (
                      <div className="flex gap-1.5 mt-2 flex-wrap">
                        {result.trademark.matches.map((m, i) => (
                          <Badge key={i} variant="outline" className="text-xs">
                            {m.brand} ({m.matchType})
                          </Badge>
                        ))}
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground/70 mt-2">
                      ⚠️ Domains infringing trademarks risk UDRP disputes and forced transfers. Value capped accordingly.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-foreground">Factor Breakdown</h4>
              {result.factors.map((f, i) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-secondary/50">
                  {scoreIcon(f.score, f.maxScore)}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-foreground">{f.label}</span>
                      <span className="text-xs text-muted-foreground">{f.score}/{f.maxScore}</span>
                    </div>
                    <Progress value={(f.score / f.maxScore) * 100} className="h-1.5 mb-1" />
                    <p className="text-sm text-muted-foreground">{f.detail}</p>
                  </div>
                </div>
              ))}
            </div>

            <p className="text-xs text-muted-foreground italic">
              * Algorithmic estimate for guidance only. Trademark check covers ~200 major brands — not legal advice. 
              Actual market value depends on demand, comparable sales, traffic, and other factors. Always consult a trademark attorney before major acquisitions.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
