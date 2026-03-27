import { describe, it } from "vitest";
import { quickValuation } from "../src/lib/domainValuation";

describe("STRESS", () => {
  it("outputs", () => {
    const domains = ["Data.com","CarInsuranceQuotes.com","AIWorkflowHub.com","Zentra.io","CloudMetrics.com","BestCryptoAIPlatformHub.com"];
    for (const d of domains) {
      const v = quickValuation(d);
      console.log(`${d.padEnd(30)} Score:${String(v.score).padStart(3)} Retail:${v.band.padEnd(30)} Wholesale:${v.wholesaleBand.padEnd(22)} Liq:${String(v.liquidityScore).padStart(3)} Conf:${v.confidencePct}% Buyer:${v.sellability.buyerType}(${v.sellability.buyerPool})`);
    }
  });
});
