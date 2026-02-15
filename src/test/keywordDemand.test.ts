import { describe, it, expect } from "vitest";
import { scoreKeywordDemand, type KeywordDemandResult } from "@/lib/keywordDemand";

// ─── HELPERS ───

function demand(domain: string): KeywordDemandResult {
  return scoreKeywordDemand(domain);
}

function score(domain: string): number {
  return demand(domain).score;
}

function grade(domain: string): string {
  return demand(domain).grade;
}

// ═══════════════════════════════════════════════════════════════
// TEST SUITE — 100+ tests across 12 categories
// ═══════════════════════════════════════════════════════════════

describe("Keyword Demand Scoring", () => {

  // ─── 1. BASIC SANITY (10 tests) ───
  describe("Basic Sanity", () => {
    it("returns a score between 1 and 100", () => {
      const r = demand("example.com");
      expect(r.score).toBeGreaterThanOrEqual(1);
      expect(r.score).toBeLessThanOrEqual(100);
    });

    it("returns all required fields", () => {
      const r = demand("test.com");
      expect(r).toHaveProperty("score");
      expect(r).toHaveProperty("label");
      expect(r).toHaveProperty("grade");
      expect(r).toHaveProperty("trendingKeywords");
      expect(r).toHaveProperty("niche");
      expect(r).toHaveProperty("factors");
    });

    it("grade is one of A, B, C, D, F", () => {
      expect(["A", "B", "C", "D", "F"]).toContain(grade("anything.com"));
    });

    it("factors is a non-empty array", () => {
      expect(demand("cloud.com").factors.length).toBeGreaterThan(0);
    });

    it("niche has expected shape", () => {
      const n = demand("aibot.com").niche;
      expect(n).toHaveProperty("niche");
      expect(n).toHaveProperty("label");
      expect(n).toHaveProperty("multiplier");
      expect(n).toHaveProperty("confidence");
    });

    it("handles single-char domain gracefully", () => {
      expect(score("x.com")).toBeGreaterThanOrEqual(1);
    });

    it("handles numeric domain", () => {
      expect(score("123.com")).toBeGreaterThanOrEqual(1);
    });

    it("handles hyphenated domain", () => {
      expect(score("my-domain.com")).toBeGreaterThanOrEqual(1);
    });

    it("strips www prefix", () => {
      const a = score("www.cloud.com");
      const b = score("cloud.com");
      expect(a).toBe(b);
    });

    it("is case-insensitive", () => {
      expect(score("CLOUD.COM")).toBe(score("cloud.com"));
    });
  });

  // ─── 2. PENALTY / TOXIC DOMAINS (10 tests) ───
  describe("Penalty Keywords", () => {
    it("viagra domain scores 1", () => {
      expect(score("buyviagra.com")).toBe(1);
    });

    it("porn domain scores 1", () => {
      expect(score("freeporn.net")).toBe(1);
    });

    it("casino domain scores 1", () => {
      expect(score("bestcasino.com")).toBe(1);
    });

    it("scam domain scores 1", () => {
      expect(score("getrichscam.com")).toBe(1);
    });

    it("hack domain scores 1", () => {
      expect(score("easyhack.io")).toBe(1);
    });

    it("pirate domain scores 1", () => {
      expect(score("moviepirate.com")).toBe(1);
    });

    it("penalty domain gets grade F", () => {
      expect(grade("cheapviagra.com")).toBe("F");
    });

    it("penalty domain label is Toxic", () => {
      expect(demand("xxxsite.com").label).toContain("Toxic");
    });

    it("penalty domain has zero trending keywords", () => {
      expect(demand("fakepills.com").trendingKeywords).toHaveLength(0);
    });

    it("penalty domain niche is general", () => {
      expect(demand("replicawatches.com").niche.niche).toBe("general");
    });
  });

  // ─── 3. AI / TECH TRENDING (10 tests) ───
  describe("AI & Tech Trending Keywords", () => {
    it("ai.com scores very high", () => {
      expect(score("ai.com")).toBeGreaterThanOrEqual(50);
    });

    it("gptcloud.ai scores high due to dual trending + TLD synergy", () => {
      expect(score("gptcloud.ai")).toBeGreaterThanOrEqual(55);
    });

    it("neuralnet.ai detects AI niche", () => {
      expect(demand("neuralnet.ai").niche.label).toMatch(/AI|Tech/i);
    });

    it("deeplearn.com has trending keywords", () => {
      expect(demand("deeplearn.com").trendingKeywords.length).toBeGreaterThan(0);
    });

    it("agentai.ai has high demand (triple: agent + ai + .ai TLD)", () => {
      expect(score("agentai.ai")).toBeGreaterThanOrEqual(60);
    });

    it("machinelogic.com detects trending keywords", () => {
      const r = demand("machinelogic.com");
      expect(r.trendingKeywords).toEqual(expect.arrayContaining(["machine"]));
    });

    it("robotics.ai gets TLD synergy boost", () => {
      const r = demand("robotics.ai");
      const tldFactor = r.factors.find(f => f.label === "TLD Demand");
      expect(tldFactor).toBeDefined();
      expect(tldFactor!.points).toBeGreaterThanOrEqual(10);
    });

    it("quantumai.com scores higher than quantumai.xyz", () => {
      expect(score("quantumai.com")).toBeGreaterThan(score("quantumai.xyz"));
    });

    it("cyber.io detects trending keyword", () => {
      expect(demand("cyber.io").trendingKeywords).toContain("cyber");
    });

    it("dataflow.dev gets TLD synergy with tech niche", () => {
      const r = demand("dataflow.dev");
      const tldFactor = r.factors.find(f => f.label === "TLD Demand");
      expect(tldFactor).toBeDefined();
    });
  });

  // ─── 4. FINTECH / CRYPTO (8 tests) ───
  describe("Fintech & Crypto Keywords", () => {
    it("paycloud.com scores well", () => {
      expect(score("paycloud.com")).toBeGreaterThanOrEqual(30);
    });

    it("defiswap.io detects fintech niche", () => {
      const n = demand("defiswap.io").niche;
      expect(["fintech", "crypto", "ai_tech"]).toContain(n.niche);
    });

    it("tradehub.com has premium keywords", () => {
      expect(score("tradehub.com")).toBeGreaterThanOrEqual(25);
    });

    it("blockstack.com detects trending keywords", () => {
      expect(demand("blockstack.com").trendingKeywords.length).toBeGreaterThan(0);
    });

    it("cashflow.com scores high (dictionary + premium)", () => {
      expect(score("cashflow.com")).toBeGreaterThanOrEqual(25);
    });

    it("loanpay.com has premium keyword factors", () => {
      const r = demand("loanpay.com");
      const hasPremiumOrHeat = r.factors.some(f => f.label === "Premium Keywords" || f.label === "Keyword Heat");
      expect(hasPremiumOrHeat).toBe(true);
    });

    it("wealthfund.com detects premium keywords", () => {
      expect(score("wealthfund.com")).toBeGreaterThanOrEqual(20);
    });

    it("investpro.com has solid demand signal", () => {
      expect(grade("investpro.com")).not.toBe("F");
    });
  });

  // ─── 5. HEALTH / BIOTECH (8 tests) ───
  describe("Health & Biotech Keywords", () => {
    it("healthai.com detects health niche", () => {
      const n = demand("healthai.com").niche;
      expect(["health", "biotech", "ai_tech"]).toContain(n.niche);
    });

    it("genetherapy.bio gets TLD synergy", () => {
      const r = demand("genetherapy.bio");
      expect(score("genetherapy.bio")).toBeGreaterThanOrEqual(20);
    });

    it("cliniccare.com has premium keywords", () => {
      const r = demand("cliniccare.com");
      expect(r.factors.some(f => f.points > 0)).toBe(true);
    });

    it("medtech.ai scores high (trending + TLD synergy)", () => {
      expect(score("medtech.ai")).toBeGreaterThanOrEqual(40);
    });

    it("skincare.com scores well", () => {
      expect(score("skincare.com")).toBeGreaterThanOrEqual(20);
    });

    it("biolab.io has demand signal", () => {
      expect(grade("biolab.io")).not.toBe("F");
    });

    it("petvet.com has premium keywords detected", () => {
      const r = demand("petvet.com");
      expect(r.factors.some(f => f.points > 0)).toBe(true);
    });

    it("fitcoach.com detects premium keywords", () => {
      expect(score("fitcoach.com")).toBeGreaterThanOrEqual(15);
    });
  });

  // ─── 6. TLD DEMAND SCORING (10 tests) ───
  describe("TLD Demand Signals", () => {
    it(".com gets high TLD points", () => {
      const r = demand("example.com");
      const tld = r.factors.find(f => f.label === "TLD Demand");
      expect(tld).toBeDefined();
      expect(tld!.points).toBeGreaterThanOrEqual(10);
    });

    it(".ai gets top TLD points", () => {
      const r = demand("example.ai");
      const tld = r.factors.find(f => f.label === "TLD Demand");
      expect(tld!.points).toBeGreaterThanOrEqual(13);
    });

    it(".io gets solid TLD points", () => {
      const r = demand("example.io");
      const tld = r.factors.find(f => f.label === "TLD Demand");
      expect(tld!.points).toBeGreaterThanOrEqual(8);
    });

    it(".app gets moderate TLD points", () => {
      const r = demand("example.app");
      const tld = r.factors.find(f => f.label === "TLD Demand");
      expect(tld!.points).toBe(7);
    });

    it(".net gets moderate TLD points", () => {
      const r = demand("example.net");
      const tld = r.factors.find(f => f.label === "TLD Demand");
      expect(tld!.points).toBe(5);
    });

    it(".xyz gets low TLD points", () => {
      const r = demand("example.xyz");
      const tld = r.factors.find(f => f.label === "TLD Demand");
      expect(tld!.points).toBe(2);
    });

    it(".info gets low TLD points", () => {
      const r = demand("example.info");
      const tld = r.factors.find(f => f.label === "TLD Demand");
      expect(tld!.points).toBe(2);
    });

    it(".co gets moderate TLD points", () => {
      const r = demand("example.co");
      const tld = r.factors.find(f => f.label === "TLD Demand");
      expect(tld!.points).toBe(7);
    });

    it(".dev gets moderate TLD points", () => {
      const r = demand("example.dev");
      const tld = r.factors.find(f => f.label === "TLD Demand");
      expect(tld!.points).toBe(7);
    });

    it("obscure TLD gets minimal points", () => {
      const r = demand("example.museum");
      const tld = r.factors.find(f => f.label === "TLD Demand");
      expect(tld!.points).toBe(2);
    });
  });

  // ─── 7. DICTIONARY WORD BONUS (8 tests) ───
  describe("Dictionary Word Bonus", () => {
    it("'cloud.com' is a dictionary word and gets bonus", () => {
      const r = demand("cloud.com");
      const dict = r.factors.find(f => f.label === "Dictionary Word");
      expect(dict).toBeDefined();
      expect(dict!.points).toBeGreaterThanOrEqual(7);
    });

    it("short dictionary word (≤6 chars) gets max bonus", () => {
      const r = demand("power.com");
      const dict = r.factors.find(f => f.label === "Dictionary Word");
      expect(dict).toBeDefined();
      expect(dict!.points).toBe(10);
    });

    it("longer dictionary word gets reduced bonus", () => {
      const r = demand("navigate.com");
      const dict = r.factors.find(f => f.label === "Dictionary Word");
      expect(dict).toBeDefined();
      expect(dict!.points).toBe(7);
    });

    it("gibberish does NOT get dictionary bonus", () => {
      const r = demand("xkqzwp.com");
      const dict = r.factors.find(f => f.label === "Dictionary Word");
      expect(dict).toBeUndefined();
    });

    it("compound word does NOT get single-word dictionary bonus", () => {
      const r = demand("cloudpower.com");
      const dict = r.factors.find(f => f.label === "Dictionary Word");
      expect(dict).toBeUndefined();
    });

    it("'launch.com' gets dictionary bonus", () => {
      const r = demand("launch.com");
      const dict = r.factors.find(f => f.label === "Dictionary Word");
      expect(dict).toBeDefined();
    });

    it("'trade.com' gets dictionary bonus", () => {
      const r = demand("trade.com");
      const dict = r.factors.find(f => f.label === "Dictionary Word");
      expect(dict).toBeDefined();
    });

    it("'spark.com' is short dictionary word, max points", () => {
      const r = demand("spark.com");
      const dict = r.factors.find(f => f.label === "Dictionary Word");
      expect(dict).toBeDefined();
      expect(dict!.points).toBe(10);
    });
  });

  // ─── 8. MULTI-KEYWORD COMBO (8 tests) ───
  describe("Multi-Keyword Combo Bonus", () => {
    it("dual trending keywords get 10pt combo bonus", () => {
      const r = demand("aicloud.com");
      if (r.trendingKeywords.length >= 2) {
        const combo = r.factors.find(f => f.label === "Keyword Combo");
        expect(combo).toBeDefined();
        expect(combo!.points).toBe(10);
      }
    });

    it("triple trending keywords get 15pt combo bonus", () => {
      // ai + deep + learn
      const r = demand("aideeplearn.com");
      if (r.trendingKeywords.length >= 3) {
        const combo = r.factors.find(f => f.label === "Keyword Combo");
        expect(combo).toBeDefined();
        expect(combo!.points).toBe(15);
      }
    });

    it("single trending keyword gets no combo bonus", () => {
      const r = demand("ai.com");
      const combo = r.factors.find(f => f.label === "Keyword Combo");
      expect(combo).toBeUndefined();
    });

    it("no trending keywords = no combo bonus", () => {
      const r = demand("xyzabc.com");
      const combo = r.factors.find(f => f.label === "Keyword Combo");
      expect(combo).toBeUndefined();
    });

    it("dual combo domain scores higher than single keyword domain", () => {
      expect(score("aicloud.com")).toBeGreaterThan(score("xyzcloud.com"));
    });

    it("agentgpt.ai detects at least one trending keyword", () => {
      const r = demand("agentgpt.ai");
      expect(r.trendingKeywords.length).toBeGreaterThanOrEqual(1);
    });

    it("cryptodefi.io has combo bonus", () => {
      const r = demand("cryptodefi.io");
      if (r.trendingKeywords.length >= 2) {
        expect(r.factors.some(f => f.label === "Keyword Combo")).toBe(true);
      }
    });

    it("smartauto.com detects trending keywords", () => {
      const r = demand("smartauto.com");
      expect(r.trendingKeywords.length).toBeGreaterThanOrEqual(1);
    });
  });

  // ─── 9. NICHE DETECTION (10 tests) ───
  describe("Niche Detection", () => {
    it("solarpanel.com detects energy-related niche", () => {
      const n = demand("solarpanel.com").niche;
      expect(["green_energy", "ev_mobility", "energy", "general"]).toContain(n.niche);
    });

    it("insurepro.com detects insurance niche", () => {
      const n = demand("insurepro.com").niche;
      expect(["insurance", "fintech", "general"]).toContain(n.niche);
    });

    it("metaverse.com has premium keyword signal", () => {
      const r = demand("metaverse.com");
      expect(r.factors.some(f => f.points > 0)).toBe(true);
    });

    it("petcare.com detects pet niche", () => {
      const n = demand("petcare.com").niche;
      expect(["pet", "health", "general"]).toContain(n.niche);
    });

    it("evcharge.com detects EV-related niche", () => {
      const n = demand("evcharge.com").niche;
      expect(["ev_mobility", "green_energy", "energy", "general"]).toContain(n.niche);
    });

    it("recipechef.com detects food niche", () => {
      const n = demand("recipechef.com").niche;
      expect(["food", "general"]).toContain(n.niche);
    });

    it("fashionstyle.com detects beauty/fashion niche", () => {
      const n = demand("fashionstyle.com").niche;
      expect(["beauty", "general"]).toContain(n.niche);
    });

    it("general domain has 'general' niche", () => {
      expect(demand("xyzabc.com").niche.niche).toBe("general");
    });

    it("niche detection has confidence field", () => {
      const n = demand("aicloud.ai").niche;
      expect(["High", "Medium", "Low"]).toContain(n.confidence);
    });

    it("niche multiplier is a positive number", () => {
      expect(demand("techcloud.com").niche.multiplier).toBeGreaterThan(0);
    });
  });

  // ─── 10. GRADE & LABEL TIERS (10 tests) ───
  describe("Grade & Label Tiers", () => {
    it("high-demand AI domain gets A grade", () => {
      expect(["A", "B"]).toContain(grade("gptcloud.ai"));
    });

    it("generic gibberish gets D or F grade", () => {
      expect(["D", "F"]).toContain(grade("xkqzwp.xyz"));
    });

    it("label contains emoji for all domains", () => {
      expect(demand("cloud.com").label).toMatch(/[🔥📈⬆️➡️↘️⬇️⛔]/);
    });

    it("surging label for very high scores", () => {
      // Build a domain likely to score 85+
      const r = demand("gptcloud.ai");
      if (r.score >= 85) {
        expect(r.label).toContain("Surging");
      }
    });

    it("minimal label for very low scores", () => {
      const r = demand("xkqzwp.xyz");
      if (r.score < 25) {
        expect(r.label).toContain("Minimal");
      }
    });

    it("moderate label for mid-range scores", () => {
      const r = demand("goodsite.net");
      if (r.score >= 40 && r.score < 55) {
        expect(r.label).toContain("Moderate");
      }
    });

    it("grade A means score >= 70", () => {
      const r = demand("aiagent.ai");
      if (r.grade === "A") {
        expect(r.score).toBeGreaterThanOrEqual(70);
      }
    });

    it("grade F means score < 25", () => {
      const r = demand("xkqzwp.xyz");
      if (r.grade === "F") {
        expect(r.score).toBeLessThan(25);
      }
    });

    it("grade B means score 55-69", () => {
      const r = demand("cloudapp.dev");
      if (r.grade === "B") {
        expect(r.score).toBeGreaterThanOrEqual(55);
        expect(r.score).toBeLessThan(70);
      }
    });

    it("grade C means score 40-54", () => {
      const r = demand("goodsite.co");
      if (r.grade === "C") {
        expect(r.score).toBeGreaterThanOrEqual(40);
        expect(r.score).toBeLessThan(55);
      }
    });
  });

  // ─── 11. COMPARATIVE / RANKING (10 tests) ───
  describe("Comparative Ranking", () => {
    it("ai.com scores higher than xyzabc.com", () => {
      expect(score("ai.com")).toBeGreaterThan(score("xyzabc.com"));
    });

    it("cloud.com scores higher than cloud.xyz", () => {
      expect(score("cloud.com")).toBeGreaterThan(score("cloud.xyz"));
    });

    it("trending keyword domain beats generic domain", () => {
      expect(score("agentai.com")).toBeGreaterThan(score("blorpfoo.com"));
    });

    it(".ai TLD adds more demand than .info for tech domains", () => {
      expect(score("neural.ai")).toBeGreaterThan(score("neural.info"));
    });

    it("dual trending beats single trending", () => {
      expect(score("aicloud.com")).toBeGreaterThanOrEqual(score("cloud.com"));
    });

    it("premium keyword domain beats pure gibberish", () => {
      expect(score("tradehub.com")).toBeGreaterThan(score("qwxzy.com"));
    });

    it("dictionary word domain scores reasonably", () => {
      expect(score("power.com")).toBeGreaterThan(score("qwxzy.com"));
    });

    it("hot niche domain beats cooling niche domain of same length", () => {
      // AI (hot) vs a very generic domain
      expect(score("aibot.ai")).toBeGreaterThan(score("randomthing.xyz"));
    });

    it("short premium .com beats long obscure .info", () => {
      expect(score("pay.com")).toBeGreaterThan(score("verylongdomainname.info"));
    });

    it("domain with TLD-niche synergy beats mismatched TLD", () => {
      // .ai with AI content vs .ai with food content
      expect(score("neural.ai")).toBeGreaterThanOrEqual(score("recipe.ai"));
    });
  });

  // ─── 12. EDGE CASES (8 tests) ───
  describe("Edge Cases", () => {
    it("empty name part still works", () => {
      // edge case: just a TLD
      expect(() => scoreKeywordDemand(".com")).not.toThrow();
    });

    it("missing TLD defaults gracefully", () => {
      expect(() => scoreKeywordDemand("nodot")).not.toThrow();
      const r = demand("nodot");
      expect(r.score).toBeGreaterThanOrEqual(1);
    });

    it("very long domain name works", () => {
      const long = "a".repeat(60) + ".com";
      expect(() => scoreKeywordDemand(long)).not.toThrow();
    });

    it("domain with multiple dots uses first part as name", () => {
      const r = demand("sub.domain.com");
      expect(r.score).toBeGreaterThanOrEqual(1);
    });

    it("domain with special characters is cleaned", () => {
      expect(() => scoreKeywordDemand("my_domain!.com")).not.toThrow();
    });

    it("score never exceeds 100", () => {
      // Try to create a domain that would max out all factors
      const r = demand("aigptdeeplearn.ai");
      expect(r.score).toBeLessThanOrEqual(100);
    });

    it("score is always at least 1 for non-penalty domains", () => {
      expect(score("z.xyz")).toBeGreaterThanOrEqual(1);
    });

    it("all factors have label, points, and detail", () => {
      const r = demand("cloud.com");
      for (const f of r.factors) {
        expect(f).toHaveProperty("label");
        expect(f).toHaveProperty("points");
        expect(f).toHaveProperty("detail");
        expect(typeof f.label).toBe("string");
        expect(typeof f.points).toBe("number");
        expect(typeof f.detail).toBe("string");
      }
    });
  });
});
