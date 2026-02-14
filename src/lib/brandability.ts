/**
 * Brandability Score Engine
 * Combines multiple signals into a single 0-100 composite score.
 */

import { scorePronounceability, countWords, COMMON_WORDS } from "@/lib/pronounceability";
import { checkTrademarkRisk, type TrademarkRiskLevel } from "@/lib/trademarkCheck";

// ─── PROFANITY / OFFENSIVE WORD LIST ───
const OFFENSIVE_WORDS = new Set([
  "poo", "poop", "stain", "crap", "damn", "hell", "ass", "butt",
  "fart", "pee", "wee", "snot", "barf", "vomit", "puke",
  "shit", "fuck", "dick", "cock", "porn", "sex", "xxx",
  "bitch", "slut", "whore", "twat", "cunt", "boob", "tit",
  "nude", "naked", "kill", "murder", "hate", "racist",
  "spam", "scam", "fraud", "fake", "suck", "dumb", "stupid",
  "ugly", "loser", "creep", "stink", "smelly", "gross", "nasty",
  "sleazy", "trashy", "filthy", "dirty", "grope", "molest",
  "jerk", "idiot", "moron", "anus", "penis", "vagina",
]);

/**
 * Check if a name contains offensive/profane words.
 * Returns a severity: 0 = clean, 1 = mild, 2 = moderate, 3 = severe
 */
function offensiveSeverity(name: string): number {
  const lower = name.toLowerCase().replace(/[^a-z]/g, "");
  let maxSeverity = 0;

  // Check for direct matches and substrings
  for (const word of OFFENSIVE_WORDS) {
    if (lower.includes(word)) {
      // Longer offensive words are more severe
      if (word.length >= 5) maxSeverity = Math.max(maxSeverity, 3);
      else if (word.length >= 4) maxSeverity = Math.max(maxSeverity, 2);
      else maxSeverity = Math.max(maxSeverity, 1);
    }
  }

  // Check compound offensive patterns (e.g. "poostain" = poo + stain)
  let offensiveWordCount = 0;
  for (const word of OFFENSIVE_WORDS) {
    if (lower.includes(word)) offensiveWordCount++;
  }
  if (offensiveWordCount >= 2) maxSeverity = 3; // multiple offensive words = always severe

  return maxSeverity;
}

/**
 * Calculate what fraction of the name is covered by recognized dictionary words.
 * Returns 0-1 where 1 means 100% of chars are part of known words.
 */
function dictionaryCoverage(name: string): number {
  const lower = name.toLowerCase().replace(/[^a-z]/g, "");
  if (lower.length <= 1) return 0;
  // Ultra-short names (2-3 chars) — check both COMMON_WORDS and premium keywords
  if (lower.length <= 3) {
    if (COMMON_WORDS.has(lower)) return 1.0;
    // Known premium abbreviations that are real words/acronyms
    const PREMIUM_SHORT = new Set(["ai", "io", "go", "no", "do", "up", "we", "be", "he", "me", "my", "ok", "ox", "ax"]);
    return PREMIUM_SHORT.has(lower) ? 1.0 : 0;
  }
  let coveredChars = 0;
  let i = 0;
  while (i < lower.length) {
    let best = 0;
    for (let len = Math.min(lower.length - i, 12); len >= 2; len--) {
      if (COMMON_WORDS.has(lower.slice(i, i + len))) {
        best = len;
        break;
      }
    }
    if (best >= 2) {
      coveredChars += best;
      i += best;
    } else {
      i++;
    }
  }
  return coveredChars / lower.length;
}

// ─── TYPES ───

export interface BrandabilityDimension {
  name: string;
  score: number; // 0-100
  weight: number; // fraction of total (sums to 1)
  detail: string;
  icon: "mic" | "ruler" | "book" | "shield" | "brain" | "eye";
}

export interface BrandabilityResult {
  overall: number; // 0-100
  grade: "A+" | "A" | "B" | "C" | "D" | "F";
  dimensions: BrandabilityDimension[];
  trademarkRisk: TrademarkRiskLevel;
  summary: string;
  domainName: string;
}

// ─── HELPERS ───

const VOWELS = new Set("aeiouy");

/** Known premium ultra-short names that transcend normal scoring */
const PREMIUM_SHORT = new Set(["ai", "io", "go", "no", "do", "up", "we", "be", "ok", "ox", "ax"]);

/** Check if a name has alternating vowel-consonant patterns (easy to say) */
function rhythmScore(name: string): number {
  let transitions = 0;
  for (let i = 1; i < name.length; i++) {
    const prevVowel = VOWELS.has(name[i - 1]);
    const currVowel = VOWELS.has(name[i]);
    if (prevVowel !== currVowel) transitions++;
  }
  const ratio = name.length > 1 ? transitions / (name.length - 1) : 0;
  if (ratio >= 0.5 && ratio <= 0.85) return 100;
  if (ratio >= 0.35 && ratio <= 0.95) return 70;
  return 40;
}

/** Check visual balance — no awkward repeated chars, no mixed-case weirdness, etc. */
function visualAppealScore(name: string): number {
  let score = 80;

  // Penalize triple+ repeated characters
  if (/(.)\1{2,}/i.test(name)) score -= 25;

  // Penalize numbers mixed with letters
  if (/\d/.test(name) && /[a-z]/i.test(name)) score -= 20;

  // Penalize hyphens heavily
  if (name.includes("-")) score -= 30;

  // Bonus for all-alpha
  if (/^[a-z]+$/i.test(name)) score += 10;

  // Bonus for visually balanced length (not too lopsided)
  if (name.length >= 4 && name.length <= 10) score += 10;

  return Math.max(0, Math.min(100, score));
}

/** Memorability — short, unique-sounding, easy to recall */
function memorabilityScore(name: string, wordCount: number): number {
  let score = 60;

  // Length bonus/penalty
  if (name.length <= 3) score += 35;
  else if (name.length <= 5) score += 25;
  else if (name.length <= 8) score += 15;
  else if (name.length <= 12) score += 5;
  else score -= 15;

  // Single word = more memorable
  if (wordCount === 1) score += 15;
  else if (wordCount === 2) score += 5;
  else score -= 10;

  // Unique ending sounds that stick (like -ify, -ly, -io, -er)
  if (/(?:ify|ly|io|er|oo|ix|ox|us|ia|eo|ay)$/i.test(name)) score += 10;

  // Alliteration bonus
  if (name.length >= 4) {
    const firstChar = name[0];
    const parts = name.match(/[A-Z]?[a-z]+/g) || [name];
    if (parts.length >= 2 && parts.filter(p => p[0].toLowerCase() === firstChar.toLowerCase()).length >= 2) {
      score += 10;
    }
  }

  return Math.max(0, Math.min(100, score));
}

// ─── MAIN SCORING ───

export function scoreBrandability(domainInput: string): BrandabilityResult {
  const parts = domainInput.toLowerCase().replace(/^www\./, "").split(".");
  const rawName = parts[0]; // keep hyphens for visual scoring
  const cleanName = rawName.replace(/[-_]/g, "").replace(/[^a-z]/gi, "");
  const coverage = dictionaryCoverage(cleanName);
  const hasHyphen = rawName.includes("-");
  const offensive = offensiveSeverity(cleanName);

  if (!cleanName) {
    return {
      overall: 0,
      grade: "F",
      dimensions: [],
      trademarkRisk: "none",
      summary: "No valid characters found",
      domainName: domainInput,
    };
  }

  // ─── Is this a premium ultra-short domain? ───
  const isPremiumShort = cleanName.length <= 3 && (COMMON_WORDS.has(cleanName) || PREMIUM_SHORT.has(cleanName));
  // ─── Is this a single real dictionary word? ───
  const isSingleRealWord = coverage >= 0.95 && cleanName.length >= 3 && cleanName.length <= 10;

  // 1. Pronounceability (weight: 0.25)
  const pronounce = scorePronounceability(domainInput);
  let pronounceScore = pronounce.score;
  // Ultra-short premium domains shouldn't be penalized for pronounceability quirks
  if (isPremiumShort) pronounceScore = Math.max(pronounceScore, 85);

  // 2. Length optimization (weight: 0.15)
  let lengthScore: number;
  let lengthDetail: string;
  if (cleanName.length <= 2) { lengthScore = 100; lengthDetail = `${cleanName.length} chars — ultra-premium short`; }
  else if (cleanName.length <= 3) { lengthScore = 98; lengthDetail = `${cleanName.length} chars — ultra-short premium`; }
  else if (cleanName.length <= 5) { lengthScore = 90; lengthDetail = `${cleanName.length} chars — short & punchy`; }
  else if (cleanName.length <= 8) { lengthScore = 75; lengthDetail = `${cleanName.length} chars — ideal brandable length`; }
  else if (cleanName.length <= 12) { lengthScore = 50; lengthDetail = `${cleanName.length} chars — workable but long`; }
  else { lengthScore = 25; lengthDetail = `${cleanName.length} chars — too long for strong brand`; }

  // 3. Dictionary/meaningful words (weight: 0.15)
  const wordCount = countWords(cleanName);
  let wordScore: number;
  let wordDetail: string;
  const isPronounceable = pronounceScore >= 60;

  if (isPremiumShort) {
    wordScore = 95;
    wordDetail = "Ultra-short premium — universally recognizable";
  } else if (isSingleRealWord && !hasHyphen) {
    wordScore = 95;
    wordDetail = "Real dictionary word — strongest brand foundation";
  } else if (coverage >= 0.9 && wordCount === 2 && !hasHyphen) {
    wordScore = 88;
    wordDetail = "Two real-word compound — clear and powerful";
  } else if (coverage >= 0.9 && wordCount <= 2) {
    wordScore = 82;
    wordDetail = "Real-word based — solid foundation";
  } else if (coverage >= 0.6) {
    wordScore = 70;
    wordDetail = "Mostly recognizable words";
  } else if (isPronounceable && cleanName.length <= 8) {
    wordScore = 60;
    wordDetail = "Coined but pronounceable — inventive brand name";
  } else if (isPronounceable) {
    wordScore = 45;
    wordDetail = "Pronounceable coined word, but a bit long";
  } else if (coverage >= 0.3) {
    wordScore = 25;
    wordDetail = `Only ${Math.round(coverage * 100)}% recognizable — mostly random`;
  } else {
    wordScore = 5;
    wordDetail = "Random characters — not a word or brand name";
  }
  // Hyphen penalty for word structure
  if (hasHyphen) {
    wordScore = Math.max(0, wordScore - 30);
    wordDetail += " (hyphenated — weaker brand signal)";
  }

  // 4. Trademark safety (weight: 0.15)
  const tmResult = checkTrademarkRisk(domainInput);
  let tmScore: number;
  let tmDetail: string;
  switch (tmResult.riskLevel) {
    case "none": tmScore = 100; tmDetail = "No trademark conflicts detected"; break;
    case "low": tmScore = 70; tmDetail = `Slight resemblance to known brand`; break;
    case "medium": tmScore = 35; tmDetail = `Contains trademarked term — legal risk`; break;
    case "high": tmScore = 5; tmDetail = `Direct trademark conflict — high legal risk`; break;
  }

  // 5. Memorability (weight: 0.15)
  let memScore = memorabilityScore(cleanName, wordCount);
  // Premium short domains are inherently memorable
  if (isPremiumShort) memScore = Math.max(memScore, 95);
  // Single real words are very memorable
  else if (isSingleRealWord && !hasHyphen) memScore = Math.max(memScore, 85);
  // Gibberish penalty
  if (coverage < 0.3 && !isPremiumShort) memScore = Math.max(0, memScore - 45);
  else if (coverage < 0.6 && !isPremiumShort) memScore = Math.max(0, memScore - 20);
  // Hyphen penalty for memorability
  if (hasHyphen) memScore = Math.max(0, memScore - 25);

  let memDetail: string;
  if (memScore >= 80) memDetail = "Highly memorable — sticks in your head";
  else if (memScore >= 60) memDetail = "Reasonably memorable";
  else if (memScore >= 40) memDetail = "Somewhat forgettable";
  else memDetail = "Hard to remember";

  // 6. Visual & rhythm appeal (weight: 0.15)
  let visualScore = Math.round((visualAppealScore(rawName) + rhythmScore(cleanName)) / 2);
  // Premium short domains look clean
  if (isPremiumShort) visualScore = Math.max(visualScore, 85);
  let visualDetail: string;
  if (visualScore >= 80) visualDetail = "Clean look & natural rhythm";
  else if (visualScore >= 60) visualDetail = "Decent visual balance";
  else if (visualScore >= 40) visualDetail = "Some visual awkwardness";
  else visualDetail = "Visually cluttered or unbalanced";

  const dimensions: BrandabilityDimension[] = [
    { name: "Pronounceability", score: pronounceScore, weight: 0.25, detail: `${pronounce.grade} — ${pronounce.factors[0]?.detail || ""}`, icon: "mic" },
    { name: "Length", score: lengthScore, weight: 0.15, detail: lengthDetail, icon: "ruler" },
    { name: "Word Structure", score: wordScore, weight: 0.15, detail: wordDetail, icon: "book" },
    { name: "Trademark Safety", score: tmScore, weight: 0.15, detail: tmDetail, icon: "shield" },
    { name: "Memorability", score: memScore, weight: 0.15, detail: memDetail, icon: "brain" },
    { name: "Visual Appeal", score: visualScore, weight: 0.15, detail: visualDetail, icon: "eye" },
  ];

  // ─── OFFENSIVE CONTENT PENALTY ───
  // Applied as a global multiplier AFTER dimension scoring
  let offensiveMultiplier = 1.0;
  let offensiveSummaryNote = "";
  if (offensive >= 3) {
    offensiveMultiplier = 0.15; // severe: crushes score to near zero
    offensiveSummaryNote = " Contains highly offensive language.";
  } else if (offensive >= 2) {
    offensiveMultiplier = 0.35;
    offensiveSummaryNote = " Contains inappropriate language.";
  } else if (offensive >= 1) {
    offensiveMultiplier = 0.55;
    offensiveSummaryNote = " Contains mildly inappropriate language.";
  }

  // Weighted average then apply offensive multiplier
  const rawOverall = dimensions.reduce((sum, d) => sum + d.score * d.weight, 0);
  const overall = Math.round(rawOverall * offensiveMultiplier);

  const grade: BrandabilityResult["grade"] =
    overall >= 90 ? "A+" :
    overall >= 80 ? "A" :
    overall >= 65 ? "B" :
    overall >= 50 ? "C" :
    overall >= 35 ? "D" : "F";

  let summary: string;
  if (overall >= 85) summary = "Exceptional brand potential — short, memorable, and clean";
  else if (overall >= 70) summary = "Strong brandable domain with minor areas to improve";
  else if (overall >= 55) summary = "Decent brand potential but has notable weaknesses";
  else if (overall >= 40) summary = "Below average for branding — consider alternatives";
  else summary = "Poor brand potential — significant issues across multiple dimensions";
  summary += offensiveSummaryNote;

  return { overall, grade, dimensions, trademarkRisk: tmResult.riskLevel, summary, domainName: domainInput };
}
