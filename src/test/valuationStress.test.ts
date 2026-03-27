import { describe, it, expect } from "vitest";
import { quickValuation } from "@/lib/domainValuation";

/**
 * 100+ Stress-Test Regression Suite for the Domain Valuation Engine.
 * Covers: 2-letter .com, 3-letter .com, single dictionary words,
 * brandables, 2-word compounds, 3-word EMDs, 4-word spam, numeric,
 * hyphenated, non-.com TLDs, gibberish, tier-0 elite, penalty, etc.
 */

// ─── HELPER ───
function val(domain: string) {
  return quickValuation(domain);
}

describe("Valuation Stress-Test Regression Suite", () => {

  // ══════════════════════════════════════════════
  //  TIER 1: ULTRA-SHORT .COM (2-3 letters)
  // ══════════════════════════════════════════════
  describe("2-letter .com", () => {
    it("AI.com — ultra-premium 2L", () => {
      const r = val("ai.com");
      // 2-letter non-dictionary .com — short .com length premium applies
      expect(r.valueMin).toBeGreaterThanOrEqual(5000);
      expect(r.score).toBeGreaterThanOrEqual(60);
    });

    it("QZ.com — non-dictionary 2L", () => {
      const r = val("qz.com");
      // Short .com length premium gives boost but not a dictionary word
      expect(r.valueMin).toBeGreaterThanOrEqual(100);
    });

    it("IO.com — dictionary 2L", () => {
      const r = val("io.com");
      // "io" is not in dictionary — treated as 2-char non-dict
      expect(r.valueMin).toBeGreaterThanOrEqual(100);
    });
  });

  describe("3-letter .com", () => {
    it("BET.com — premium 3L", () => {
      const r = val("bet.com");
      expect(r.valueMin).toBeGreaterThanOrEqual(200000);
    });

    it("ZAP.com — dictionary 3L", () => {
      const r = val("zap.com");
      expect(r.valueMin).toBeGreaterThanOrEqual(100000);
    });

    it("XQJ.com — random 3L", () => {
      const r = val("xqj.com");
      expect(r.valueMin).toBeGreaterThanOrEqual(50);
      expect(r.valueMax).toBeLessThanOrEqual(50000);
    });
  });

  // ══════════════════════════════════════════════
  //  TIER 2: SINGLE DICTIONARY WORD .COM
  // ══════════════════════════════════════════════
  describe("Single dictionary word .com", () => {
    it("Fire.com — elite 4-letter", () => {
      const r = val("fire.com");
      // "fire" is in ELITE_WORDS — should get tier-0 boost
      expect(r.valueMin).toBeGreaterThanOrEqual(100000);
    });

    it("Data.com — tier-0 elite", () => {
      const r = val("data.com");
      expect(r.valueMin).toBeGreaterThanOrEqual(500000);
    });

    it("Cloud.com — tier-0 elite", () => {
      const r = val("cloud.com");
      expect(r.valueMin).toBeGreaterThanOrEqual(400000);
    });

    it("Energy.com — 6-letter dictionary", () => {
      const r = val("energy.com");
      expect(r.valueMin).toBeGreaterThanOrEqual(15000);
    });

    it("Diamond.com — 7-letter dictionary", () => {
      const r = val("diamond.com");
      expect(r.valueMin).toBeGreaterThanOrEqual(10000);
    });

    it("Furniture.com — 9-letter dictionary", () => {
      const r = val("furniture.com");
      expect(r.valueMin).toBeGreaterThanOrEqual(4000);
    });

    it("Rare.com — 4-letter dictionary", () => {
      const r = val("rare.com");
      expect(r.valueMin).toBeGreaterThanOrEqual(50000);
    });
  });

  // ══════════════════════════════════════════════
  //  TIER 3: SINGLE DICTIONARY NON-.COM
  // ══════════════════════════════════════════════
  describe("Single dictionary word .io / .ai", () => {
    it("Stack.io — premium keyword .io", () => {
      const r = val("stack.io");
      expect(r.valueMin).toBeGreaterThanOrEqual(500);
      expect(r.valueMax).toBeLessThanOrEqual(50000);
    });

    it("Trade.ai — premium keyword .ai", () => {
      const r = val("trade.ai");
      expect(r.valueMin).toBeGreaterThanOrEqual(500);
    });

    it("Moon.io — dictionary .io", () => {
      const r = val("moon.io");
      expect(r.valueMin).toBeGreaterThanOrEqual(200);
    });

    it("Nexus.ai — brandable .ai", () => {
      const r = val("nexus.ai");
      expect(r.valueMin).toBeGreaterThanOrEqual(300);
    });
  });

  // ══════════════════════════════════════════════
  //  TIER 4: TWO-WORD COMPOUNDS .COM
  // ══════════════════════════════════════════════
  describe("Two-word compound .com", () => {
    it("CloudBank.com — both dict + premium + trending", () => {
      const r = val("cloudbank.com");
      expect(r.valueMin).toBeGreaterThanOrEqual(5000);
    });

    it("DataFlow.com — premium synergy", () => {
      const r = val("dataflow.com");
      expect(r.valueMin).toBeGreaterThanOrEqual(5000);
    });

    it("SmartPay.com — premium combo", () => {
      const r = val("smartpay.com");
      expect(r.valueMin).toBeGreaterThanOrEqual(5000);
    });

    it("BrightPath.com — dictionary combo", () => {
      const r = val("brightpath.com");
      expect(r.valueMin).toBeGreaterThanOrEqual(1000);
    });

    it("IronGate.com — concrete nouns", () => {
      const r = val("irongate.com");
      expect(r.valueMin).toBeGreaterThanOrEqual(1000);
    });

    it("GreenLeaf.com — nature compound", () => {
      const r = val("greenleaf.com");
      expect(r.valueMin).toBeGreaterThanOrEqual(1000);
    });

    it("PinkLemon.com — dictionary combo", () => {
      const r = val("pinklemon.com");
      expect(r.valueMin).toBeGreaterThanOrEqual(500);
    });

    it("NightOwl.com — creative compound", () => {
      const r = val("nightowl.com");
      expect(r.valueMin).toBeGreaterThanOrEqual(1000);
    });

    it("BlueWave.com — adjective + noun", () => {
      const r = val("bluewave.com");
      expect(r.valueMin).toBeGreaterThanOrEqual(1000);
    });

    it("SilverKey.com — brandable compound", () => {
      const r = val("silverkey.com");
      expect(r.valueMin).toBeGreaterThanOrEqual(500);
    });
  });

  // ══════════════════════════════════════════════
  //  TIER 5: TWO-WORD COMPOUNDS NON-.COM
  // ══════════════════════════════════════════════
  describe("Two-word compound .io / .ai", () => {
    it("DataFlow.io — premium compound .io", () => {
      const r = val("dataflow.io");
      expect(r.valueMin).toBeGreaterThanOrEqual(300);
    });

    it("CloudMetrics.ai — premium .ai compound", () => {
      const r = val("cloudmetrics.ai");
      expect(r.valueMin).toBeGreaterThanOrEqual(300);
    });

    it("ChainAnalysis.io — portmanteau .io", () => {
      const r = val("chainalysis.io");
      expect(r.valueMin).toBeGreaterThanOrEqual(500);
    });
  });

  // ══════════════════════════════════════════════
  //  TIER 6: THREE-WORD DOMAINS (PENALIZED)
  // ══════════════════════════════════════════════
  describe("Three-word domains", () => {
    it("AIWorkflowHub.com — 3-word trending", () => {
      const r = val("aiworkflowhub.com");
      expect(r.score).toBeLessThanOrEqual(70);
      expect(r.valueMax).toBeLessThanOrEqual(5000);
    });

    it("CloudMetricsHub.com — 3-word compound", () => {
      const r = val("cloudmetricshub.com");
      expect(r.score).toBeLessThanOrEqual(70);
    });

    it("CarInsuranceQuotes.com — 3-word high-CPC EMD", () => {
      const r = val("carinsurancequotes.com");
      // High-CPC EMD should still retain some value
      expect(r.valueMin).toBeGreaterThanOrEqual(50);
    });

    it("BestOnlineDeals.com — 3-word generic", () => {
      const r = val("bestonlinedeals.com");
      expect(r.score).toBeLessThanOrEqual(65);
    });

    it("RedFireTruck.com — 3-word generic nouns", () => {
      const r = val("redfiretruck.com");
      expect(r.score).toBeLessThanOrEqual(60);
    });
  });

  // ══════════════════════════════════════════════
  //  TIER 7: FOUR+ WORD SPAM DOMAINS
  // ══════════════════════════════════════════════
  describe("Four+ word spam domains", () => {
    it("BestCryptoAIPlatformHub.com — 5-word spam", () => {
      const r = val("bestcryptoaiplatformhub.com");
      expect(r.score).toBeLessThanOrEqual(10);
      expect(r.valueMax).toBeLessThanOrEqual(50);
    });

    it("BuyOnlineShopDeals.com — 4-word spam", () => {
      const r = val("buyonlineshopdeals.com");
      expect(r.score).toBeLessThanOrEqual(10);
      expect(r.valueMax).toBeLessThanOrEqual(50);
    });

    it("TopBestCheapAutoInsurance.com — 5-word spam", () => {
      const r = val("topbestcheapautoinsurance.com");
      expect(r.score).toBeLessThanOrEqual(10);
      expect(r.valueMax).toBeLessThanOrEqual(50);
    });

    it("FreeOnlineDataCloudTools.com — 5-word spam", () => {
      const r = val("freeonlinedatacloudtools.com");
      expect(r.score).toBeLessThanOrEqual(10);
      expect(r.valueMax).toBeLessThanOrEqual(50);
    });
  });

  // ══════════════════════════════════════════════
  //  TIER 8: NUMERIC DOMAINS
  // ══════════════════════════════════════════════
  describe("Numeric domains", () => {
    it("888.com — premium 3N", () => {
      const r = val("888.com");
      expect(r.valueMin).toBeGreaterThanOrEqual(100);
    });

    it("42.com — premium 2N", () => {
      const r = val("42.com");
      // Numeric 2-char — gets short .com length premium
      expect(r.valueMin).toBeGreaterThanOrEqual(100);
    });

    it("7777.com — repeating 4N", () => {
      const r = val("7777.com");
      expect(r.valueMin).toBeGreaterThanOrEqual(50);
    });

    it("123456789.com — long numeric junk", () => {
      const r = val("123456789.com");
      expect(r.valueMax).toBeLessThanOrEqual(500);
    });

    it("839274610384.com — random long numeric", () => {
      const r = val("839274610384.com");
      expect(r.valueMax).toBeLessThanOrEqual(50);
    });
  });

  // ══════════════════════════════════════════════
  //  TIER 9: HYPHENATED DOMAINS
  // ══════════════════════════════════════════════
  describe("Hyphenated domains", () => {
    it("smart-pay.com — good hyphened compound", () => {
      const r = val("smart-pay.com");
      expect(r.valueMin).toBeGreaterThanOrEqual(200);
      // But always less than non-hyphenated version
      const nonHyphen = val("smartpay.com");
      expect(r.valueMin).toBeLessThan(nonHyphen.valueMin);
    });

    it("cloud-bank.com — premium hyphened", () => {
      const r = val("cloud-bank.com");
      expect(r.valueMin).toBeGreaterThanOrEqual(100);
    });

    it("x-y-z.com — triple-hyphen junk", () => {
      const r = val("x-y-z.com");
      expect(r.valueMax).toBeLessThanOrEqual(500);
    });

    it("best-cheap-auto-deals.com — spammy hyphen", () => {
      const r = val("best-cheap-auto-deals.com");
      expect(r.valueMax).toBeLessThanOrEqual(500);
    });
  });

  // ══════════════════════════════════════════════
  //  TIER 10: BRANDABLE / COINED NAMES
  // ══════════════════════════════════════════════
  describe("Brandable / coined names", () => {
    it("Zentra.com — pronounceable coined", () => {
      const r = val("zentra.com");
      expect(r.valueMin).toBeGreaterThanOrEqual(200);
    });

    it("Lunari.com — brandable suffix", () => {
      const r = val("lunari.com");
      expect(r.valueMin).toBeGreaterThanOrEqual(100);
    });

    it("Fiora.com — short brandable", () => {
      const r = val("fiora.com");
      expect(r.valueMin).toBeGreaterThanOrEqual(200);
    });

    it("Quix.io — 4-letter coined .io", () => {
      const r = val("quix.io");
      expect(r.valueMin).toBeGreaterThanOrEqual(50);
    });

    it("Xyllo.com — pronounceable 5L", () => {
      const r = val("xyllo.com");
      expect(r.valueMin).toBeGreaterThanOrEqual(50);
    });
  });

  // ══════════════════════════════════════════════
  //  TIER 11: GIBBERISH / JUNK
  // ══════════════════════════════════════════════
  describe("Gibberish and junk", () => {
    it("xyzqwkrthm.com — consonant soup", () => {
      const r = val("xyzqwkrthm.com");
      expect(r.valueMax).toBeLessThanOrEqual(50);
    });

    it("asdfghjklqwerty.com — keyboard mash", () => {
      const r = val("asdfghjklqwerty.com");
      expect(r.valueMax).toBeLessThanOrEqual(50);
    });

    it("blorpsnazzle.com — made-up gibberish", () => {
      const r = val("blorpsnazzle.com");
      expect(r.valueMax).toBeLessThanOrEqual(50);
    });

    it("qwmfkpayxzl.com — word buried in gibberish", () => {
      const r = val("qwmfkpayxzl.com");
      expect(r.valueMax).toBeLessThanOrEqual(50);
    });

    it("aaabbbbcccdddd.com — repetitive noise", () => {
      const r = val("aaabbbbcccdddd.com");
      expect(r.valueMax).toBeLessThanOrEqual(50);
    });
  });

  // ══════════════════════════════════════════════
  //  TIER 12: PENALTY / TRADEMARK
  // ══════════════════════════════════════════════
  describe("Penalty and trademark domains", () => {
    it("viagra-pills.com — penalty content", () => {
      const r = val("viagra-pills.com");
      expect(r.valueMax).toBeLessThanOrEqual(50);
      expect(r.score).toBeLessThanOrEqual(10);
    });

    it("buycialis.com — penalty content", () => {
      const r = val("buycialis.com");
      expect(r.valueMax).toBeLessThanOrEqual(50);
    });

    it("googlemaps.com — exact trademark", () => {
      const r = val("googlemaps.com");
      expect(r.score).toBeLessThanOrEqual(50);
    });

    it("applestore.com — TM-heavy brand", () => {
      const r = val("applestore.com");
      expect(r.score).toBeLessThanOrEqual(50);
    });

    it("teslacharger.com — TM medium", () => {
      const r = val("teslacharger.com");
      expect(r.score).toBeLessThanOrEqual(60);
    });
  });

  // ══════════════════════════════════════════════
  //  TIER 13: EMD / HIGH-CPC KEYWORDS
  // ══════════════════════════════════════════════
  describe("Exact-match / high-CPC keyword domains", () => {
    it("Insurance.com — single EMD", () => {
      const r = val("insurance.com");
      expect(r.valueMin).toBeGreaterThanOrEqual(50000);
    });

    it("Mortgage.com — single EMD", () => {
      const r = val("mortgage.com");
      expect(r.valueMin).toBeGreaterThanOrEqual(20000);
    });

    it("Lawyer.com — premium keyword", () => {
      const r = val("lawyer.com");
      expect(r.valueMin).toBeGreaterThanOrEqual(10000);
    });

    it("AutoInsurance.com — 2-word EMD", () => {
      const r = val("autoinsurance.com");
      expect(r.valueMin).toBeGreaterThanOrEqual(5000);
    });

    it("CreditCards.com — 2-word EMD high-CPC", () => {
      const r = val("creditcards.com");
      expect(r.valueMin).toBeGreaterThanOrEqual(3000);
    });
  });

  // ══════════════════════════════════════════════
  //  TIER 14: EXOTIC / NICHE TLDs
  // ══════════════════════════════════════════════
  describe("Exotic TLDs", () => {
    it("Cloud.dev — premium keyword .dev", () => {
      const r = val("cloud.dev");
      expect(r.valueMin).toBeGreaterThanOrEqual(200);
    });

    it("Pay.app — premium keyword .app", () => {
      const r = val("pay.app");
      expect(r.valueMin).toBeGreaterThanOrEqual(200);
    });

    it("DataFlow.xyz — 2-word .xyz", () => {
      const r = val("dataflow.xyz");
      expect(r.valueMin).toBeGreaterThanOrEqual(20);
      expect(r.valueMax).toBeLessThanOrEqual(5000);
    });

    it("Crypto.gg — premium .gg", () => {
      const r = val("crypto.gg");
      expect(r.valueMin).toBeGreaterThanOrEqual(100);
    });

    it("SmartHome.co — 2-word .co", () => {
      const r = val("smarthome.co");
      expect(r.valueMin).toBeGreaterThanOrEqual(200);
    });
  });

  // ══════════════════════════════════════════════
  //  TIER 15: EDGE CASES & MIXED SIGNALS
  // ══════════════════════════════════════════════
  describe("Edge cases", () => {
    it("A.com — single-letter", () => {
      const r = val("a.com");
      expect(r.valueMin).toBeGreaterThanOrEqual(5000);
    });

    it("4.com — single-digit", () => {
      const r = val("4.com");
      expect(r.valueMin).toBeGreaterThanOrEqual(5000);
    });

    it("The.com — common word", () => {
      const r = val("the.com");
      expect(r.valueMin).toBeGreaterThanOrEqual(100000);
    });

    it("Go.com — 2-letter dictionary", () => {
      const r = val("go.com");
      expect(r.valueMin).toBeGreaterThanOrEqual(50000);
    });

    it("ABCDEFGHIJKLMNOP.com — 16-letter nonsense", () => {
      const r = val("abcdefghijklmnop.com");
      expect(r.valueMax).toBeLessThanOrEqual(50);
    });

    it("a1b2c3d4.com — alphanumeric mix", () => {
      const r = val("a1b2c3d4.com");
      expect(r.valueMax).toBeLessThanOrEqual(500);
    });

    it("www-test.com — www prefix stripped", () => {
      const r = val("www.test.com");
      // Should evaluate "test.com" not "www"
      expect(r.valueMin).toBeGreaterThanOrEqual(5000);
    });
  });

  // ══════════════════════════════════════════════
  //  TIER 16: WHOLESALE vs RETAIL CONSISTENCY
  // ══════════════════════════════════════════════
  describe("Wholesale vs Retail consistency", () => {
    it("Wholesale always <= Retail", () => {
      const domains = ["cloud.com", "smartpay.com", "xyzqwk.com", "dataflow.io", "bet.com"];
      for (const d of domains) {
        const r = val(d);
        expect(r.wholesaleMin).toBeLessThanOrEqual(r.valueMin);
        expect(r.wholesaleMax).toBeLessThanOrEqual(r.valueMax);
      }
    });

    it("High-liquidity domains have higher wholesale ratio", () => {
      const highLiq = val("data.com");
      const lowLiq = val("xyzqwkrthm.com");
      // Liquid domains = higher wholesale/retail ratio
      expect(highLiq.liquidityScore).toBeGreaterThan(lowLiq.liquidityScore);
    });
  });

  // ══════════════════════════════════════════════
  //  TIER 17: SELLABILITY & CONFIDENCE
  // ══════════════════════════════════════════════
  describe("Sellability and confidence", () => {
    it("Elite .com has Enterprise buyerType", () => {
      const r = val("data.com");
      expect(r.sellability.buyerType).toBe("Enterprise");
    });

    it("3-word domain has Speculative buyerType", () => {
      const r = val("aiworkflowhub.com");
      expect(r.sellability.buyerType).toBe("Speculative");
    });

    it("Dictionary .com has high confidence", () => {
      const r = val("fire.com");
      expect(r.confidencePct).toBeGreaterThanOrEqual(60);
    });

    it("Gibberish has low confidence", () => {
      const r = val("xyzqwkrthm.com");
      expect(r.confidencePct).toBeLessThanOrEqual(25);
    });

    it("Two-word compound has strengths listed", () => {
      const r = val("cloudbank.com");
      expect(r.sellability.strengths.length).toBeGreaterThan(0);
    });
  });

  // ══════════════════════════════════════════════
  //  TIER 18: RELATIVE VALUE ORDERING
  // ══════════════════════════════════════════════
  describe("Relative value ordering", () => {
    it(".com > .io > .xyz for same word", () => {
      const com = val("cloud.com");
      const io = val("cloud.io");
      const xyz = val("cloud.xyz");
      expect(com.valueMin).toBeGreaterThan(io.valueMin);
      expect(io.valueMin).toBeGreaterThan(xyz.valueMin);
    });

    it("Shorter > longer for same quality", () => {
      const short = val("pay.com");
      const long = val("payment.com");
      expect(short.valueMin).toBeGreaterThan(long.valueMin);
    });

    it("Dictionary word > gibberish for same length", () => {
      const dict = val("fire.com");
      const junk = val("qxzw.com");
      expect(dict.valueMin).toBeGreaterThan(junk.valueMin);
    });

    it("Non-hyphen > hyphen for same words", () => {
      const clean = val("cloudbank.com");
      const hyphen = val("cloud-bank.com");
      expect(clean.valueMin).toBeGreaterThan(hyphen.valueMin);
    });

    it("1-word > 2-word > 3-word for premium keywords", () => {
      const one = val("cloud.com");
      const two = val("cloudbank.com");
      const three = val("cloudbankhub.com");
      expect(one.valueMin).toBeGreaterThan(two.valueMin);
      expect(two.valueMin).toBeGreaterThan(three.valueMin);
    });
  });

  // ══════════════════════════════════════════════
  //  TIER 19: SCORE SANITY BOUNDS
  // ══════════════════════════════════════════════
  describe("Score bounds", () => {
    it("All scores between 1 and 100", () => {
      const domains = [
        "data.com", "xyzqwk.com", "cloudbank.com", "888.com",
        "smart-pay.com", "bestcryptoaiplatformhub.com",
        "insurance.com", "quix.io", "a.com", "fire.com",
      ];
      for (const d of domains) {
        const r = val(d);
        expect(r.score).toBeGreaterThanOrEqual(1);
        expect(r.score).toBeLessThanOrEqual(100);
        expect(r.valueMin).toBeGreaterThanOrEqual(0);
        expect(r.valueMax).toBeGreaterThanOrEqual(r.valueMin);
        expect(r.confidencePct).toBeGreaterThanOrEqual(10);
        expect(r.confidencePct).toBeLessThanOrEqual(95);
      }
    });
  });
});
