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

  it("brandable compound names score well (65+)", () => {
    const spark = results.find((r) => r.domain === "sparkflow.com")!;
    const zap = results.find((r) => r.domain === "zapify.io")!;
    expect(spark.result.overall).toBeGreaterThanOrEqual(65);
    expect(zap.result.overall).toBeGreaterThanOrEqual(65);
  });

  it("offensive/inappropriate domains score very low (<30)", () => {
    const poo = results.find((r) => r.domain === "poostain.com")!;
    expect(poo.result.overall).toBeLessThan(30);
  });

  it("gibberish scores much lower than brandable names", () => {
    const xwq = results.find((r) => r.domain === "xwqbnk.com")!;
    const spark = results.find((r) => r.domain === "sparkflow.com")!;
    expect(xwq.result.overall).toBeLessThan(50);
    expect(xwq.result.overall).toBeLessThan(spark.result.overall - 15);
  });

  it("hyphenated domains score significantly lower than clean equivalents", () => {
    const hyphen = results.find((r) => r.domain === "my-toyit.com")!;
    const cube = results.find((r) => r.domain === "cube.com")!;
    expect(hyphen.result.overall).toBeLessThanOrEqual(cube.result.overall - 20);
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
