/**
 * Real-world TLD renewal pricing data (annual, USD).
 * Sources: ICANN registrar average pricing, major registrars (Namecheap, GoDaddy, Cloudflare, Porkbun).
 * Prices reflect typical renewal costs (not promotional first-year pricing).
 * Last updated: 2026-02.
 */

export interface TldRenewalRange {
  min: number;
  max: number;
  typical: number;
}

const TLD_RENEWAL_PRICING: Record<string, TldRenewalRange> = {
  // Generic TLDs
  com: { min: 9, max: 18, typical: 13 },
  net: { min: 11, max: 20, typical: 15 },
  org: { min: 10, max: 20, typical: 14 },
  info: { min: 12, max: 25, typical: 18 },
  biz: { min: 14, max: 25, typical: 18 },
  name: { min: 10, max: 15, typical: 12 },
  pro: { min: 12, max: 20, typical: 15 },

  // Popular new gTLDs
  io: { min: 30, max: 60, typical: 45 },
  co: { min: 25, max: 38, typical: 30 },
  app: { min: 14, max: 25, typical: 18 },
  dev: { min: 12, max: 22, typical: 16 },
  ai: { min: 50, max: 100, typical: 80 },
  me: { min: 8, max: 25, typical: 18 },
  xyz: { min: 10, max: 15, typical: 12 },
  online: { min: 25, max: 45, typical: 35 },
  site: { min: 20, max: 40, typical: 30 },
  store: { min: 30, max: 55, typical: 42 },
  tech: { min: 35, max: 55, typical: 45 },
  club: { min: 10, max: 18, typical: 14 },
  live: { min: 15, max: 30, typical: 22 },
  world: { min: 20, max: 40, typical: 30 },
  blog: { min: 20, max: 35, typical: 28 },
  shop: { min: 25, max: 45, typical: 35 },
  design: { min: 35, max: 55, typical: 45 },
  cloud: { min: 15, max: 30, typical: 22 },
  digital: { min: 25, max: 45, typical: 35 },
  agency: { min: 20, max: 35, typical: 28 },
  studio: { min: 20, max: 35, typical: 28 },
  ventures: { min: 35, max: 55, typical: 45 },
  capital: { min: 35, max: 55, typical: 45 },
  fund: { min: 35, max: 55, typical: 45 },
  money: { min: 20, max: 40, typical: 30 },
  page: { min: 10, max: 18, typical: 13 },

  // Country-code TLDs
  us: { min: 8, max: 15, typical: 10 },
  uk: { min: 7, max: 12, typical: 9 },
  "co.uk": { min: 7, max: 12, typical: 9 },
  ca: { min: 10, max: 18, typical: 14 },
  de: { min: 7, max: 15, typical: 10 },
  fr: { min: 8, max: 15, typical: 11 },
  nl: { min: 7, max: 12, typical: 9 },
  eu: { min: 8, max: 15, typical: 10 },
  au: { min: 10, max: 20, typical: 15 },
  "com.au": { min: 10, max: 20, typical: 15 },
  in: { min: 8, max: 15, typical: 10 },
  jp: { min: 30, max: 50, typical: 40 },
  cn: { min: 8, max: 18, typical: 12 },
  ru: { min: 5, max: 10, typical: 7 },
  br: { min: 8, max: 15, typical: 10 },
  mx: { min: 20, max: 40, typical: 30 },
  es: { min: 8, max: 15, typical: 10 },
  it: { min: 8, max: 15, typical: 10 },
  se: { min: 15, max: 30, typical: 20 },
  ch: { min: 10, max: 20, typical: 15 },
  tv: { min: 25, max: 45, typical: 35 },
  cc: { min: 10, max: 20, typical: 15 },
  gg: { min: 50, max: 80, typical: 65 },
};

/**
 * Get the renewal price range for a TLD.
 * Returns null if the TLD is not in our dataset.
 */
export function getTldRenewalRange(tldOrDomain: string): TldRenewalRange | null {
  let tld = tldOrDomain.toLowerCase().replace(/^\./, "");

  // If it's a full domain, extract TLD
  if (tld.includes(".")) {
    const parts = tld.split(".");
    // Try compound TLD first (e.g. co.uk, com.au)
    if (parts.length >= 3) {
      const compound = parts.slice(-2).join(".");
      if (TLD_RENEWAL_PRICING[compound]) return TLD_RENEWAL_PRICING[compound];
    }
    tld = parts[parts.length - 1];
  }

  return TLD_RENEWAL_PRICING[tld] ?? null;
}
