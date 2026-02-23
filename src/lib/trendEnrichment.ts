/**
 * Trend Enrichment Layer
 * Fetches AI-generated market trend data from the database and provides
 * boost modifiers for the keyword demand scorer. This is the hybrid approach:
 * the heuristic engine remains the primary scorer, and this layer adds
 * real-time market intelligence as a modifier (±15 points max).
 */

import { supabase } from "@/integrations/supabase/client";

export interface TrendEnrichment {
  keywords: Record<string, number>;  // keyword → AI heat multiplier (1.0-2.5)
  hotNiches: { niche: string; label: string; heat: number; emerging_keywords?: string[] }[];
  marketSignals: string[];
  generatedAt: string;
  stale: boolean;  // true if data is >24h old
}

let cachedEnrichment: TrendEnrichment | null = null;
let cacheTimestamp = 0;
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 min in-memory cache

/**
 * Fetch trend enrichment data from the trending_market_data table.
 * Returns null if no data available. Caches in-memory for 10 minutes.
 */
export async function fetchTrendEnrichment(): Promise<TrendEnrichment | null> {
  const now = Date.now();
  if (cachedEnrichment && now - cacheTimestamp < CACHE_TTL_MS) {
    return cachedEnrichment;
  }

  try {
    const { data, error } = await supabase
      .from("trending_market_data")
      .select("trending_keywords, hot_niches, market_signals, generated_at")
      .eq("id", "latest")
      .maybeSingle();

    if (error || !data) return null;

    const generatedAt = data.generated_at as string;
    const ageMs = now - new Date(generatedAt).getTime();
    const stale = ageMs > 24 * 60 * 60 * 1000; // >24h = stale

    const enrichment: TrendEnrichment = {
      keywords: (data.trending_keywords as Record<string, number>) || {},
      hotNiches: (data.hot_niches as TrendEnrichment["hotNiches"]) || [],
      marketSignals: (data.market_signals as string[]) || [],
      generatedAt,
      stale,
    };

    cachedEnrichment = enrichment;
    cacheTimestamp = now;
    return enrichment;
  } catch {
    return null;
  }
}

/**
 * Calculate a boost modifier (can be negative) based on trend enrichment data.
 * Returns a value between -10 and +15 to add to the heuristic score.
 * 
 * Boost logic:
 * - If a keyword appears in AI trends with higher heat than the heuristic → positive boost
 * - If a keyword is in AI "emerging" list but not in heuristic → discovery boost
 * - If AI trends show the niche is cooling → slight negative modifier
 * - Stale data gets halved boost
 */
export function computeTrendBoost(
  meaningfulWords: string[],
  nicheKey: string,
  enrichment: TrendEnrichment | null,
): { boost: number; factors: { label: string; points: number; detail: string }[] } {
  if (!enrichment) return { boost: 0, factors: [] };

  const factors: { label: string; points: number; detail: string }[] = [];
  let rawBoost = 0;

  // 1. Keyword-level boost: compare AI heat vs heuristic baseline
  const discoveredKeywords: string[] = [];
  let bestAiHeat = 0;

  for (const word of meaningfulWords) {
    const aiHeat = enrichment.keywords[word];
    if (aiHeat && aiHeat > 1.0) {
      bestAiHeat = Math.max(bestAiHeat, aiHeat);
    }
    // Discovery: AI found a trending keyword not in our heuristic TRENDING_KEYWORDS
    if (aiHeat && aiHeat >= 1.5) {
      discoveredKeywords.push(word);
    }
  }

  if (bestAiHeat >= 2.0) {
    rawBoost += 8;
    factors.push({ label: "AI Trend Signal", points: 8, detail: `AI detected surging demand (${bestAiHeat.toFixed(1)}x heat)` });
  } else if (bestAiHeat >= 1.5) {
    rawBoost += 5;
    factors.push({ label: "AI Trend Signal", points: 5, detail: `AI detected growing demand (${bestAiHeat.toFixed(1)}x heat)` });
  } else if (bestAiHeat >= 1.2) {
    rawBoost += 2;
    factors.push({ label: "AI Trend Signal", points: 2, detail: `AI detected moderate demand (${bestAiHeat.toFixed(1)}x heat)` });
  }

  // 2. Emerging keyword discovery bonus
  if (discoveredKeywords.length > 0) {
    const discoveryPts = Math.min(5, discoveredKeywords.length * 2);
    rawBoost += discoveryPts;
    factors.push({ label: "Emerging Trend", points: discoveryPts, detail: `AI-discovered trending terms: ${discoveredKeywords.slice(0, 3).join(", ")}` });
  }

  // 3. Niche heat alignment
  if (nicheKey !== "general") {
    const nicheMatch = enrichment.hotNiches.find(n =>
      n.niche.toLowerCase().replace(/[\s/]/g, "_") === nicheKey ||
      n.label.toLowerCase().includes(nicheKey.replace(/_/g, " "))
    );
    if (nicheMatch) {
      if (nicheMatch.heat >= 80) {
        rawBoost += 4;
        factors.push({ label: "Niche Momentum", points: 4, detail: `${nicheMatch.label} niche at ${nicheMatch.heat}/100 heat` });
      } else if (nicheMatch.heat >= 60) {
        rawBoost += 2;
        factors.push({ label: "Niche Momentum", points: 2, detail: `${nicheMatch.label} niche at ${nicheMatch.heat}/100 heat` });
      } else if (nicheMatch.heat < 30) {
        rawBoost -= 3;
        factors.push({ label: "Cooling Niche", points: -3, detail: `${nicheMatch.label} niche cooling (${nicheMatch.heat}/100)` });
      }
    }
  }

  // Stale data penalty: halve the boost
  if (enrichment.stale && rawBoost > 0) {
    const originalBoost = rawBoost;
    rawBoost = Math.round(rawBoost / 2);
    factors.push({ label: "Stale Data", points: rawBoost - originalBoost, detail: "Trend data >24h old — boost halved" });
  }

  // Clamp to [-10, +15]
  const boost = Math.max(-10, Math.min(15, rawBoost));

  return { boost, factors };
}

/** Clear the in-memory cache (useful for testing or after a manual refresh) */
export function clearTrendCache(): void {
  cachedEnrichment = null;
  cacheTimestamp = 0;
}
