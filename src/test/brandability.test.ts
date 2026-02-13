import { describe, it, expect } from "vitest";
import { scoreBrandability } from "@/lib/brandability";

const domains = [
  "sparkflow.com",
  "zapify.io",
  "aeroverge.com",
  "cube.com",
  "delete.com",
  "ai.com",
  "poostain.com",
  "my-toyit.com",
  "xwqbnk.com",
];

describe("Brandability Score sanity checks", () => {
  const results = domains.map((d) => ({ domain: d, result: scoreBrandability(d) }));

  it("prints all scores for review", () => {
    for (const { domain, result } of results) {
      console.log(
        `${domain.padEnd(20)} → ${result.overall}/100 (${result.grade}) | ${result.dimensions.map(d => `${d.name}:${d.score}`).join(", ")}`
      );
    }
  });

  it("short premium domains score high", () => {
    const ai = results.find((r) => r.domain === "ai.com")!;
    const cube = results.find((r) => r.domain === "cube.com")!;
    expect(ai.result.overall).toBeGreaterThanOrEqual(60);
    expect(cube.result.overall).toBeGreaterThanOrEqual(70);
  });

  it("brandable compound names score well", () => {
    const spark = results.find((r) => r.domain === "sparkflow.com")!;
    const zap = results.find((r) => r.domain === "zapify.io")!;
    expect(spark.result.overall).toBeGreaterThanOrEqual(60);
    expect(zap.result.overall).toBeGreaterThanOrEqual(60);
  });

  it("gibberish scores much lower than brandable names", () => {
    const xwq = results.find((r) => r.domain === "xwqbnk.com")!;
    const spark = results.find((r) => r.domain === "sparkflow.com")!;
    expect(xwq.result.overall).toBeLessThan(55);
    expect(xwq.result.overall).toBeLessThan(spark.result.overall - 15);
  });

  it("hyphenated domains score lower than clean equivalents", () => {
    const hyphen = results.find((r) => r.domain === "my-toyit.com")!;
    const cube = results.find((r) => r.domain === "cube.com")!;
    // Hyphenated should score lower than a clean premium domain
    expect(hyphen.result.overall).toBeLessThan(cube.result.overall);
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
