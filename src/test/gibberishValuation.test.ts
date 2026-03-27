import { describe, it, expect } from "vitest";
import { quickValuation } from "@/lib/domainValuation";

describe("Gibberish / Junk Domain Detection", () => {
  // ── Pure gibberish ──
  it("values 'gobbledeedoopoo.com' as near-worthless junk", () => {
    const result = quickValuation("gobbledeedoopoo.com");
    expect(result.valueMax).toBeLessThanOrEqual(1500);
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
    expect(result.valueMax).toBeLessThanOrEqual(1500);
  });

  // ── Hyphenated junk ──
  it("values 'blorp-snazzle-foo.com' as junk (hyphenated nonsense)", () => {
    const result = quickValuation("blorp-snazzle-foo.com");
    expect(result.valueMax).toBeLessThanOrEqual(50);
  });

  it("values 'xkr-qlm-bnz.com' as junk (hyphenated random letters)", () => {
    const result = quickValuation("xkr-qlm-bnz.com");
    expect(result.valueMax).toBeLessThanOrEqual(50);
  });

  // ── Numeric junk ──
  it("values '839274610384.com' as junk (long random numbers)", () => {
    const result = quickValuation("839274610384.com");
    expect(result.valueMax).toBeLessThanOrEqual(50);
  });

  it("values '00192837465.com' as junk (meaningless digits)", () => {
    const result = quickValuation("00192837465.com");
    expect(result.valueMax).toBeLessThanOrEqual(50);
  });

  // ── Mixed gibberish with one real word ──
  it("values 'cloudxrqzmpt.com' as junk (one word + gibberish)", () => {
    const result = quickValuation("cloudxrqzmpt.com");
    expect(result.valueMax).toBeLessThanOrEqual(50);
  });

  it("values 'payblrgfdsk.com' as junk (premium word + gibberish)", () => {
    const result = quickValuation("payblrgfdsk.com");
    expect(result.valueMax).toBeLessThanOrEqual(50);
  });

  it("values 'qwmfkpayxzl.com' as junk (gibberish + word + gibberish)", () => {
    const result = quickValuation("qwmfkpayxzl.com");
    expect(result.valueMax).toBeLessThanOrEqual(50);
  });

  // ── Legitimate domains should NOT be penalized ──
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
    expect(result.valueMin).toBeGreaterThanOrEqual(15000);
  });

  it("does NOT penalize short numeric domains like '888.com'", () => {
    const result = quickValuation("888.com");
    expect(result.valueMin).toBeGreaterThanOrEqual(100);
  });

  it("does NOT penalize legitimate hyphenated domains like 'smart-pay.com'", () => {
    const result = quickValuation("smart-pay.com");
    expect(result.valueMin).toBeGreaterThanOrEqual(500);
  });
});
