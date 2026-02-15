import { describe, it, expect } from "vitest";
import {
  splitIntoWords,
  isFullyCoveredByWords,
  getSemanticSynergyBonus,
  quickValuation,
  DICTIONARY_WORDS,
} from "@/lib/domainValuation";

describe("Compound Word Valuation Improvements", () => {
  describe("Dictionary coverage", () => {
    it("includes 'opus' in DICTIONARY_WORDS", () => {
      expect(DICTIONARY_WORDS.has("opus")).toBe(true);
    });

    it("includes Latin/brandable words", () => {
      for (const word of ["apex", "nexus", "axis", "flux", "genesis", "zenith"]) {
        expect(DICTIONARY_WORDS.has(word)).toBe(true);
      }
    });
  });

  describe("Word segmentation", () => {
    it("splits 'opusgrowth' into 'opus' + 'growth'", () => {
      const words = splitIntoWords("opusgrowth");
      expect(words).toContain("opus");
      expect(words).toContain("growth");
    });

    it("splits 'chainalysis' into 'chain' + 'analysis' (portmanteau)", () => {
      const words = splitIntoWords("chainalysis");
      expect(words).toContain("chain");
      expect(words).toContain("analysis");
    });
  });

  describe("isFullyCoveredByWords", () => {
    it("returns true for exact tiling: opusgrowth", () => {
      expect(isFullyCoveredByWords("opusgrowth", ["opus", "growth"])).toBe(true);
    });

    it("returns true for portmanteau: chainalysis (chain+analysis overlap)", () => {
      // "chain" (5) + "analysis" (8) = 13 chars for 11-char name
      expect(isFullyCoveredByWords("chainalysis", ["chain", "analysis"])).toBe(true);
    });

    it("returns false for no words", () => {
      expect(isFullyCoveredByWords("xyzqwk", [])).toBe(false);
    });
  });

  describe("Semantic synergy bonus", () => {
    it("detects synergy for chain + analysis", () => {
      const { bonus } = getSemanticSynergyBonus(["chain", "analysis"]);
      expect(bonus).toBeGreaterThan(1.0);
    });

    it("detects synergy for opus + growth", () => {
      const { bonus } = getSemanticSynergyBonus(["opus", "growth"]);
      expect(bonus).toBeGreaterThan(1.0);
    });

    it("detects synergy for data + flow", () => {
      const { bonus } = getSemanticSynergyBonus(["data", "flow"]);
      expect(bonus).toBeGreaterThan(1.0);
    });

    it("returns 1.0 for unrelated words", () => {
      const { bonus } = getSemanticSynergyBonus(["pizza", "ladder"]);
      expect(bonus).toBe(1.0);
    });
  });

  describe("Valuation improvements", () => {
    it("values opusgrowth.com significantly higher than $50-$150", () => {
      const result = quickValuation("opusgrowth.com");
      expect(result.valueMin).toBeGreaterThanOrEqual(2000);
    });

    it("values chainalysis.io significantly higher than $50-$150", () => {
      const result = quickValuation("chainalysis.io");
      expect(result.valueMin).toBeGreaterThanOrEqual(1000);
    });

    it("values cloudbank.com as premium two-word brandable", () => {
      const result = quickValuation("cloudbank.com");
      expect(result.valueMin).toBeGreaterThanOrEqual(10000);
    });

    it("values dataflow.com as premium two-word brandable", () => {
      const result = quickValuation("dataflow.com");
      expect(result.valueMin).toBeGreaterThanOrEqual(10000);
    });

    it("values smartpay.com highly (dual trending + synergy)", () => {
      const result = quickValuation("smartpay.com");
      expect(result.valueMin).toBeGreaterThanOrEqual(15000);
    });
  });
});
