/**
 * SEO Keyword Volume Module
 * Uses DataForSEO real search volumes when available (via edge function + cache),
 * falling back to AI enrichment data, then hardcoded heuristics.
 */

import { PREMIUM_KEYWORDS, TRENDING_KEYWORDS, DICTIONARY_WORDS, splitIntoWords } from "@/lib/domainValuation";
import type { TrendEnrichment } from "@/lib/trendEnrichment";
import { supabase } from "@/integrations/supabase/client";

// Fallback head terms with approximate monthly searches
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
  volumeLabel: string;
  volumeScore: number;
  competitionLevel: string;
  topKeyword: string | null;
  organicPotential: string;
  trendDirection?: "rising" | "falling" | "stable";
  cpcEstimate?: number;
  dataSource: "dataforseo" | "ai" | "heuristic";
  monthlySearches?: { year: number; month: number; search_volume: number }[];
}

/**
 * Fetch real keyword volumes from DataForSEO via our edge function.
 * Returns a map of keyword → volume data.
 */
export async function fetchKeywordVolumes(
  keywords: string[]
): Promise<Record<string, { volume: number; cpc: number | null; competition: number | null; competition_level: string | null; trend: string | null; monthly_searches: any[]; source: string }>> {
  try {
    const { data, error } = await supabase.functions.invoke("keyword-volume-lookup", {
      body: { keywords },
    });

    if (error) {
      console.warn("keyword-volume-lookup error:", error);
      return {};
    }

    return data?.keywords || {};
  } catch (err) {
    console.warn("Failed to fetch keyword volumes:", err);
    return {};
  }
}

/**
 * Estimate SEO volume for a domain. Prefers DataForSEO data if provided,
 * then AI enrichment, then heuristics.
 */
export function estimateSEOVolume(
  domain: string,
  enrichment?: TrendEnrichment | null,
  dataForSeoData?: Record<string, { volume: number; cpc: number | null; competition: number | null; competition_level: string | null; trend: string | null; monthly_searches: any[] }>
): SEOVolumeResult {
  const parts = domain.toLowerCase().replace(/^www\./, "").split(".");
  const name = parts[0].replace(/[^a-z0-9]/g, "");
  const words = splitIntoWords(name).filter(w => w.length >= 2);

  const hasDataForSeo = dataForSeoData && Object.keys(dataForSeoData).length > 0;
  const hasAiVolumes = enrichment?.keywordVolumes && Object.keys(enrichment.keywordVolumes).length > 0;

  const MAX_SINGLE_KEYWORD_VOLUME = 2_000_000;
  const MAX_TOTAL_VOLUME = 5_000_000;

  let totalVolume = 0;
  let topKeyword: string | null = null;
  let topVolume = 0;
  let trendDirection: "rising" | "falling" | "stable" | undefined;
  let cpcEstimate: number | undefined;
  let dataSource: "dataforseo" | "ai" | "heuristic" = "heuristic";
  let monthlySearches: any[] | undefined;

  for (const word of words) {
    // Priority 1: DataForSEO real data
    if (hasDataForSeo && dataForSeoData![word]) {
      const d = dataForSeoData![word];
      if (d.volume > 0) {
        const vol = Math.min(d.volume, MAX_SINGLE_KEYWORD_VOLUME);
        totalVolume += vol;
        dataSource = "dataforseo";
        if (vol > topVolume) {
          topVolume = vol;
          topKeyword = word;
          trendDirection = d.trend as "rising" | "falling" | "stable";
          cpcEstimate = d.cpc ?? undefined;
          monthlySearches = d.monthly_searches;
        }
        continue;
      }
    }

    // Priority 2: AI enrichment data (with sanity check)
    if (hasAiVolumes) {
      const aiData = enrichment!.keywordVolumes[word];
      if (aiData && aiData.volume > 0) {
        const vol = sanitizeAiVolume(word, aiData.volume, MAX_SINGLE_KEYWORD_VOLUME);
        totalVolume += vol;
        if (dataSource !== "dataforseo") dataSource = "ai";
        if (vol > topVolume) {
          topVolume = vol;
          topKeyword = word;
          trendDirection = aiData.trend as "rising" | "falling" | "stable";
          cpcEstimate = aiData.cpc_estimate;
        }
        continue;
      }
    }

    // Priority 3: Heuristic fallback
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

  // Use DataForSEO competition level if available
  if (dataSource === "dataforseo" && dataForSeoData && topKeyword && dataForSeoData[topKeyword]?.competition_level) {
    competitionLevel = capitalizeFirst(dataForSeoData[topKeyword].competition_level!);
  }

  const trendLabel = trendDirection === "rising" ? " (↑ rising)" : trendDirection === "falling" ? " (↓ declining)" : "";
  const sourceTag = dataSource === "dataforseo" ? " [Google Ads data]" : dataSource === "ai" ? " [AI-estimated]" : "";

  let organicPotential: string;
  if (volumeScore >= 80) {
    organicPotential = `High organic traffic potential — "${topKeyword}" drives ~${totalVolume.toLocaleString()} monthly searches${trendLabel}${sourceTag}. Expect strong type-in traffic.`;
  } else if (volumeScore >= 50) {
    organicPotential = `Moderate organic potential — keywords drive ~${totalVolume.toLocaleString()} monthly searches${trendLabel}${sourceTag}. Good for niche authority sites.`;
  } else if (volumeScore >= 20) {
    organicPotential = `Limited organic volume (~${totalVolume.toLocaleString()}/mo)${trendLabel}${sourceTag}. Value comes from brandability rather than search traffic.`;
  } else {
    organicPotential = `Minimal search volume detected${sourceTag}. This domain's value is brand-driven, not SEO-driven.`;
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
    dataSource,
    monthlySearches,
  };
}

function sanitizeAiVolume(word: string, aiVolume: number, max: number): number {
  const heuristicRef = HEAD_TERMS[word];
  if (heuristicRef) {
    if (aiVolume > heuristicRef * 3) return heuristicRef;
    if (aiVolume < heuristicRef * 0.2) return heuristicRef;
  }
  return Math.min(aiVolume, max);
}

function capitalizeFirst(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}
