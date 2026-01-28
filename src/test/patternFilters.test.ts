import { describe, it, expect } from "vitest";

describe("Pattern Filter Validation", () => {
  // Test character length filter parsing
  describe("Character Length Filters", () => {
    it("should parse min length correctly", () => {
      const minLength = "3";
      const parsedMinLength = minLength ? parseInt(minLength) : null;
      expect(parsedMinLength).toBe(3);
    });

    it("should parse max length correctly", () => {
      const maxLength = "10";
      const parsedMaxLength = maxLength ? parseInt(maxLength) : null;
      expect(parsedMaxLength).toBe(10);
    });

    it("should return null for empty length values", () => {
      const minLength = "";
      const parsedMinLength = minLength ? parseInt(minLength) : null;
      expect(parsedMinLength).toBeNull();
    });

    it("should build correct length description range", () => {
      const minLength = 3;
      const maxLength = 10;
      const lengthRange = minLength && maxLength 
        ? `${minLength}-${maxLength} chars`
        : maxLength 
          ? `≤${maxLength} chars`
          : `≥${minLength} chars`;
      expect(lengthRange).toBe("3-10 chars");
    });

    it("should build correct max-only length description", () => {
      const minLength = null;
      const maxLength = 8;
      const lengthRange = minLength && maxLength 
        ? `${minLength}-${maxLength} chars`
        : maxLength 
          ? `≤${maxLength} chars`
          : `≥${minLength} chars`;
      expect(lengthRange).toBe("≤8 chars");
    });
  });

  // Test domain age filter parsing
  describe("Domain Age Filters", () => {
    it("should parse min age correctly", () => {
      const minAge = "5";
      const parsedMinAge = minAge ? parseInt(minAge) : null;
      expect(parsedMinAge).toBe(5);
    });

    it("should parse max age correctly", () => {
      const maxAge = "20";
      const parsedMaxAge = maxAge ? parseInt(maxAge) : null;
      expect(parsedMaxAge).toBe(20);
    });

    it("should build correct age description range", () => {
      const minAge = 5;
      const maxAge = 20;
      const ageRange = minAge && maxAge 
        ? `${minAge}-${maxAge}yr`
        : maxAge 
          ? `≤${maxAge}yr`
          : `≥${minAge}yr`;
      expect(ageRange).toBe("5-20yr");
    });

    it("should build correct min-only age description", () => {
      const minAge = 10;
      const maxAge = null;
      const ageRange = minAge && maxAge 
        ? `${minAge}-${maxAge}yr`
        : maxAge 
          ? `≤${maxAge}yr`
          : `≥${minAge}yr`;
      expect(ageRange).toBe("≥10yr");
    });
  });

  // Test pattern description building with all filters
  describe("Pattern Description Building", () => {
    it("should combine all filter descriptions correctly", () => {
      let desc = "Contains 'tech'";
      const minLength = 3;
      const maxLength = 8;
      const minAge = 5;
      const maxAge = null;
      
      if (minLength || maxLength) {
        const lengthRange = minLength && maxLength 
          ? `${minLength}-${maxLength} chars`
          : maxLength 
            ? `≤${maxLength} chars`
            : `≥${minLength} chars`;
        desc += ` [${lengthRange}]`;
      }
      
      if (minAge || maxAge) {
        const ageRange = minAge && maxAge 
          ? `${minAge}-${maxAge}yr`
          : maxAge 
            ? `≤${maxAge}yr`
            : `≥${minAge}yr`;
        desc += ` [${ageRange}]`;
      }
      
      expect(desc).toBe("Contains 'tech' [3-8 chars] [≥5yr]");
    });
  });
});
