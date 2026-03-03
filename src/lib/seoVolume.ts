/**
 * SEO Keyword Volume Estimation Module
 * Uses AI-estimated search volumes from the trend enrichment layer when available,
 * falling back to hardcoded heuristics. This hybrid approach gives us real(ish)
 * Google-sourced volume estimates without a paid API.
 */

import { PREMIUM_KEYWORDS, TRENDING_KEYWORDS, DICTIONARY_WORDS, splitIntoWords } from "@/lib/domainValuation";
import type { TrendEnrichment } from "@/lib/trendEnrichment";

// Fallback head terms with approximate monthly searches (used when no AI data available)
const HEAD_TERMS: Record<string, number> = {
  "insurance": 823000, "loans": 450000, "mortgage": 368000, "lawyer": 301000,
  "credit": 246000, "attorney": 201000, "hosting": 165000, "casino": 550000,
  "health": 450000, "fitness": 201000, "crypto": 301000, "bitcoin": 368000,
  "vpn": 246000, "software": 135000, "cloud": 165000, "travel": 368000,
  "hotel": 301000, "dating": 246000, "jobs": 368000, "real estate": 201000,
  "solar": 135000, "car": 450000, "auto": 201000, "bank": 301000,
  "invest": 165000, "trade": 135000, "pay": 201000, "shop": 246000,
  "game": 368000, "food": 301000, "pet": 201000, "dog": 246000,
  "cat": 165000, "home": 550000, "house": 368000, "rent": 201000,
  "buy": 301000, "sell": 165000, "ai": 450000, "data": 246000,
  "code": 165000, "tech": 201000, "app": 301000, "web": 246000,
  "news": 550000, "music": 368000, "video": 450000, "photo": 201000,
  "beauty": 246000, "fashion": 201000, "skin": 165000, "dental": 135000,
  "legal": 110000, "energy": 165000, "electric": 135000, "robot": 110000,
};

export interface SEOVolumeResult {
  estimatedMonthlySearches: number;
  volumeLabel: string;          // "Very High", "High", "Medium", "Low", "Minimal"
  volumeScore: number;          // 0-100
  competitionLevel: string;     // "Extreme", "High", "Medium", "Low"
  topKeyword: string | null;    // The highest-volume keyword found
  organicPotential: string;     // Summary sentence
  trendDirection?: "rising" | "falling" | "stable"; // From AI data
  cpcEstimate?: number;         // Estimated CPC from AI data
  dataSource: "ai" | "heuristic"; // Whether AI volume data was used
}

/**
 * Estimate SEO volume for a domain. When enrichment data with keyword_volumes
 * is available, uses AI-estimated volumes. Otherwise falls back to heuristics.
 */
export function estimateSEOVolume(domain: string, enrichment?: TrendEnrichment | null): SEOVolumeResult {
  const parts = domain.toLowerCase().replace(/^www\./, "").split(".");
  const name = parts[0].replace(/[^a-z0-9]/g, "");
  const words = splitIntoWords(name).filter(w => w.length >= 2);

  const hasAiVolumes = enrichment?.keywordVolumes && Object.keys(enrichment.keywordVolumes).length > 0;

  // Sanity caps: AI models routinely overestimate Google search volumes by 100-1000x.
  // Real-world reference points (Ahrefs/SEMrush verified):
  //   "insurance" ≈ 823K, "home" ≈ 550K, "casino" ≈ 550K, "car" ≈ 450K
  //   "crypto" ≈ 301K, "ai" ≈ 450K, "app" ≈ 301K
  // Maximum single-keyword monthly search volume on Google is ~5M (e.g., "facebook", "youtube")
  const MAX_SINGLE_KEYWORD_VOLUME = 2_000_000; // generous cap for any single keyword
  const MAX_TOTAL_VOLUME = 5_000_000;           // cap for compound domains

  // Cross-reference table: if AI volume for a known keyword is >5x heuristic, use heuristic
  function sanitizeAiVolume(word: string, aiVolume: number): number {
    const heuristicRef = HEAD_TERMS[word];
    if (heuristicRef) {
      // AI is wildly off — trust heuristic within a 3x tolerance
      if (aiVolume > heuristicRef * 3) return heuristicRef;
      if (aiVolume < heuristicRef * 0.2) return heuristicRef; // AI too low
    }
    return Math.min(aiVolume, MAX_SINGLE_KEYWORD_VOLUME);
  }

  let totalVolume = 0;
  let topKeyword: string | null = null;
  let topVolume = 0;
  let trendDirection: "rising" | "falling" | "stable" | undefined;
  let cpcEstimate: number | undefined;
  let usedAi = false;

  for (const word of words) {
    // Try AI volume data first
    if (hasAiVolumes) {
      const aiData = enrichment!.keywordVolumes[word];
      if (aiData && aiData.volume > 0) {
        const vol = sanitizeAiVolume(word, aiData.volume);
        totalVolume += vol;
        usedAi = true;
        if (vol > topVolume) {
          topVolume = vol;
          topKeyword = word;
          trendDirection = aiData.trend as "rising" | "falling" | "stable";
          cpcEstimate = aiData.cpc_estimate;
        }
        continue; // AI data found, skip heuristic for this word
      }
    }

    // Fallback to heuristic
    const vol = HEAD_TERMS[word];
    if (vol) {
      totalVolume += vol;
      if (vol > topVolume) { topVolume = vol; topKeyword = word; }
    } else if (TRENDING_KEYWORDS[word] && TRENDING_KEYWORDS[word] >= 1.5) {
      const estimatedVol = Math.round(5000 * TRENDING_KEYWORDS[word]);
      totalVolume += estimatedVol;
      if (estimatedVol > topVolume) { topVolume = estimatedVol; topKeyword = word; }
    } else if (PREMIUM_KEYWORDS.has(word)) {
      totalVolume += 3000;
      if (3000 > topVolume) { topVolume = 3000; topKeyword = word; }
    } else if (DICTIONARY_WORDS.has(word)) {
      totalVolume += 1000;
      if (1000 > topVolume) { topVolume = 1000; topKeyword = word; }
    }
  }

  // Multi-word compound discount
  if (words.length >= 2 && totalVolume > 0) {
    totalVolume = Math.round(totalVolume * 0.6);
  }

  // Final sanity cap
  totalVolume = Math.min(totalVolume, MAX_TOTAL_VOLUME);

  // Determine labels
  let volumeLabel: string;
  let volumeScore: number;
  let competitionLevel: string;

  if (totalVolume >= 100000) {
    volumeLabel = "Very High"; volumeScore = 95; competitionLevel = "Extreme";
  } else if (totalVolume >= 30000) {
    volumeLabel = "High"; volumeScore = 80; competitionLevel = "High";
  } else if (totalVolume >= 10000) {
    volumeLabel = "Medium-High"; volumeScore = 65; competitionLevel = "High";
  } else if (totalVolume >= 3000) {
    volumeLabel = "Medium"; volumeScore = 50; competitionLevel = "Medium";
  } else if (totalVolume >= 500) {
    volumeLabel = "Low-Medium"; volumeScore = 35; competitionLevel = "Medium";
  } else if (totalVolume >= 100) {
    volumeLabel = "Low"; volumeScore = 20; competitionLevel = "Low";
  } else {
    volumeLabel = "Minimal"; volumeScore = 5; competitionLevel = "Low";
  }

  // Trend direction label for organic potential
  const trendLabel = trendDirection === "rising" ? " (↑ rising)" : trendDirection === "falling" ? " (↓ declining)" : "";

  // Organic potential summary
  let organicPotential: string;
  if (volumeScore >= 80) {
    organicPotential = `High organic traffic potential — "${topKeyword}" drives ~${totalVolume.toLocaleString()} monthly searches${trendLabel}. Expect strong type-in traffic.`;
  } else if (volumeScore >= 50) {
    organicPotential = `Moderate organic potential — keywords drive ~${totalVolume.toLocaleString()} monthly searches${trendLabel}. Good for niche authority sites.`;
  } else if (volumeScore >= 20) {
    organicPotential = `Limited organic volume (~${totalVolume.toLocaleString()}/mo)${trendLabel}. Value comes from brandability rather than search traffic.`;
  } else {
    organicPotential = `Minimal search volume detected. This domain's value is brand-driven, not SEO-driven.`;
  }

  return {
    estimatedMonthlySearches: totalVolume,
    volumeLabel,
    volumeScore,
    competitionLevel,
    topKeyword,
    organicPotential,
    trendDirection,
    cpcEstimate,
    dataSource: usedAi ? "ai" : "heuristic",
  };
}