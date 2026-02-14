import { describe, it, expect } from "vitest";
import { scoreBrandability } from "@/lib/brandability";

const domains = [
  // Premium ultra-short
  "ai.com",
  "cube.com",
  // Single real word
  "delete.com",
  // Two-word compounds (aligned with valuation tiers)
  "cloudbank.com",   // Tier 1: Dictionary + Premium + Trending
  "dataflow.com",    // Tier 2: Dictionary + Premium OR Trending
  "moonlight.com",   // Tier 3: Two short dictionary words
  "silverstream.com",// Tier 4: Two dictionary words (longer)
  "sparkflow.com",   // Two-word with premium keyword
  "bluestar.com",    // Tier 6: Generic two words
  // Coined/brandable
  "zapify.io",
  "aeroverge.com",
  // Bad domains
  "poostain.com",
  "my-toyit.com",
  "xwqbnk.com",
  // Nonsensical word combos (should score low despite dictionary coverage)
  "techhaveread.com",
  "techontoast.com",
  "peasontoast.com",
  "shesaslag.com",
  "please60go.com",
];

describe("Brandability Score sanity checks", () => {
  const results = domains.map((d) => ({ domain: d, result: scoreBrandability(d) }));

  it("prints all scores for review", () => {
    for (const { domain, result } of results) {
      console.log(
        `${domain.padEnd(22)} → ${String(result.overall).padStart(2)}/100 (${result.grade.padEnd(2)}) | ${result.dimensions.map(d => `${d.name}:${d.score}`).join(", ")}`
      );
    }
  });

  it("ultra-short premium domains score very high (90+)", () => {
    const ai = results.find((r) => r.domain === "ai.com")!;
    expect(ai.result.overall).toBeGreaterThanOrEqual(90);
  });

  it("single real-word .coms score high (85+)", () => {
    const cube = results.find((r) => r.domain === "cube.com")!;
    const del = results.find((r) => r.domain === "delete.com")!;
    expect(cube.result.overall).toBeGreaterThanOrEqual(85);
    expect(del.result.overall).toBeGreaterThanOrEqual(80);
  });

  it("two-word dictionary compounds score well (75+)", () => {
    const cloud = results.find((r) => r.domain === "cloudbank.com")!;
    const moon = results.find((r) => r.domain === "moonlight.com")!;
    const silver = results.find((r) => r.domain === "silverstream.com")!;
    expect(cloud.result.overall).toBeGreaterThanOrEqual(75);
    expect(moon.result.overall).toBeGreaterThanOrEqual(75);
    expect(silver.result.overall).toBeGreaterThanOrEqual(70);
  });

  it("two-word compounds with premium keywords get high word structure scores", () => {
    const spark = results.find((r) => r.domain === "sparkflow.com")!;
    const dataflow = results.find((r) => r.domain === "dataflow.com")!;
    const sparkWordStructure = spark.result.dimensions.find(d => d.name === "Word Structure")!;
    const dataWordStructure = dataflow.result.dimensions.find(d => d.name === "Word Structure")!;
    // Both should have top-tier word structure (95)
    expect(sparkWordStructure.score).toBeGreaterThanOrEqual(90);
    expect(dataWordStructure.score).toBeGreaterThanOrEqual(90);
  });

  it("brandable coined names score decently (65+)", () => {
    const zap = results.find((r) => r.domain === "zapify.io")!;
    expect(zap.result.overall).toBeGreaterThanOrEqual(65);
  });

  it("offensive domains score very low (<30)", () => {
    const poo = results.find((r) => r.domain === "poostain.com")!;
    expect(poo.result.overall).toBeLessThan(30);
  });

  it("gibberish scores much lower than brandable names", () => {
    const xwq = results.find((r) => r.domain === "xwqbnk.com")!;
    const spark = results.find((r) => r.domain === "sparkflow.com")!;
    expect(xwq.result.overall).toBeLessThan(55);
    expect(xwq.result.overall).toBeLessThan(spark.result.overall - 15);
  });

  it("hyphenated domains score significantly lower than clean equivalents", () => {
    const hyphen = results.find((r) => r.domain === "my-toyit.com")!;
    const cube = results.find((r) => r.domain === "cube.com")!;
    expect(hyphen.result.overall).toBeLessThanOrEqual(cube.result.overall - 20);
  });

  it("nonsensical word combinations score below 55", () => {
    const nonsense = [
      "techhaveread.com",
      "techontoast.com",
      "peasontoast.com",
      "shesaslag.com",
      "please60go.com",
    ];
    for (const domain of nonsense) {
      const r = results.find((x) => x.domain === domain)!;
      expect(r.result.overall, `${domain} scored ${r.result.overall}, expected < 55`).toBeLessThan(55);
    }
  });


  it("grades are assigned correctly", () => {
    for (const { result } of results) {
      if (result.overall >= 90) expect(result.grade).toBe("A+");
      else if (result.overall >= 80) expect(result.grade).toBe("A");
      else if (result.overall >= 65) expect(result.grade).toBe("B");
      else if (result.overall >= 50) expect(result.grade).toBe("C");
      else if (result.overall >= 35) expect(result.grade).toBe("D");
      else expect(result.grade).toBe("F");
    }
  });
});
