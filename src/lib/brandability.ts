/**
 * Brandability Score Engine
 * Combines multiple signals into a single 0-100 composite score.
 * Aligned with the Valuation Estimator's 6-tier quality system for two-word domains.
 */

import { scorePronounceability, countWords, COMMON_WORDS } from "@/lib/pronounceability";
import { checkTrademarkRisk, type TrademarkRiskLevel } from "@/lib/trademarkCheck";
import { DICTIONARY_WORDS, PREMIUM_KEYWORDS } from "@/lib/domainValuation";

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

  for (const word of OFFENSIVE_WORDS) {
    if (lower.includes(word)) {
      if (word.length >= 5) maxSeverity = Math.max(maxSeverity, 3);
      else if (word.length >= 4) maxSeverity = Math.max(maxSeverity, 2);
      else maxSeverity = Math.max(maxSeverity, 1);
    }
  }

  let offensiveWordCount = 0;
  for (const word of OFFENSIVE_WORDS) {
    if (lower.includes(word)) offensiveWordCount++;
  }
  if (offensiveWordCount >= 2) maxSeverity = 3;

  return maxSeverity;
}

/** Combined word lookup: checks COMMON_WORDS, DICTIONARY_WORDS, and PREMIUM_KEYWORDS */
function isKnownWord(word: string): boolean {
  return COMMON_WORDS.has(word) || DICTIONARY_WORDS.has(word) || PREMIUM_KEYWORDS.has(word);
}

/**
 * Calculate what fraction of the name is covered by recognized words.
 * Uses ALL dictionaries: COMMON_WORDS + DICTIONARY_WORDS + PREMIUM_KEYWORDS.
 * Returns 0-1 where 1 means 100% of chars are part of known words.
 */
function dictionaryCoverage(name: string): number {
  const lower = name.toLowerCase().replace(/[^a-z]/g, "");
  if (lower.length <= 1) return 0;
  if (lower.length <= 3) {
    if (isKnownWord(lower)) return 1.0;
    const PREMIUM_SHORT_SET = new Set(["ai", "io", "go", "no", "do", "up", "we", "be", "he", "me", "my", "ok", "ox", "ax"]);
    return PREMIUM_SHORT_SET.has(lower) ? 1.0 : 0;
  }
  let coveredChars = 0;
  let i = 0;
  while (i < lower.length) {
    let best = 0;
    for (let len = Math.min(lower.length - i, 15); len >= 2; len--) {
      const slice = lower.slice(i, i + len);
      if (isKnownWord(slice)) {
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

/**
 * Greedy word split using all dictionaries. Returns array of found words.
 */
function splitIntoWords(name: string): string[] {
  const lower = name.toLowerCase().replace(/[^a-z]/g, "");
  const words: string[] = [];
  let i = 0;
  while (i < lower.length) {
    let best = 0;
    let bestWord = "";
    for (let len = Math.min(lower.length - i, 15); len >= 2; len--) {
      const slice = lower.slice(i, i + len);
      if (isKnownWord(slice)) {
        best = len;
        bestWord = slice;
        break;
      }
    }
    if (best >= 2) {
      words.push(bestWord);
      i += best;
    } else {
      i++;
    }
  }
  return words;
}

// ─── TYPES ───

export interface BrandabilityDimension {
  name: string;
  score: number;
  weight: number;
  detail: string;
  icon: "mic" | "ruler" | "book" | "shield" | "brain" | "eye";
}

export interface BrandabilityResult {
  overall: number;
  grade: "A+" | "A" | "B" | "C" | "D" | "F";
  dimensions: BrandabilityDimension[];
  trademarkRisk: TrademarkRiskLevel;
  summary: string;
  domainName: string;
}

// ─── HELPERS ───

const VOWELS = new Set("aeiouy");
const PREMIUM_SHORT = new Set(["ai", "io", "go", "no", "do", "up", "we", "be", "ok", "ox", "ax"]);

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

function visualAppealScore(name: string): number {
  let score = 80;
  if (/(.)\1{2,}/i.test(name)) score -= 25;
  if (/\d/.test(name) && /[a-z]/i.test(name)) score -= 20;
  if (name.includes("-")) score -= 30;
  if (/^[a-z]+$/i.test(name)) score += 10;
  if (name.length >= 4 && name.length <= 10) score += 10;
  return Math.max(0, Math.min(100, score));
}

function memorabilityScore(name: string, wordCount: number): number {
  let score = 60;
  if (name.length <= 3) score += 35;
  else if (name.length <= 5) score += 25;
  else if (name.length <= 8) score += 15;
  else if (name.length <= 12) score += 5;
  else score -= 15;

  if (wordCount === 1) score += 15;
  else if (wordCount === 2) score += 5;
  else score -= 10;

  if (/(?:ify|ly|io|er|oo|ix|ox|us|ia|eo|ay)$/i.test(name)) score += 10;

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
  const rawName = parts[0];
  const cleanName = rawName.replace(/[-_]/g, "").replace(/[^a-z]/gi, "");
  const coverage = dictionaryCoverage(cleanName);
  const hasHyphen = rawName.includes("-");
  const offensive = offensiveSeverity(cleanName);

  if (!cleanName) {
    return {
      overall: 0, grade: "F", dimensions: [], trademarkRisk: "none",
      summary: "No valid characters found", domainName: domainInput,
    };
  }

  const isPremiumShort = cleanName.length <= 3 && (isKnownWord(cleanName) || PREMIUM_SHORT.has(cleanName));
  const isSingleRealWord = coverage >= 0.95 && cleanName.length >= 3 && cleanName.length <= 10;

  // Split into component words for tier analysis
  const foundWords = splitIntoWords(cleanName);
  const bothDictionary = foundWords.length === 2 && foundWords.every(w => DICTIONARY_WORDS.has(w) || COMMON_WORDS.has(w));
  const hasPremiumKeyword = foundWords.some(w => PREMIUM_KEYWORDS.has(w));
  const bothShort = foundWords.length === 2 && foundWords.every(w => w.length <= 6);

  // 1. Pronounceability (weight: 0.25)
  const pronounce = scorePronounceability(domainInput);
  let pronounceScore = pronounce.score;
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

  // 3. Word Structure — 6-tier system aligned with Valuation Estimator
  const wordCount = countWords(cleanName);
  let wordScore: number;
  let wordDetail: string;
  const isPronounceable = pronounceScore >= 60;

  if (isPremiumShort) {
    // Ultra-short premium (ai, go, etc.)
    wordScore = 98;
    wordDetail = "Ultra-short premium — universally recognizable";
  } else if (isSingleRealWord && !hasHyphen) {
    // Single dictionary word (cube, delete, etc.)
    wordScore = 95;
    wordDetail = "Real dictionary word — strongest brand foundation";
  } else if (bothDictionary && hasPremiumKeyword && !hasHyphen) {
    // Tier 1: Dictionary + Premium + Trending (e.g. CloudBank.com, DataFlow.com)
    wordScore = 95;
    wordDetail = "Dictionary + premium keyword compound — top-tier brandable";
  } else if (bothDictionary && !hasHyphen && bothShort) {
    // Tier 3: Two short dictionary words (e.g. MoonLight.com)
    wordScore = 90;
    wordDetail = "Two short dictionary words — highly brandable compound";
  } else if (bothDictionary && !hasHyphen) {
    // Tier 4: Two dictionary words, longer (e.g. SilverStream.com)
    wordScore = 85;
    wordDetail = "Two dictionary words — strong compound brand";
  } else if (hasPremiumKeyword && coverage >= 0.6 && !hasHyphen) {
    // Tier 5: One premium keyword (e.g. TechZone.com)
    wordScore = 78;
    wordDetail = "Contains premium keyword — solid brand signal";
  } else if (coverage >= 0.9 && foundWords.length === 2 && !hasHyphen) {
    // Tier 6: Generic two words (e.g. BlueStar.com)
    wordScore = 72;
    wordDetail = "Two recognizable words — decent brand compound";
  } else if (coverage >= 0.9 && !hasHyphen) {
    wordScore = 70;
    wordDetail = "Mostly recognizable words";
  } else if (coverage >= 0.6) {
    wordScore = 62;
    wordDetail = "Partially recognizable words";
  } else if (isPronounceable && cleanName.length <= 8) {
    wordScore = 55;
    wordDetail = "Coined but pronounceable — inventive brand name";
  } else if (isPronounceable) {
    wordScore = 40;
    wordDetail = "Pronounceable coined word, but a bit long";
  } else if (coverage >= 0.3) {
    wordScore = 20;
    wordDetail = `Only ${Math.round(coverage * 100)}% recognizable — mostly random`;
  } else {
    wordScore = 5;
    wordDetail = "Random characters — not a word or brand name";
  }

  // Hyphen penalty for word structure
  if (hasHyphen) {
    wordScore = Math.max(0, wordScore - 35);
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
  if (isPremiumShort) memScore = Math.max(memScore, 95);
  else if (isSingleRealWord && !hasHyphen) memScore = Math.max(memScore, 85);
  else if (bothDictionary && !hasHyphen) memScore = Math.max(memScore, 75);
  if (coverage < 0.3 && !isPremiumShort) memScore = Math.max(0, memScore - 45);
  else if (coverage < 0.6 && !isPremiumShort) memScore = Math.max(0, memScore - 20);
  if (hasHyphen) memScore = Math.max(0, memScore - 25);

  let memDetail: string;
  if (memScore >= 80) memDetail = "Highly memorable — sticks in your head";
  else if (memScore >= 60) memDetail = "Reasonably memorable";
  else if (memScore >= 40) memDetail = "Somewhat forgettable";
  else memDetail = "Hard to remember";

  // 6. Visual & rhythm appeal (weight: 0.15)
  let visualScore = Math.round((visualAppealScore(rawName) + rhythmScore(cleanName)) / 2);
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
  let offensiveMultiplier = 1.0;
  let offensiveSummaryNote = "";
  if (offensive >= 3) {
    offensiveMultiplier = 0.15;
    offensiveSummaryNote = " Contains highly offensive language.";
  } else if (offensive >= 2) {
    offensiveMultiplier = 0.35;
    offensiveSummaryNote = " Contains inappropriate language.";
  } else if (offensive >= 1) {
    offensiveMultiplier = 0.55;
    offensiveSummaryNote = " Contains mildly inappropriate language.";
  }

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
