/**
 * Regex Security Utility for Edge Functions
 * Validates regex patterns to prevent ReDoS (Regular Expression Denial of Service) attacks
 */

export interface RegexValidationResult {
  safe: boolean;
  reason?: string;
}

// Maximum allowed pattern length
const MAX_PATTERN_LENGTH = 200;

// Maximum allowed nesting depth for groups
const MAX_NESTING_DEPTH = 3;

// Maximum number of quantifiers allowed
const MAX_QUANTIFIERS = 5;

/**
 * Validates a regex pattern for safety against ReDoS attacks
 */
export function validateRegexSafety(pattern: string): RegexValidationResult {
  // Check length limit
  if (pattern.length > MAX_PATTERN_LENGTH) {
    return { 
      safe: false, 
      reason: `Pattern too long (max ${MAX_PATTERN_LENGTH} characters)` 
    };
  }

  // Empty patterns are not useful
  if (pattern.trim().length === 0) {
    return { 
      safe: false, 
      reason: "Pattern cannot be empty" 
    };
  }

  // Check for nested quantifiers - main ReDoS risk
  const nestedQuantifierPatterns = [
    /\([^)]*[+*][^)]*\)[+*]/,
    /\([^)]*[+*][^)]*\)\{/,
    /\{[^}]*\}[+*]/,
    /[+*]\)[+*]/,
  ];

  for (const dangerousPattern of nestedQuantifierPatterns) {
    if (dangerousPattern.test(pattern)) {
      return { 
        safe: false, 
        reason: "Nested quantifiers detected - this pattern could cause performance issues" 
      };
    }
  }

  // Check for overlapping alternatives with quantifiers
  if (/\([^)]*\|[^)]*\)[+*]/.test(pattern)) {
    const altMatch = pattern.match(/\(([^)]*)\)[+*]/);
    if (altMatch) {
      const alternatives = altMatch[1].split('|');
      if (alternatives.some(alt => /[+*]/.test(alt))) {
        return { 
          safe: false, 
          reason: "Alternation with quantifiers detected - this pattern could cause performance issues" 
        };
      }
    }
  }

  // Count and limit nesting depth
  let maxDepth = 0;
  let currentDepth = 0;
  for (const char of pattern) {
    if (char === '(') {
      currentDepth++;
      maxDepth = Math.max(maxDepth, currentDepth);
    } else if (char === ')') {
      currentDepth--;
    }
  }

  if (maxDepth > MAX_NESTING_DEPTH) {
    return { 
      safe: false, 
      reason: `Pattern nesting too deep (max ${MAX_NESTING_DEPTH} levels)` 
    };
  }

  // Count quantifiers
  const quantifierCount = (pattern.match(/[+*?]|\{\d+,?\d*\}/g) || []).length;
  if (quantifierCount > MAX_QUANTIFIERS) {
    return { 
      safe: false, 
      reason: `Too many quantifiers (max ${MAX_QUANTIFIERS})` 
    };
  }

  // Check for consecutive quantifiers
  if (/[+*?]{2,}/.test(pattern)) {
    return { 
      safe: false, 
      reason: "Consecutive quantifiers are not allowed" 
    };
  }

  // Validate that it's actually a valid regex
  try {
    new RegExp(pattern);
  } catch {
    return { 
      safe: false, 
      reason: "Invalid regex syntax" 
    };
  }

  return { safe: true };
}

/**
 * Creates a safe regex matcher with validation
 */
export function createSafeRegex(
  pattern: string, 
  flags: string = "i"
): { regex: RegExp | null; error?: string } {
  const validation = validateRegexSafety(pattern);
  if (!validation.safe) {
    return { regex: null, error: validation.reason };
  }

  try {
    return { regex: new RegExp(pattern, flags) };
  } catch {
    return { regex: null, error: "Invalid regex pattern" };
  }
}
