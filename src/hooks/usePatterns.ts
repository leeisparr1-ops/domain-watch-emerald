import { useState, useEffect, useCallback } from "react";

export interface Pattern {
  id: string;
  pattern: string;
  type: "regex" | "structure" | "pronounceable";
  description: string;
}

const STORAGE_KEY = "domain_patterns";

export function usePatterns() {
  const [patterns, setPatterns] = useState<Pattern[]>([]);

  // Load patterns from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setPatterns(JSON.parse(stored));
      } catch {
        console.error("Failed to parse stored patterns");
      }
    }
  }, []);

  // Save patterns to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(patterns));
  }, [patterns]);

  const addPattern = useCallback((pattern: Omit<Pattern, "id">) => {
    const newPattern: Pattern = {
      ...pattern,
      id: crypto.randomUUID(),
    };
    setPatterns((prev) => [...prev, newPattern]);
  }, []);

  const removePattern = useCallback((id: string) => {
    setPatterns((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const clearPatterns = useCallback(() => {
    setPatterns([]);
  }, []);

  const matchesDomain = useCallback((domainName: string): boolean => {
    if (patterns.length === 0) return true;
    
    // Extract domain without TLD
    const domainParts = domainName.split(".");
    const nameOnly = domainParts.slice(0, -1).join(".").toLowerCase();
    
    return patterns.some((p) => {
      try {
        const regex = new RegExp(p.pattern, "i");
        return regex.test(nameOnly);
      } catch {
        return false;
      }
    });
  }, [patterns]);

  return {
    patterns,
    addPattern,
    removePattern,
    clearPatterns,
    matchesDomain,
    hasPatterns: patterns.length > 0,
  };
}
