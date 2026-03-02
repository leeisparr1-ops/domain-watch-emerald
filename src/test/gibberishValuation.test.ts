import { describe, it, expect } from "vitest";
import { quickValuation } from "@/lib/domainValuation";

describe("Gibberish / Junk Domain Detection", () => {
  it("values 'gobbledeedoopoo.com' as near-worthless junk", () => {
    const result = quickValuation("gobbledeedoopoo.com");
    expect(result.valueMax).toBeLessThanOrEqual(50);
  });

  it("values 'xyzqwkrthm.com' as junk (no meaningful words)", () => {
    const result = quickValuation("xyzqwkrthm.com");
    expect(result.valueMax).toBeLessThanOrEqual(50);
  });

  it("values 'asdfghjklqwerty.com' as junk", () => {
    const result = quickValuation("asdfghjklqwerty.com");
    expect(result.valueMax).toBeLessThanOrEqual(50);
  });

  it("values 'blorpsnazzle.com' as junk", () => {
    const result = quickValuation("blorpsnazzle.com");
    expect(result.valueMax).toBeLessThanOrEqual(50);
  });

  it("values 'flibbertigibbet.com' as near-worthless", () => {
    const result = quickValuation("flibbertigibbet.com");
    expect(result.valueMax).toBeLessThanOrEqual(50);
  });

  it("does NOT penalize legitimate compound domains like 'cloudbank.com'", () => {
    const result = quickValuation("cloudbank.com");
    expect(result.valueMin).toBeGreaterThanOrEqual(5000);
  });

  it("does NOT penalize legitimate compound domains like 'smartpay.com'", () => {
    const result = quickValuation("smartpay.com");
    expect(result.valueMin).toBeGreaterThanOrEqual(5000);
  });

  it("does NOT penalize short domains like 'rare.com'", () => {
    const result = quickValuation("rare.com");
    expect(result.valueMin).toBeGreaterThanOrEqual(50000);
  });

  it("does NOT penalize single dictionary words like 'energy.com'", () => {
    const result = quickValuation("energy.com");
    expect(result.valueMin).toBeGreaterThanOrEqual(50000);
  });
});
