/**
 * Comparable Sales Anchoring
 *
 * Fetches the closest comparable sales from the database and uses them
 * to adjust quickValuation bands toward real market data.
 *
 * Matching weights:
 *   TLD match        40%
 *   Length similarity 25%
 *   Keyword overlap   25%
 *   Recency           10%
 */

import { supabase } from "@/integrations/supabase/client";
import {
  splitIntoWords,
  PREMIUM_KEYWORDS,
  DICTIONARY_WORDS,
  COMMON_WORDS,
  type QuickValuationResult,
} from "@/lib/domainValuation";

export interface ComparableSale {
  domain_name: string;
  tld: string | null;
  sale_price: number;
  sale_date: string | null;
  venue: string | null;
}

interface ScoredComp {
  sale: ComparableSale;
  relevance: number;
}

// ─── In-memory cache (TTL 5 min) ───

let cachedComps: ComparableSale[] | null = null;
let cachedAt = 0;
const CACHE_TTL_MS = 5 * 60 * 1000;

async function getAllComps(): Promise<ComparableSale[]> {
  if (cachedComps && Date.now() - cachedAt < CACHE_TTL_MS) return cachedComps;

  const { data, error } = await (supabase as any)
    .from("comparable_sales")
    .select("domain_name, tld, sale_price, sale_date, venue")
    .order("sale_price", { ascending: false })
    .limit(1000);

  if (error || !data) {
    console.warn("Failed to fetch comparable sales for anchoring:", error);
    return cachedComps ?? [];
  }

  cachedComps = data as ComparableSale[];
  cachedAt = Date.now();
  return cachedComps;
}

// ─── Keyword extraction helper ───

function extractKeywords(domainName: string): string[] {
  const name = domainName.split(".")[0].toLowerCase().replace(/[^a-z0-9]/g, "");
  const words = splitIntoWords(name);
  return words.filter(
    (w) => w.length >= 2 && (PREMIUM_KEYWORDS.has(w) || DICTIONARY_WORDS.has(w) || COMMON_WORDS.has(w))
  );
}

// ─── Relevance scoring ───

function scoreRelevance(
  comp: ComparableSale,
  targetTld: string,
  targetLength: number,
  targetKeywords: string[]
): number {
  const compName = comp.domain_name.split(".")[0].toLowerCase().replace(/[^a-z0-9]/g, "");
  const compTld = comp.tld || comp.domain_name.split(".").pop() || "";

  // TLD match (0 or 1) — weight 40%
  const tldScore = compTld.toLowerCase() === targetTld.toLowerCase() ? 1 : 0;

  // Length similarity (0-1) — weight 25%
  const lengthDiff = Math.abs(compName.length - targetLength);
  const lengthScore = Math.max(0, 1 - lengthDiff / 10);

  // Keyword overlap (0-1) — weight 25%
  let keywordScore = 0;
  if (targetKeywords.length > 0) {
    const compKeywords = extractKeywords(comp.domain_name);
    const overlap = targetKeywords.filter((kw) => compKeywords.includes(kw)).length;
    keywordScore = overlap / targetKeywords.length;
    // Also boost for partial substring match on the SLD
    if (keywordScore === 0) {
      const subMatch = targetKeywords.filter((kw) => compName.includes(kw) || kw.includes(compName)).length;
      keywordScore = subMatch > 0 ? 0.3 : 0;
    }
  }

  // Recency (0-1) — weight 10%
  let recencyScore = 0.5; // default if no date
  if (comp.sale_date) {
    const saleDateMs = new Date(comp.sale_date).getTime();
    const ageYears = (Date.now() - saleDateMs) / (365.25 * 24 * 60 * 60 * 1000);
    recencyScore = Math.max(0, 1 - ageYears / 6); // 6 years → 0
  }

  // Venue bonus: end-user sales are weighted higher
  const venueBonus = comp.venue?.toLowerCase() === "end-user" ? 0.05 : 0;

  return tldScore * 0.4 + lengthScore * 0.25 + keywordScore * 0.25 + recencyScore * 0.1 + venueBonus;
}

// ─── Main anchoring function ───

export interface AnchoredValuation extends QuickValuationResult {
  compAnchored: boolean;
  compMedian: number | null;
  compCount: number;
  anchorAdjustment: number; // multiplier applied (1.0 = no change)
}

/**
 * Takes a quickValuation result and adjusts the band using comparable sales.
 * Only anchors when we have ≥3 relevant comps with relevance > 0.3
 */
export async function anchorWithComps(
  domain: string,
  baseVal: QuickValuationResult
): Promise<AnchoredValuation> {
  const noAnchor: AnchoredValuation = {
    ...baseVal,
    compAnchored: false,
    compMedian: null,
    compCount: 0,
    anchorAdjustment: 1.0,
  };

  try {
    const allComps = await getAllComps();
    if (allComps.length === 0) return noAnchor;

    const parts = domain.toLowerCase().replace(/^www\./, "").split(".");
    const name = parts[0].replace(/[^a-z0-9]/g, "");
    const tld = parts[1] || "com";
    const keywords = extractKeywords(domain);

    // Score all comps and filter to relevant ones
    const scored: ScoredComp[] = allComps
      .map((sale) => ({ sale, relevance: scoreRelevance(sale, tld, name.length, keywords) }))
      .filter((s) => s.relevance >= 0.3)
      .sort((a, b) => b.relevance - a.relevance)
      .slice(0, 15); // top 15 most relevant

    if (scored.length < 3) return noAnchor;

    // Weighted median: use relevance as weight
    const totalWeight = scored.reduce((s, c) => s + c.relevance, 0);
    const weightedPrices = scored.map((c) => ({
      price: c.sale.sale_price,
      weight: c.relevance / totalWeight,
    }));
    weightedPrices.sort((a, b) => a.price - b.price);

    let cumWeight = 0;
    let compMedian = weightedPrices[0].price;
    for (const wp of weightedPrices) {
      cumWeight += wp.weight;
      if (cumWeight >= 0.5) {
        compMedian = wp.price;
        break;
      }
    }

    // Calculate the midpoint of the algo band
    const algoMid = (baseVal.valueMin + baseVal.valueMax) / 2;

    // Blend: 60% algo, 40% comp anchor (conservative)
    const blendedMid = algoMid * 0.6 + compMedian * 0.4;
    const adjustment = blendedMid / algoMid;

    // Clamp adjustment to avoid wild swings (0.5x to 3x)
    const clampedAdj = Math.max(0.5, Math.min(3.0, adjustment));

    const newMin = Math.round(baseVal.valueMin * clampedAdj);
    const newMax = Math.round(baseVal.valueMax * clampedAdj);

    // Tighten band
    const maxSpread = newMin >= 100000 ? 5 : 3;
    const finalMax = newMax > newMin * maxSpread ? Math.round(newMin * maxSpread) : newMax;

    return {
      band: `$${newMin.toLocaleString()} – $${finalMax.toLocaleString()}`,
      score: baseVal.score,
      valueMin: newMin,
      valueMax: finalMax,
      compAnchored: true,
      compMedian: Math.round(compMedian),
      compCount: scored.length,
      anchorAdjustment: Math.round(clampedAdj * 100) / 100,
    };
  } catch (err) {
    console.warn("Comparable anchoring failed, using base valuation:", err);
    return noAnchor;
  }
}

/** Invalidate the cached comps (e.g., after adding new sales) */
export function invalidateCompCache() {
  cachedComps = null;
  cachedAt = 0;
}
