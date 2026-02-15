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

  // DP-based coverage (non-overlapping)
  const n = lower.length;
  const dp = new Array(n + 1).fill(0);
  for (let i = 1; i <= n; i++) {
    dp[i] = dp[i - 1];
    for (let len = 2; len <= Math.min(i, 15); len++) {
      const start = i - len;
      const candidate = lower.substring(start, i);
      if (isKnownWord(candidate)) {
        dp[i] = Math.max(dp[i], dp[start] + len);
      }
    }
  }
  let coveredChars = dp[n];

  // Portmanteau boost: check overlapping splits for better coverage
  if (coveredChars < n) {
    for (let i = 2; i < n - 1; i++) {
      for (let overlap = 1; overlap <= Math.min(4, i, n - i); overlap++) {
        const left = lower.substring(0, i + overlap);
        const right = lower.substring(i);
        if (isKnownWord(left) && isKnownWord(right)) {
          coveredChars = Math.max(coveredChars, n); // full coverage via portmanteau
        }
      }
    }
  }

  return coveredChars / n;
}

/**
 * DP-based word split that maximizes dictionary coverage.
 * Handles portmanteau/overlapping words (e.g. "chainalysis" → ["chain", "analysis"]).
 */
function splitIntoWords(name: string): string[] {
  const s = name.toLowerCase().replace(/[^a-z]/g, "");
  const n = s.length;
  if (n === 0) return [];

  // dp[i] = max chars covered by dictionary words in s[0..i-1]
  const dp = new Array(n + 1).fill(0);
  const parent: (null | { start: number; wordLen: number })[] = new Array(n + 1).fill(null);

  for (let i = 1; i <= n; i++) {
    dp[i] = dp[i - 1]; // skip char
    parent[i] = null;

    for (let len = 2; len <= Math.min(i, 15); len++) {
      const start = i - len;
      const candidate = s.substring(start, i);
      if (isKnownWord(candidate)) {
        const coverage = dp[start] + len;
        if (coverage > dp[i]) {
          dp[i] = coverage;
          parent[i] = { start, wordLen: len };
        }
      }
    }
  }

  const words: string[] = [];
  let pos = n;
  while (pos > 0) {
    const p = parent[pos];
    if (p) {
      words.push(s.substring(p.start, p.start + p.wordLen));
      pos = p.start;
    } else {
      pos--;
    }
  }
  words.reverse();

  // Portmanteau detection: if coverage is incomplete, try overlapping splits
  const coveredByWords = words.filter(w => w.length >= 2 && isKnownWord(w));
  const totalCoveredChars = coveredByWords.reduce((sum, w) => sum + w.length, 0);
  if (totalCoveredChars < n) {
    let bestOverlapWords: string[] | null = null;
    let bestOverlapCoverage = totalCoveredChars;

    for (let i = 2; i < n - 1; i++) {
      for (let overlap = 0; overlap <= Math.min(4, i, n - i); overlap++) {
        const left = s.substring(0, i + overlap);
        const right = s.substring(i);
        if (isKnownWord(left) && isKnownWord(right)) {
          const coverage = left.length + right.length;
          if (coverage > bestOverlapCoverage) {
            bestOverlapCoverage = coverage;
            bestOverlapWords = [left, right];
          }
        }
      }
    }

    if (bestOverlapWords) {
      return bestOverlapWords;
    }
  }

  return words;
}

// ─── SEMANTIC COHERENCE SYSTEM ───

/**
 * Filler / function words that don't belong in brandable domain names.
 * These are grammatical connectors, pronouns, articles, etc. that signal
 * a phrase rather than a brand compound.
 */
const FILLER_WORDS = new Set([
  // Articles & determiners
  "a", "an", "the", "this", "that", "these", "those",
  // Pronouns
  "i", "me", "my", "we", "our", "you", "your", "he", "she", "her", "his",
  "they", "them", "their", "it", "its",
  // Prepositions
  "on", "in", "at", "to", "for", "of", "by", "with", "from", "up", "off",
  "out", "into", "over", "under", "about", "between", "through",
  // Conjunctions
  "and", "or", "but", "nor", "so", "yet",
  // Common verbs used as filler
  "is", "am", "are", "was", "were", "be", "been", "being",
  "have", "has", "had", "do", "does", "did",
  "can", "could", "will", "would", "shall", "should", "may", "might",
  "get", "got", "let", "just", "please",
  // Other fillers
  "not", "no", "yes", "very", "too", "also", "really", "here", "there",
]);

/**
 * Semantic categories for domain words. Words within the same category
 * or in complementary categories form coherent brand compounds.
 */
const SEMANTIC_CATEGORIES: Record<string, Set<string>> = {
  tech: new Set(["tech", "data", "code", "byte", "bit", "net", "web", "app", "dev", "hack", "cyber", "cloud", "stack", "pixel", "logic", "algo", "core", "node", "sync", "link", "wire", "grid", "chip", "nano", "meta", "digi", "info", "soft"]),
  business: new Set(["bank", "pay", "fund", "trade", "market", "sales", "deal", "pro", "corp", "hub", "base", "desk", "work", "office", "lead", "chief", "exec", "boss", "team", "crew", "group"]),
  creative: new Set(["art", "design", "craft", "studio", "brand", "create", "make", "build", "forge", "form", "shape", "dream", "vision", "spark", "glow", "shine", "bright", "vivid", "bold"]),
  nature: new Set(["sky", "sun", "moon", "star", "earth", "sea", "wave", "wind", "storm", "rain", "fire", "ice", "snow", "leaf", "tree", "root", "bloom", "spring", "river", "lake", "stone", "rock", "peak", "hill", "mountain", "forest", "ocean", "field"]),
  motion: new Set(["flow", "rush", "dash", "leap", "fly", "jet", "swift", "flash", "zoom", "ride", "run", "go", "move", "shift", "rise", "lift", "launch", "boost", "surge", "pulse", "drift", "glide", "soar"]),
  quality: new Set(["prime", "elite", "top", "best", "gold", "silver", "platinum", "royal", "noble", "grand", "ultra", "super", "mega", "apex", "alpha", "omega", "ace", "zen", "pure", "true", "clear", "bright", "fresh", "smart", "wise"]),
  color: new Set(["red", "blue", "green", "black", "white", "grey", "gray", "orange", "purple", "amber", "coral", "ivory", "crimson", "azure", "jade", "ruby", "emerald", "indigo", "violet", "teal"]),
  abstract: new Set(["flex", "vibe", "aura", "edge", "zone", "scope", "verse", "scape", "sphere", "orbit", "quest", "path", "way", "trail", "route", "gate", "door", "key", "lock", "bridge", "port", "loop", "arc", "axis"]),
  food: new Set(["pea", "peas", "toast", "bread", "cake", "pie", "bean", "corn", "rice", "meat", "fish", "egg", "milk", "cream", "sugar", "salt", "spice", "jam", "nut", "fruit", "apple", "berry", "lemon", "lime", "mint", "honey", "coffee", "tea"]),
  body: new Set(["head", "hand", "eye", "face", "arm", "leg", "foot", "back", "heart", "brain", "bone", "skin", "hair", "lip", "tooth"]),
};

/**
 * Category compatibility map: which semantic categories pair well together.
 * If two words come from incompatible categories, the name is incoherent.
 */
const COMPATIBLE_CATEGORIES: Record<string, Set<string>> = {
  tech: new Set(["tech", "business", "creative", "motion", "quality", "color", "abstract"]),
  business: new Set(["business", "tech", "quality", "motion", "abstract", "creative"]),
  creative: new Set(["creative", "tech", "nature", "quality", "color", "abstract", "motion"]),
  nature: new Set(["nature", "creative", "quality", "color", "motion", "abstract"]),
  motion: new Set(["motion", "tech", "business", "nature", "quality", "abstract", "creative"]),
  quality: new Set(["quality", "tech", "business", "creative", "nature", "motion", "color", "abstract"]),
  color: new Set(["color", "tech", "creative", "nature", "quality", "abstract", "motion"]),
  abstract: new Set(["abstract", "tech", "business", "creative", "nature", "motion", "quality", "color"]),
  food: new Set(["food", "quality"]),
  body: new Set(["body", "quality", "motion"]),
};

/**
 * Words with negative, weak, or undesirable brand connotations.
 * These reduce brandability scores even when they're valid dictionary words.
 */
const NEGATIVE_BRAND_WORDS = new Set([
  "lost", "lose", "dead", "death", "die", "dying", "kill", "grave", "tomb",
  "ghost", "doom", "curse", "decay", "rot", "ruin", "fail", "broke", "broken",
  "crash", "error", "bug", "fault", "flaw", "void", "null", "empty", "blank",
  "pain", "hurt", "sick", "ill", "disease", "toxic", "poison", "burn", "bleed",
  "wound", "scar", "cry", "tear", "grief", "sad", "misery", "agony",
  "cheap", "poor", "weak", "slow", "dull", "dark", "grim", "bleak", "cold",
  "harsh", "bitter", "sour", "stale", "flat", "limp", "lazy", "boring",
  "bland", "plain", "basic", "generic", "average", "mediocre",
  "fear", "scare", "dread", "panic", "risk", "threat", "danger", "hazard",
  "trap", "cage", "bind", "stuck",
  "war", "fight", "clash", "conflict", "enemy", "rival", "battle",
  "struggle", "chaos", "mess", "wreck",
]);

function getWordCategory(word: string): string | null {
  for (const [cat, words] of Object.entries(SEMANTIC_CATEGORIES)) {
    if (words.has(word)) return cat;
  }
  return null;
}

/**
 * Scan raw name for embedded filler/function words that indicate a phrase, not a brand.
 * This works independently of the greedy splitter to catch cases the splitter misses.
 */
function countEmbeddedFillers(cleanName: string): { count: number; found: string[] } {
  const lower = cleanName.toLowerCase();
  const found: string[] = [];
  
  // Check for filler words embedded in the name
  const sortedFillers = [...FILLER_WORDS].sort((a, b) => b.length - a.length);
  
  for (const filler of sortedFillers) {
    if (filler.length < 2) continue;
    const idx = lower.indexOf(filler);
    if (idx === -1) continue;
    
    const before = lower.slice(0, idx);
    const after = lower.slice(idx + filler.length);
    
    // Filler sandwiched between two word-like segments
    if (before.length >= 2 && after.length >= 2) {
      const beforeCoverage = dictionaryCoverage(before);
      const afterCoverage = dictionaryCoverage(after);
      if (beforeCoverage >= 0.5 && afterCoverage >= 0.5) {
        found.push(filler);
      }
    }
    // Filler at the start with a word after it
    else if (before.length === 0 && after.length >= 2 && filler.length >= 3) {
      const afterCoverage = dictionaryCoverage(after);
      if (afterCoverage >= 0.5) {
        found.push(filler);
      }
    }
    // Filler at the end with a word before it
    else if (after.length === 0 && before.length >= 2 && filler.length >= 3) {
      const beforeCoverage = dictionaryCoverage(before);
      if (beforeCoverage >= 0.5) {
        found.push(filler);
      }
    }
  }
  
  return { count: found.length, found };
}

/**
 * Evaluate semantic coherence of a multi-word domain name.
 * Uses both greedy split AND embedded filler scanning.
 * Returns a multiplier (0.3 - 1.0) where 1.0 = fully coherent, 0.3 = nonsense combination.
 */
function semanticCoherence(foundWords: string[], cleanName: string): { multiplier: number; detail: string } {
  // Check for embedded fillers in the raw name (catches what greedy split misses)
  const embedded = countEmbeddedFillers(cleanName);
  
  if (embedded.count >= 2) {
    return {
      multiplier: 0.3,
      detail: `Reads like a sentence, not a brand — contains "${embedded.found.join('", "')}"`,
    };
  }
  if (embedded.count === 1) {
    return {
      multiplier: 0.45,
      detail: `Contains filler word "${embedded.found[0]}" — reads like a phrase, not a brand`,
    };
  }

  if (foundWords.length <= 1) return { multiplier: 1.0, detail: "" };

  // Penalty: filler words from greedy split
  const fillerCount = foundWords.filter(w => FILLER_WORDS.has(w)).length;
  const fillerRatio = fillerCount / foundWords.length;

  if (fillerRatio >= 0.5) {
    return {
      multiplier: 0.35,
      detail: "Reads like a phrase, not a brand name — too many filler words",
    };
  }
  if (fillerCount >= 1 && foundWords.length >= 3) {
    return {
      multiplier: 0.45,
      detail: "Contains filler words — phrases don't make strong brands",
    };
  }
  if (fillerCount === 1 && foundWords.length === 2) {
    return {
      multiplier: 0.5,
      detail: "Contains a filler word — weakens brand signal",
    };
  }

  // Penalty: 3+ meaningful words = too complex for a brand
  if (foundWords.length >= 4) {
    return {
      multiplier: 0.4,
      detail: "Too many words — brands should be 1-2 words max",
    };
  }
  if (foundWords.length === 3) {
    const cats = foundWords.map(getWordCategory).filter(Boolean) as string[];
    if (cats.length >= 2) {
      const allCompatible = cats.every((c, i) =>
        cats.every((other, j) => i === j || COMPATIBLE_CATEGORIES[c]?.has(other))
      );
      if (!allCompatible) {
        return {
          multiplier: 0.4,
          detail: "Three unrelated words — not a coherent brand concept",
        };
      }
    }
    return {
      multiplier: 0.6,
      detail: "Three words — a bit complex for a brand name",
    };
  }

  // Penalty: For 2-word combos, check semantic compatibility
  if (foundWords.length === 2) {
    const cat1 = getWordCategory(foundWords[0]);
    const cat2 = getWordCategory(foundWords[1]);

    if (cat1 && cat2) {
      const compatible = COMPATIBLE_CATEGORIES[cat1]?.has(cat2) || COMPATIBLE_CATEGORIES[cat2]?.has(cat1);
      if (!compatible) {
        return {
          multiplier: 0.5,
          detail: `"${foundWords[0]}" + "${foundWords[1]}" — unrelated concepts don't form a strong brand`,
        };
      }
    }

    // Penalty: Negative or weak connotation words harm brand appeal (check before uncategorized)
    const negativeCount = foundWords.filter(w => NEGATIVE_BRAND_WORDS.has(w)).length;
    if (negativeCount >= 2) {
      return {
        multiplier: 0.4,
        detail: `Both words have negative connotations — poor brand appeal`,
      };
    }
    if (negativeCount === 1) {
      const negWord = foundWords.find(w => NEGATIVE_BRAND_WORDS.has(w))!;
      // Combine with uncategorized penalty if applicable
      const baseMult = (!cat1 && !cat2) ? 0.55 : 0.65;
      return {
        multiplier: baseMult,
        detail: `"${negWord}" has negative connotations — weakens brand appeal`,
      };
    }

    // Penalty: Neither word has a semantic category — random dictionary word pairing
    if (!cat1 && !cat2) {
      return {
        multiplier: 0.75,
        detail: `"${foundWords[0]}" + "${foundWords[1]}" — doesn't form a natural brand compound`,
      };
    }
  }

  // Single word negative check
  if (foundWords.length === 1 && NEGATIVE_BRAND_WORDS.has(foundWords[0])) {
    return {
      multiplier: 0.7,
      detail: `"${foundWords[0]}" has negative connotations — limits brand appeal`,
    };
  }

  return { multiplier: 1.0, detail: "" };
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
  const coherence = semanticCoherence(foundWords, cleanName);
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

  // Semantic coherence penalty for word structure
  if (coherence.multiplier < 1.0 && !isPremiumShort) {
    wordScore = Math.round(wordScore * coherence.multiplier);
    if (coherence.detail) wordDetail = coherence.detail;
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

  // Semantic coherence penalty for memorability (nonsense combos are forgettable)
  if (coherence.multiplier < 1.0 && !isPremiumShort) {
    memScore = Math.round(memScore * Math.max(coherence.multiplier, 0.5));
    if (coherence.detail) memDetail = "Incoherent word combination — hard to remember";
  }

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
  // Apply coherence as overall multiplier (like offensive penalty)
  let coherenceSummaryNote = "";
  if (coherence.multiplier < 1.0 && !isPremiumShort) {
    coherenceSummaryNote = ` ${coherence.detail}.`;
  }
  const coherenceOverallMult = isPremiumShort ? 1.0 : coherence.multiplier;
  const overall = Math.round(rawOverall * offensiveMultiplier * coherenceOverallMult);

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
  summary += offensiveSummaryNote + coherenceSummaryNote;

  return { overall, grade, dimensions, trademarkRisk: tmResult.riskLevel, summary, domainName: domainInput };
}
