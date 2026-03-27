import { describe, it, expect } from "vitest";
import { quickValuation } from "@/lib/domainValuation";

describe("Stress Test - ChatGPT domains", () => {
  const cases = [
    { domain: "Data.com", label: "Ultra-premium single dict .com" },
    { domain: "CarInsuranceQuotes.com", label: "3-word keyword EMD" },
    { domain: "AIWorkflowHub.com", label: "Trend-heavy 3-word" },
    { domain: "Zentra.io", label: "Clean brandable .io" },
    { domain: "CloudMetrics.com", label: "Solid 2-word .com" },
    { domain: "BestCryptoAIPlatformHub.com", label: "Junk spam" },
  ];

  for (const c of cases) {
    it(`${c.label}: ${c.domain}`, () => {
      const r = quickValuation(c.domain);
      console.log(`${c.domain}: score=${r.score} retail=${r.band} wholesale=${r.wholesaleBand} liq=${r.liquidityScore} conf=${r.confidence}`);
      expect(r.score).toBeGreaterThanOrEqual(0);
      expect(r.score).toBeLessThanOrEqual(100);
    });
  }
});
