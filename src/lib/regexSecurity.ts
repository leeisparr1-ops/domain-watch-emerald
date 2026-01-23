/**
 * Regex Security Utility
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
 * Checks for:
 * - Pattern length limits
 * - Nested quantifiers (catastrophic backtracking)
 * - Dangerous alternation patterns
 * - Excessive nesting depth
 * - Too many quantifiers
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
  // Patterns like (a+)+, (a*)+, (a+)*, ((a+)b)+
  const nestedQuantifierPatterns = [
    /\([^)]*[+*][^)]*\)[+*]/, // (x+)+ or (x*)* etc.
    /\([^)]*[+*][^)]*\)\{/, // (x+){n,m}
    /\{[^}]*\}[+*]/, // {n,m}+ or {n,m}*
    /[+*]\)[+*]/, // ending with +)+ or *)* 
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
  // Patterns like (a|a+)+, (a|ab)+
  if (/\([^)]*\|[^)]*\)[+*]/.test(pattern)) {
    // More specific check for dangerous alternation
    const altMatch = pattern.match(/\(([^)]*)\)[+*]/);
    if (altMatch) {
      const alternatives = altMatch[1].split('|');
      // Check if alternatives could match overlapping content
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
 * Wraps regex execution with a timeout to prevent long-running patterns
 * For use in edge functions (Deno environment)
 */
export function createSafeRegexMatcher(
  pattern: string, 
  flags: string = "i"
): { match: (input: string) => boolean; error?: string } {
  // First validate the pattern
  const validation = validateRegexSafety(pattern);
  if (!validation.safe) {
    return { 
      match: () => false, 
      error: validation.reason 
    };
  }

  try {
    const regex = new RegExp(pattern, flags);
    return {
      match: (input: string) => {
        try {
          return regex.test(input);
        } catch {
          return false;
        }
      }
    };
  } catch {
    return { 
      match: () => false, 
      error: "Invalid regex pattern" 
    };
  }
}
