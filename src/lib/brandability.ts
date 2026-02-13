/**
 * Brandability Score Engine
 * Combines multiple signals into a single 0-100 composite score.
 */

import { scorePronounceability, countWords } from "@/lib/pronounceability";
import { checkTrademarkRisk, type TrademarkRiskLevel } from "@/lib/trademarkCheck";

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

/** Check if a name has alternating vowel-consonant patterns (easy to say) */
function rhythmScore(name: string): number {
  let transitions = 0;
  for (let i = 1; i < name.length; i++) {
    const prevVowel = VOWELS.has(name[i - 1]);
    const currVowel = VOWELS.has(name[i]);
    if (prevVowel !== currVowel) transitions++;
  }
  const ratio = name.length > 1 ? transitions / (name.length - 1) : 0;
  // Perfect alternation = 1.0, we want 0.5-0.8 to be ideal
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

  // Penalize hyphens
  if (name.includes("-")) score -= 15;

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
  if (name.length <= 5) score += 25;
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
    // Check if any word boundary starts with same letter
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
  const name = parts[0].replace(/[-_]/g, "");
  const cleanName = name.replace(/[^a-z]/gi, "");

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

  // 1. Pronounceability (weight: 0.25)
  const pronounce = scorePronounceability(domainInput);
  const pronounceScore = pronounce.score;

  // 2. Length optimization (weight: 0.15)
  let lengthScore: number;
  let lengthDetail: string;
  if (cleanName.length <= 3) { lengthScore = 95; lengthDetail = `${cleanName.length} chars — ultra-short premium`; }
  else if (cleanName.length <= 5) { lengthScore = 90; lengthDetail = `${cleanName.length} chars — short & punchy`; }
  else if (cleanName.length <= 8) { lengthScore = 75; lengthDetail = `${cleanName.length} chars — ideal brandable length`; }
  else if (cleanName.length <= 12) { lengthScore = 50; lengthDetail = `${cleanName.length} chars — workable but long`; }
  else { lengthScore = 25; lengthDetail = `${cleanName.length} chars — too long for strong brand`; }

  // 3. Dictionary/meaningful words (weight: 0.15)
  const wordCount = countWords(cleanName);
  let wordScore: number;
  let wordDetail: string;
  if (wordCount === 1 && cleanName.length <= 8) {
    wordScore = 90;
    wordDetail = "Single meaningful word — strong brand foundation";
  } else if (wordCount === 2) {
    wordScore = 75;
    wordDetail = "Two-word compound — clear and descriptive";
  } else if (wordCount === 1) {
    wordScore = 70;
    wordDetail = "Single word but lengthy";
  } else if (wordCount === 3) {
    wordScore = 40;
    wordDetail = "Three words — harder to brand";
  } else {
    wordScore = 20;
    wordDetail = `${wordCount} words — too complex for branding`;
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
  const memScore = memorabilityScore(cleanName, wordCount);
  let memDetail: string;
  if (memScore >= 80) memDetail = "Highly memorable — sticks in your head";
  else if (memScore >= 60) memDetail = "Reasonably memorable";
  else if (memScore >= 40) memDetail = "Somewhat forgettable";
  else memDetail = "Hard to remember";

  // 6. Visual & rhythm appeal (weight: 0.15)
  const visualScore = Math.round((visualAppealScore(name) + rhythmScore(cleanName)) / 2);
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

  // Weighted average
  const overall = Math.round(
    dimensions.reduce((sum, d) => sum + d.score * d.weight, 0)
  );

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

  return { overall, grade, dimensions, trademarkRisk: tmResult.riskLevel, summary, domainName: domainInput };
}
