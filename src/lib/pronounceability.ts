// Pronounceability scoring algorithm for domain names

const VOWELS = new Set("aeiouy");
const CONSONANTS = new Set("bcdfghjklmnpqrstvwxz");

// Common pronounceable bigrams
const GOOD_BIGRAMS = new Set([
  "th", "he", "in", "er", "an", "re", "on", "at", "en", "nd",
  "ti", "es", "or", "te", "of", "ed", "is", "it", "al", "ar",
  "st", "to", "nt", "ng", "se", "ha", "as", "ou", "io", "le",
  "ve", "co", "me", "de", "hi", "ri", "ro", "ic", "ne", "ea",
  "ra", "ce", "li", "ch", "ll", "be", "ma", "si", "om", "ur",
  "ca", "el", "ta", "la", "ns", "ge", "ly", "ei", "os", "il",
  "no", "pe", "do", "su", "pa", "ec", "ac", "ot", "di", "ol",
  "tr", "sh", "pr", "pl", "cr", "bl", "fl", "gr", "br", "cl",
  "dr", "fr", "gl", "sl", "sp", "sw", "tw", "wr", "sc", "sk",
  "sm", "sn", "sq", "str", "spr",
]);

// Difficult consonant clusters
const BAD_CLUSTERS = /[bcdfghjklmnpqrstvwxz]{4,}|^[bcdfghjklmnpqrstvwxz]{3}|[bcdfghjklmnpqrstvwxz]{3}$/i;

export interface PronounceabilityResult {
  score: number; // 0-100
  grade: "Excellent" | "Good" | "Fair" | "Poor";
  factors: { label: string; impact: "positive" | "negative" | "neutral"; detail: string }[];
}

export function scorePronounceability(domain: string): PronounceabilityResult {
  // Strip TLD
  const name = domain.split(".")[0].toLowerCase().replace(/[^a-z]/g, "");
  if (!name) return { score: 0, grade: "Poor", factors: [{ label: "Empty", impact: "negative", detail: "No valid characters" }] };

  let score = 50; // Start neutral
  const factors: PronounceabilityResult["factors"] = [];

  // 1. Length check (ideal 4-8)
  if (name.length <= 8 && name.length >= 4) {
    score += 15;
    factors.push({ label: "Length", impact: "positive", detail: `${name.length} characters — ideal length` });
  } else if (name.length <= 12) {
    score += 5;
    factors.push({ label: "Length", impact: "neutral", detail: `${name.length} characters — slightly long` });
  } else {
    score -= 10;
    factors.push({ label: "Length", impact: "negative", detail: `${name.length} characters — too long to remember easily` });
  }

  // 2. Vowel/consonant ratio
  const vowelCount = [...name].filter(c => VOWELS.has(c)).length;
  const ratio = vowelCount / name.length;
  if (ratio >= 0.3 && ratio <= 0.55) {
    score += 15;
    factors.push({ label: "Vowel Balance", impact: "positive", detail: `${Math.round(ratio * 100)}% vowels — natural flow` });
  } else if (ratio >= 0.2 && ratio <= 0.65) {
    score += 5;
    factors.push({ label: "Vowel Balance", impact: "neutral", detail: `${Math.round(ratio * 100)}% vowels — acceptable` });
  } else {
    score -= 15;
    factors.push({ label: "Vowel Balance", impact: "negative", detail: `${Math.round(ratio * 100)}% vowels — hard to pronounce` });
  }

  // 3. Consonant clusters
  if (BAD_CLUSTERS.test(name)) {
    score -= 20;
    factors.push({ label: "Consonant Clusters", impact: "negative", detail: "Contains difficult consonant groups" });
  } else {
    score += 10;
    factors.push({ label: "Consonant Clusters", impact: "positive", detail: "No difficult consonant clusters" });
  }

  // 4. Bigram analysis
  let goodBigrams = 0;
  for (let i = 0; i < name.length - 1; i++) {
    if (GOOD_BIGRAMS.has(name.slice(i, i + 2))) goodBigrams++;
  }
  const bigramRatio = name.length > 1 ? goodBigrams / (name.length - 1) : 0;
  if (bigramRatio >= 0.5) {
    score += 15;
    factors.push({ label: "Letter Patterns", impact: "positive", detail: "Uses common, easy letter combinations" });
  } else if (bigramRatio >= 0.25) {
    score += 5;
    factors.push({ label: "Letter Patterns", impact: "neutral", detail: "Some familiar letter patterns" });
  } else {
    score -= 10;
    factors.push({ label: "Letter Patterns", impact: "negative", detail: "Unusual letter combinations" });
  }

  // 5. Syllable estimate (vowel groups)
  const syllables = name.match(/[aeiouy]+/gi)?.length || 0;
  if (syllables >= 2 && syllables <= 3) {
    score += 10;
    factors.push({ label: "Syllables", impact: "positive", detail: `~${syllables} syllables — easy to say` });
  } else if (syllables === 1 || syllables === 4) {
    score += 3;
    factors.push({ label: "Syllables", impact: "neutral", detail: `~${syllables} syllable${syllables > 1 ? "s" : ""} — acceptable` });
  } else {
    score -= 10;
    factors.push({ label: "Syllables", impact: "negative", detail: `~${syllables} syllables — too many` });
  }

  // 6. Repeated characters
  if (/(.)\1{2,}/i.test(name)) {
    score -= 10;
    factors.push({ label: "Repetition", impact: "negative", detail: "Contains triple+ repeated characters" });
  }

  // Clamp
  score = Math.max(0, Math.min(100, score));

  const grade: PronounceabilityResult["grade"] =
    score >= 80 ? "Excellent" : score >= 60 ? "Good" : score >= 40 ? "Fair" : "Poor";

  return { score, grade, factors };
}
