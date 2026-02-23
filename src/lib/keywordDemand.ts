/**
 * Keyword Demand Scoring Module
 * Scores domains 1-100 based on keyword demand, niche heat, and market signals.
 * Uses a hybrid approach: heuristic engine (primary) + AI trend enrichment (boost modifier).
 */

import { TRENDING_KEYWORDS, NICHE_CATEGORIES, PREMIUM_KEYWORDS, PENALTY_KEYWORDS, detectNiche, splitIntoWords, isSingleDictionaryWord, type NicheDetection } from "@/lib/domainValuation";
import { computeTrendBoost, type TrendEnrichment } from "@/lib/trendEnrichment";

// ─── DEMAND TIERS ───

/** Heat tier based on TRENDING_KEYWORDS multiplier */
function keywordHeatScore(multiplier: number): number {
  if (multiplier >= 2.2) return 100;
  if (multiplier >= 2.0) return 90;
  if (multiplier >= 1.8) return 80;
  if (multiplier >= 1.6) return 65;
  if (multiplier >= 1.5) return 55;
  if (multiplier >= 1.4) return 45;
  if (multiplier >= 1.3) return 35;
  return 20;
}

/** Niche heat contribution */
function nicheHeatBonus(heat: "hot" | "warm" | "stable" | "cooling"): number {
  switch (heat) {
    case "hot": return 20;
    case "warm": return 12;
    case "stable": return 6;
    case "cooling": return 0;
  }
}

export interface KeywordDemandResult {
  score: number;               // 1-100
  label: string;               // "🔥 Surging", "📈 High", etc.
  grade: "A" | "B" | "C" | "D" | "F";
  trendingKeywords: string[];  // which keywords are trending
  niche: NicheDetection;
  factors: { label: string; points: number; detail: string }[];
  enriched: boolean;           // whether AI trend data was applied
}

/**
 * Score keyword demand using the heuristic engine.
 * Optionally accepts pre-fetched trend enrichment data to apply boost modifiers.
 * When enrichment is null, the function behaves identically to the original heuristic-only version.
 */
export function scoreKeywordDemand(domain: string, enrichment?: TrendEnrichment | null): KeywordDemandResult {
  const parts = domain.toLowerCase().replace(/^www\./, "").split(".");
  const name = parts[0].replace(/[^a-z0-9]/g, "");
  const tld = parts[1] || "com";

  const wordParts = splitIntoWords(name);
  const meaningfulWords = wordParts.filter(w => w.length >= 2);
  const hasPenalty = [...PENALTY_KEYWORDS].some(kw => name.includes(kw));

  if (hasPenalty) {
    return {
      score: 1,
      label: "⛔ Toxic",
      grade: "F",
      trendingKeywords: [],
      niche: { niche: "general", label: "General", multiplier: 1.0, confidence: "Low", matchedKeywords: [] },
      factors: [{ label: "Penalty Content", points: -99, detail: "Contains risky/blacklisted keywords — zero demand signal" }],
      enriched: false,
    };
  }

  const factors: KeywordDemandResult["factors"] = [];
  let rawScore = 0;

  // 1. Individual keyword heat (max 40 pts)
  const trendingKeywords: string[] = [];
  let bestHeat = 0;
  for (const word of meaningfulWords) {
    const m = TRENDING_KEYWORDS[word];
    if (m && m > 1.0) {
      trendingKeywords.push(word);
      bestHeat = Math.max(bestHeat, m);
    }
  }

  if (bestHeat > 0) {
    const heatPts = Math.round(keywordHeatScore(bestHeat) * 0.4); // scale to max 40
    rawScore += heatPts;
    factors.push({ label: "Keyword Heat", points: heatPts, detail: `Best keyword multiplier: ${bestHeat.toFixed(1)}x — ${trendingKeywords.join(", ")}` });
  } else {
    // Check if premium (non-trending but in-demand)
    const premiumHits = meaningfulWords.filter(w => PREMIUM_KEYWORDS.has(w));
    if (premiumHits.length > 0) {
      const pts = Math.min(20, premiumHits.length * 8);
      rawScore += pts;
      factors.push({ label: "Premium Keywords", points: pts, detail: `Industry keywords: ${premiumHits.join(", ")}` });
    } else {
      factors.push({ label: "Keyword Heat", points: 0, detail: "No trending or premium keywords detected" });
    }
  }

  // 2. Multi-keyword combo bonus (max 15 pts)
  if (trendingKeywords.length >= 3) {
    rawScore += 15;
    factors.push({ label: "Keyword Combo", points: 15, detail: `Triple trending combo: ${trendingKeywords.join(" + ")}` });
  } else if (trendingKeywords.length === 2) {
    rawScore += 10;
    factors.push({ label: "Keyword Combo", points: 10, detail: `Dual trending combo: ${trendingKeywords.join(" + ")}` });
  }

  // 3. Niche alignment (max 20 pts)
  const niche = detectNiche(meaningfulWords, tld);
  if (niche.niche !== "general") {
    const nicheEntry = NICHE_CATEGORIES[niche.niche];
    const nichePts = nicheHeatBonus(nicheEntry?.heat || "stable");
    rawScore += nichePts;
    factors.push({
      label: "Niche Demand",
      points: nichePts,
      detail: `${niche.label} — ${nicheEntry?.heat || "stable"} market (${niche.confidence} confidence)`,
    });
  } else {
    factors.push({ label: "Niche Demand", points: 0, detail: "No specific niche detected" });
  }

  // 4. TLD demand signal (max 15 pts)
  let tldPts = 0;
  if (tld === "com") { tldPts = 12; }
  else if (tld === "ai") { tldPts = 15; }
  else if (tld === "io") { tldPts = 10; }
  else if (["co", "app", "dev"].includes(tld)) { tldPts = 7; }
  else if (["net", "org"].includes(tld)) { tldPts = 5; }
  else { tldPts = 2; }

  // TLD-niche synergy boost
  const synergies: Record<string, string[]> = {
    ai: ["ai_tech"], io: ["saas", "ai_tech"], bio: ["biotech"], health: ["health"],
    law: ["legal"], auto: ["automotive"], dev: ["saas", "ai_tech"],
  };
  if (synergies[tld]?.includes(niche.niche)) {
    tldPts = Math.min(15, tldPts + 5);
    factors.push({ label: "TLD Demand", points: tldPts, detail: `.${tld} perfectly matches ${niche.label} niche — premium TLD synergy` });
  } else {
    factors.push({ label: "TLD Demand", points: tldPts, detail: `.${tld} — ${tldPts >= 10 ? "high" : tldPts >= 5 ? "moderate" : "low"} aftermarket demand` });
  }
  rawScore += tldPts;

  // 5. Dictionary word evergreen bonus (max 10 pts)
  const isDictWord = isSingleDictionaryWord(name);
  if (isDictWord) {
    const dictPts = name.length <= 6 ? 10 : 7;
    rawScore += dictPts;
    factors.push({ label: "Dictionary Word", points: dictPts, detail: `"${name}" is a real English word — evergreen demand` });
  }

  // 6. AI Trend Enrichment boost (±15 pts max)
  const enrichmentData = enrichment ?? null;
  const { boost, factors: enrichFactors } = computeTrendBoost(meaningfulWords, niche.niche, enrichmentData);
  if (boost !== 0) {
    rawScore += boost;
    factors.push(...enrichFactors);
  }
  const enriched = enrichmentData !== null && boost !== 0;

  // Clamp
  const score = Math.max(1, Math.min(100, rawScore));

  // Label & grade
  let label: string;
  let grade: KeywordDemandResult["grade"];
  if (score >= 85) { label = "🔥 Surging"; grade = "A"; }
  else if (score >= 70) { label = "📈 High Demand"; grade = "A"; }
  else if (score >= 55) { label = "⬆️ Growing"; grade = "B"; }
  else if (score >= 40) { label = "➡️ Moderate"; grade = "C"; }
  else if (score >= 25) { label = "↘️ Low"; grade = "D"; }
  else { label = "⬇️ Minimal"; grade = "F"; }

  return { score, label, grade, trendingKeywords, niche, factors, enriched };
}
