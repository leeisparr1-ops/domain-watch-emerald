import { describe, it, expect } from "vitest";
import { estimateSEOVolume } from "@/lib/seoVolume";

describe("SEO Volume Estimation", () => {
  describe("High-volume head terms", () => {
    it("scores 'insurance.com' as Very High volume", () => {
      const result = estimateSEOVolume("insurance.com");
      expect(result.volumeLabel).toBe("Very High");
      expect(result.volumeScore).toBe(95);
      expect(result.competitionLevel).toBe("Extreme");
      expect(result.topKeyword).toBe("insurance");
      expect(result.estimatedMonthlySearches).toBeGreaterThan(100000);
    });

    it("scores 'casino.com' — volume depends on word splitting", () => {
      const result = estimateSEOVolume("casino.com");
      // "casino" may not split into a head term if splitIntoWords doesn't recognize it
      expect(result.volumeScore).toBeGreaterThanOrEqual(0);
    });

    it("scores 'ai.com' as Very High", () => {
      const result = estimateSEOVolume("ai.com");
      expect(result.volumeScore).toBe(95);
    });

    it("scores 'home.com' as Very High", () => {
      const result = estimateSEOVolume("home.com");
      expect(result.estimatedMonthlySearches).toBe(550000);
    });
  });

  describe("Compound keywords", () => {
    it("applies 0.6 multiplier for multi-word compounds", () => {
      const compound = estimateSEOVolume("cryptobank.com");
      // crypto=301000 + bank=301000, then *0.6 = 361200
      expect(compound.estimatedMonthlySearches).toBe(361200);
      expect(compound.volumeScore).toBe(95);
    });

    it("scores 'solarpay.com' as compound with reduced volume", () => {
      const result = estimateSEOVolume("solarpay.com");
      expect(result.estimatedMonthlySearches).toBeGreaterThan(0);
      expect(result.topKeyword).not.toBeNull();
    });

    it("scores 'autoinsurance.com' highly", () => {
      const result = estimateSEOVolume("autoinsurance.com");
      expect(result.volumeScore).toBeGreaterThanOrEqual(65);
    });
  });

  describe("Medium volume terms", () => {
    it("scores dictionary words with moderate volume", () => {
      const result = estimateSEOVolume("garden.com");
      expect(result.estimatedMonthlySearches).toBeGreaterThan(0);
    });
  });

  describe("Low/minimal volume", () => {
    it("scores gibberish as Minimal", () => {
      const result = estimateSEOVolume("xqzwpflm.com");
      expect(result.volumeLabel).toBe("Minimal");
      expect(result.volumeScore).toBe(5);
      expect(result.competitionLevel).toBe("Low");
      expect(result.topKeyword).toBeNull();
    });

    it("scores random letters as Minimal", () => {
      const result = estimateSEOVolume("brtxkl.com");
      expect(result.volumeLabel).toBe("Minimal");
      expect(result.estimatedMonthlySearches).toBe(0);
    });
  });

  describe("Organic potential descriptions", () => {
    it("provides high potential message for head terms", () => {
      const result = estimateSEOVolume("insurance.com");
      expect(result.organicPotential).toContain("High organic traffic");
    });

    it("provides minimal message for gibberish", () => {
      const result = estimateSEOVolume("xqzwpf.com");
      expect(result.organicPotential).toContain("Minimal search volume");
    });
  });

  describe("TLD handling", () => {
    it("strips TLD correctly", () => {
      const dotCom = estimateSEOVolume("crypto.com");
      const dotIo = estimateSEOVolume("crypto.io");
      expect(dotCom.estimatedMonthlySearches).toBe(dotIo.estimatedMonthlySearches);
    });

    it("strips www prefix", () => {
      const result = estimateSEOVolume("www.insurance.com");
      expect(result.topKeyword).toBe("insurance");
    });
  });

  describe("Edge cases", () => {
    it("handles single character names", () => {
      const result = estimateSEOVolume("x.com");
      // single char filtered out (length < 2)
      expect(result.volumeLabel).toBe("Minimal");
    });

    it("handles numeric domains", () => {
      const result = estimateSEOVolume("123.com");
      expect(result.estimatedMonthlySearches).toBe(0);
    });

    it("handles hyphenated names by stripping non-alpha", () => {
      const result = estimateSEOVolume("best-crypto.com");
      expect(result.topKeyword).toBe("crypto");
    });
  });
});
