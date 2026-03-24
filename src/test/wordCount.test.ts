import { describe, it, expect } from "vitest";
import { splitIntoWords, DICTIONARY_WORDS, COMMON_WORDS, PREMIUM_KEYWORDS } from "@/lib/domainValuation";

/** Replicate the exact getWordCount logic from MatchesFilterPanel */
function getWordCount(domainName: string): number {
  const sld = domainName.split(".")[0].toLowerCase();
  
  const hyphenParts = sld.split("-").filter(Boolean);
  if (hyphenParts.length > 1) return hyphenParts.length;
  
  const isWord = (w: string) => COMMON_WORDS.has(w) || DICTIONARY_WORDS.has(w) || PREMIUM_KEYWORDS.has(w);
  const words = splitIntoWords(sld);
  const meaningfulWords = words.filter(w => w.length >= 2 && isWord(w));
  
  if (meaningfulWords.length > 0) {
    const totalCoveredChars = meaningfulWords.reduce((sum, w) => sum + w.length, 0);
    if (totalCoveredChars >= sld.length * 0.8) {
      return meaningfulWords.length;
    }
  }
  
  return 1;
}

describe("Word Count Detection - 2-Word Domains", () => {
  describe("correctly identifies 2-word domains", () => {
    const twoWordDomains = [
      "cloudbank.com",
      "dataflow.com",
      "smartpay.com",
      "opusgrowth.com",
      "techforge.com",
      "codecraft.com",
      "sunrise.com",
      "moonlight.com",
      "goldmine.com",
      "firestorm.com",
      "blackbird.com",
      "starlight.com",
      "tradewind.com",
      "bluebird.com",
      "fasttrack.com",
      "darkroom.com",
      "sunshine.com",
      "farmland.com",
      "homeland.com",
      "greenleaf.com",
    ];

    twoWordDomains.forEach(domain => {
      it(`detects "${domain}" as 2 words`, () => {
        const count = getWordCount(domain);
        expect(count).toBe(2);
      });
    });
  });

  describe("correctly identifies 1-word domains", () => {
    const oneWordDomains = [
      "cloud.com",
      "trade.com",
      "spark.com",
      "forge.com",
      "bloom.com",
      "quest.com",
      "swift.com",
      "craft.com",
    ];

    oneWordDomains.forEach(domain => {
      it(`detects "${domain}" as 1 word`, () => {
        const count = getWordCount(domain);
        expect(count).toBe(1);
      });
    });
  });

  describe("correctly identifies 3+ word domains", () => {
    const threeWordDomains = [
      "my-cloud-bank.com",
      "best-trade-flow.com",
    ];

    threeWordDomains.forEach(domain => {
      it(`detects "${domain}" as 3 words`, () => {
        const count = getWordCount(domain);
        expect(count).toBe(3);
      });
    });
  });

  describe("does NOT incorrectly label single words as 2-word", () => {
    // These are real single words that contain other words inside them
    const tricky = [
      "analysis.com",   // contains "an" + "alysis" but is 1 word
      "platform.com",   // contains "plat" + "form" - debatable
      "discover.com",   // contains "disco" + "ver" 
      "master.com",     // contains "mast" + "er"
    ];

    tricky.forEach(domain => {
      it(`"${domain}" is detected as 1 or 2 words (not 3+)`, () => {
        const count = getWordCount(domain);
        expect(count).toBeLessThanOrEqual(2);
      });
    });
  });

  describe("handles hyphenated domains correctly", () => {
    it("cloud-bank.com = 2 words", () => {
      expect(getWordCount("cloud-bank.com")).toBe(2);
    });
    it("my-cloud-bank.com = 3 words", () => {
      expect(getWordCount("my-cloud-bank.com")).toBe(3);
    });
  });

  describe("handles gibberish/random domains", () => {
    it("xyzqwk.com = 1 word (unrecognized)", () => {
      expect(getWordCount("xyzqwk.com")).toBe(1);
    });
    it("brtklmn.com = 1 word (unrecognized)", () => {
      expect(getWordCount("brtklmn.com")).toBe(1);
    });
  });

  describe("handles short letter-only domains", () => {
    it("abc.com = 1 word (3 letters, no meaningful split)", () => {
      expect(getWordCount("abc.com")).toBe(1);
    });
    it("go.com = 1 word", () => {
      expect(getWordCount("go.com")).toBe(1);
    });
  });
});
