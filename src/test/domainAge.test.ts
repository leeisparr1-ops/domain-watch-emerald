import { describe, it, expect } from "vitest";
import { scoreDomainAge, getAgeMultiplier } from "@/lib/domainAge";

describe("Domain Age Scoring", () => {
  describe("scoreDomainAge", () => {
    it("scores 20+ year domains as Veteran with 95", () => {
      const result = scoreDomainAge(25);
      expect(result.ageScore).toBe(95);
      expect(result.historySignal).toBe("Veteran");
      expect(result.ageLabel).toBe("25+ years");
    });

    it("scores 15-19 year domains as Established with 85", () => {
      const result = scoreDomainAge(17);
      expect(result.ageScore).toBe(85);
      expect(result.historySignal).toBe("Established");
    });

    it("scores 10-14 year domains as Established with 75", () => {
      const result = scoreDomainAge(12);
      expect(result.ageScore).toBe(75);
      expect(result.historySignal).toBe("Established");
    });

    it("scores 5-9 year domains as Seasoned with 55", () => {
      const result = scoreDomainAge(7);
      expect(result.ageScore).toBe(55);
      expect(result.historySignal).toBe("Seasoned");
    });

    it("scores 2-4 year domains as Young with 35", () => {
      const result = scoreDomainAge(3);
      expect(result.ageScore).toBe(35);
      expect(result.historySignal).toBe("Young");
    });

    it("scores 1 year domains as Young with 20", () => {
      const result = scoreDomainAge(1);
      expect(result.ageScore).toBe(20);
      expect(result.historySignal).toBe("Young");
    });

    it("scores <1 year domains as Brand New with 10", () => {
      const result = scoreDomainAge(0.5);
      expect(result.ageScore).toBe(10);
      expect(result.historySignal).toBe("Brand New");
      expect(result.ageLabel).toBe("< 1 year");
    });

    it("handles null age as Unknown with neutral score", () => {
      const result = scoreDomainAge(null);
      expect(result.ageScore).toBe(30);
      expect(result.historySignal).toBe("Unknown");
      expect(result.ageYears).toBeNull();
    });

    it("preserves ageYears in result", () => {
      expect(scoreDomainAge(10).ageYears).toBe(10);
      expect(scoreDomainAge(0).ageYears).toBe(0);
    });
  });

  describe("Value impact messages", () => {
    it("mentions premium for 20+ year domains", () => {
      expect(scoreDomainAge(20).valueImpact).toContain("authority and trust");
    });

    it("mentions limited value for young domains", () => {
      expect(scoreDomainAge(3).valueImpact).toContain("limited age premium");
    });

    it("mentions no age value for brand new", () => {
      expect(scoreDomainAge(0).valueImpact).toContain("no age value");
    });

    it("suggests manual check for unknown age", () => {
      expect(scoreDomainAge(null).valueImpact).toContain("WHOIS");
    });
  });

  describe("getAgeMultiplier", () => {
    it("returns 1.4 for 20+ years", () => {
      expect(getAgeMultiplier(20)).toBe(1.4);
      expect(getAgeMultiplier(30)).toBe(1.4);
    });

    it("returns 1.3 for 15-19 years", () => {
      expect(getAgeMultiplier(15)).toBe(1.3);
      expect(getAgeMultiplier(19)).toBe(1.3);
    });

    it("returns 1.2 for 10-14 years", () => {
      expect(getAgeMultiplier(10)).toBe(1.2);
      expect(getAgeMultiplier(14)).toBe(1.2);
    });

    it("returns 1.1 for 5-9 years", () => {
      expect(getAgeMultiplier(5)).toBe(1.1);
      expect(getAgeMultiplier(9)).toBe(1.1);
    });

    it("returns 1.0 for <5 years", () => {
      expect(getAgeMultiplier(4)).toBe(1.0);
      expect(getAgeMultiplier(0)).toBe(1.0);
    });

    it("returns 1.0 for null age", () => {
      expect(getAgeMultiplier(null)).toBe(1.0);
    });
  });

  describe("Boundary values", () => {
    it("correctly categorizes exact boundaries", () => {
      expect(scoreDomainAge(20).ageScore).toBe(95);
      expect(scoreDomainAge(15).ageScore).toBe(85);
      expect(scoreDomainAge(10).ageScore).toBe(75);
      expect(scoreDomainAge(5).ageScore).toBe(55);
      expect(scoreDomainAge(2).ageScore).toBe(35);
      expect(scoreDomainAge(1).ageScore).toBe(20);
    });

    it("correctly categorizes just below boundaries", () => {
      expect(scoreDomainAge(19).ageScore).toBe(85);
      expect(scoreDomainAge(14).ageScore).toBe(75);
      expect(scoreDomainAge(9).ageScore).toBe(55);
      expect(scoreDomainAge(4).ageScore).toBe(35);
    });
  });
});
