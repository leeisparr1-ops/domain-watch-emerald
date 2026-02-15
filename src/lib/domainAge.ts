/**
 * Domain Age & History Signals Module
 * Estimates domain age value and historical context for investment decisions.
 * Uses RDAP data when available, with heuristic fallbacks.
 */

export interface DomainAgeResult {
  ageYears: number | null;
  ageLabel: string;
  ageScore: number;           // 0-100 investment value from age
  historySignal: string;      // "Established", "Seasoned", "Young", "Brand New", "Unknown"
  valueImpact: string;        // How age affects value
}

/**
 * Score domain age for investment purposes.
 * Older domains are generally more valuable (authority, backlinks, trust).
 */
export function scoreDomainAge(ageYears: number | null): DomainAgeResult {
  if (ageYears === null || ageYears === undefined) {
    return {
      ageYears: null,
      ageLabel: "Unknown",
      ageScore: 30, // neutral default
      historySignal: "Unknown",
      valueImpact: "Age unknown — cannot factor into valuation. Check WHOIS records manually.",
    };
  }

  let ageScore: number;
  let ageLabel: string;
  let historySignal: string;
  let valueImpact: string;

  if (ageYears >= 20) {
    ageScore = 95;
    ageLabel = `${ageYears}+ years`;
    historySignal = "Veteran";
    valueImpact = "20+ year domain — significant authority and trust. High premium for established backlink profiles.";
  } else if (ageYears >= 15) {
    ageScore = 85;
    ageLabel = `${ageYears} years`;
    historySignal = "Established";
    valueImpact = "15+ year domain — well-established with likely strong backlink history. Adds 20-40% to base value.";
  } else if (ageYears >= 10) {
    ageScore = 75;
    ageLabel = `${ageYears} years`;
    historySignal = "Established";
    valueImpact = "10+ year domain — good age authority. Often has indexed pages and residual SEO value.";
  } else if (ageYears >= 5) {
    ageScore = 55;
    ageLabel = `${ageYears} years`;
    historySignal = "Seasoned";
    valueImpact = "5+ years — moderate age value. May have some backlink equity and search trust.";
  } else if (ageYears >= 2) {
    ageScore = 35;
    ageLabel = `${ageYears} years`;
    historySignal = "Young";
    valueImpact = "2-5 years — limited age premium. Value comes primarily from the name itself, not history.";
  } else if (ageYears >= 1) {
    ageScore = 20;
    ageLabel = `${ageYears} year`;
    historySignal = "Young";
    valueImpact = "Under 2 years — minimal age authority. No meaningful age premium.";
  } else {
    ageScore = 10;
    ageLabel = "< 1 year";
    historySignal = "Brand New";
    valueImpact = "Brand new registration — no age value. Scoring based purely on name quality.";
  }

  return { ageYears, ageLabel, ageScore, historySignal, valueImpact };
}

/**
 * Estimate age multiplier for valuation engine.
 * Returns a multiplier to apply to the base valuation.
 */
export function getAgeMultiplier(ageYears: number | null): number {
  if (ageYears === null) return 1.0;
  if (ageYears >= 20) return 1.4;
  if (ageYears >= 15) return 1.3;
  if (ageYears >= 10) return 1.2;
  if (ageYears >= 5) return 1.1;
  return 1.0;
}
