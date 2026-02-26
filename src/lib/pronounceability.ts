// Pronounceability scoring algorithm for domain names

const VOWELS = new Set("aeiouy");
const CONSONANTS = new Set("bcdfghjklmnpqrstvwxz");

// Common pronounceable bigrams
const GOOD_BIGRAMS = new Set([
  "th", "he", "in", "er", "an", "re", "on", "at", "en", "nd",
  "ti", "es", "or", "te", "of", "ed", "is", "it", "al", "ar",
  "st", "to", "nt", "ng", "se", "ha", "as", "ou", "io", "le",
  "ve", "co", "me", "de", "hi", "ri", "ro", "ic", "ne", "ea",
  "ra", "ce", "li", "ch", "ll", "be", "ma", "si", "om", "ur",
  "ca", "el", "ta", "la", "ns", "ge", "ly", "ei", "os", "il",
  "no", "pe", "do", "su", "pa", "ec", "ac", "ot", "di", "ol",
  "tr", "sh", "pr", "pl", "cr", "bl", "fl", "gr", "br", "cl",
  "dr", "fr", "gl", "sl", "sp", "sw", "tw", "wr", "sc", "sk",
  "sm", "sn", "sq", "str", "spr",
]);

// Difficult consonant clusters
const BAD_CLUSTERS = /[bcdfghjklmnpqrstvwxz]{4,}|^[bcdfghjklmnpqrstvwxz]{3}|[bcdfghjklmnpqrstvwxz]{3}$/i;

// Common English words used in domain names (for accurate word splitting)
export const COMMON_WORDS = new Set([
  // 2-letter
  "go", "my", "up", "do", "no", "so", "we", "be", "me", "he", "it", "in", "on", "at", "to", "or", "an", "by", "if", "of",
  // 3-letter
  "the", "and", "for", "get", "buy", "top", "hot", "big", "new", "now", "all", "one", "two", "web", "app", "hub", "pro", "fix", "max", "pay", "bet", "bit", "fit", "hit", "kit", "let", "net", "pet", "set", "yet", "dot", "got", "lot", "not", "pot", "cut", "gut", "hut", "nut", "put", "run", "fun", "sun", "car", "bar", "far", "air", "day", "way", "say", "may", "try", "fly", "sky", "dry", "eye", "use", "see", "old", "own", "out", "off", "job", "box", "dog", "log", "fog", "red", "bed", "cup", "map", "hat", "ice", "age", "add", "arm", "art", "bag", "ban", "bow", "bus", "can", "cap", "cow", "dam", "dip", "due", "dug", "ear", "eat", "egg", "end", "era", "fan", "fat", "fee", "few", "fig", "fin", "fur", "gap", "gas", "gem", "gin", "gum", "gun", "gym", "hen", "hip", "hog", "hop", "ink", "inn", "ion", "ivy", "jam", "jar", "jaw", "jet", "jog", "joy", "jug", "key", "kin", "lab", "lap", "law", "lay", "leg", "lid", "lip", "lit", "low", "mad", "man", "mat", "men", "mid", "mix", "mob", "mom", "mop", "mud", "mug", "nap", "nor", "now", "oak", "oar", "oat", "odd", "oil", "opt", "orb", "ore", "oven", "owl", "pad", "pan", "paw", "pea", "pen", "pie", "pig", "pin", "pit", "pod", "pop", "pub", "pug", "ram", "ran", "rap", "rat", "raw", "ray", "rib", "rid", "rim", "rip", "rob", "rod", "rot", "row", "rug", "rum", "rut", "sad", "sap", "sat", "saw", "sea", "sew", "shy", "sin", "sip", "sir", "sit", "six", "ski", "sly", "sob", "sod", "son", "sow", "spa", "spy", "sum", "tab", "tag", "tan", "tap", "tar", "tea", "ten", "the", "tie", "tin", "tip", "toe", "ton", "tow", "toy", "tub", "tug", "van", "vat", "vet", "vow", "wag", "war", "wax", "wig", "win", "wit", "wok", "won", "woo", "yam", "yap", "yew", "zip", "zoo",
  // 4-letter
  "deal", "find", "save", "best", "free", "fast", "easy", "home", "shop", "club", "life", "love", "live", "work", "play", "game", "food", "tech", "auto", "book", "cash", "code", "cool", "core", "data", "edge", "fire", "flex", "flow", "gold", "grid", "grow", "hack", "idea", "info", "jump", "king", "labs", "link", "loop", "mind", "mode", "next", "open", "pack", "path", "peak", "plan", "plus", "push", "rank", "real", "ring", "rise", "road", "rock", "rush", "seed", "snap", "solo", "spot", "star", "sure", "swap", "sync", "team", "time", "tool", "true", "turn", "unit", "vast", "view", "volt", "wave", "wise", "word", "wrap", "zero", "zone", "buzz", "chat", "chip", "city", "coin", "copy", "desk", "disk", "dock", "drop", "edit", "farm", "film", "firm", "flag", "fold", "fork", "form", "fuel", "gain", "gate", "gear", "gift", "glow", "grab", "grip", "hash", "hawk", "heat", "help", "high", "hint", "hook", "host", "hunt", "icon", "item", "join", "just", "keen", "keep", "kick", "kind", "land", "last", "lead", "leaf", "lean", "lift", "line", "list", "load", "lock", "long", "loom", "loot", "luck", "made", "mail", "main", "make", "mark", "mart", "mass", "mate", "mega", "mesh", "mile", "mill", "mine", "mint", "miss", "mood", "moon", "more", "move", "much", "muse", "name", "near", "nest", "node", "note", "odds", "orca", "pace", "page", "pair", "palm", "part", "pass", "past", "pick", "pine", "pipe", "play", "plug", "poll", "pool", "port", "post", "pure", "quiz", "race", "raft", "raid", "rail", "rain", "rare", "rate", "reed", "reef", "reel", "rent", "rest", "rich", "ride", "role", "roll", "root", "rope", "rule", "safe", "sage", "sail", "sale", "salt", "sand", "scan", "seal", "seek", "self", "sell", "send", "ship", "show", "side", "sign", "silk", "site", "size", "skip", "slot", "slow", "snow", "soft", "sort", "soul", "spin", "stem", "step", "stop", "suit", "surf", "tail", "take", "talk", "tank", "tape", "task", "tell", "tend", "test", "text", "tide", "tier", "tile", "tiny", "tone", "tops", "tour", "town", "tree", "trim", "trip", "tube", "tune", "type", "used", "vale", "vibe", "vine", "void", "vote", "wage", "wait", "walk", "wall", "want", "ward", "warm", "wash", "weak", "wear", "week", "well", "west", "wide", "wild", "will", "wind", "wine", "wing", "wire", "wish", "wood", "yard", "cube", "bike", "bone", "bore", "cage", "cake", "came", "cape", "care", "case", "cave", "dare", "date", "dice", "dime", "dine", "dive", "dome", "done", "dose", "dove", "duke", "dune", "dupe", "face", "fade", "fame", "fare", "fate", "faze", "file", "fine", "five", "flee", "fore", "frog", "fume", "fuse", "gave", "gaze", "gone", "gore", "hare", "hate", "have", "haze", "here", "hide", "hike", "hire", "hole", "hope", "hose", "huge", "jade", "jake", "joke", "kite", "knee", "lace", "lake", "lame", "lane", "late", "lime", "lire", "lobe", "lone", "lore", "lose", "lure", "lute", "mace", "mare", "maze", "mice", "mike", "mire", "mole", "mope", "mule", "mute", "nice", "nine", "none", "nose", "ooze", "pale", "pane", "pare", "pave", "pile", "poke", "pole", "pore", "pose", "rage", "rake", "rave", "raze", "rice", "rife", "rime", "ripe", "robe", "rode", "rose", "rude", "sake", "same", "sane", "save", "shoe", "some", "sore", "sure", "tame", "tape", "tire", "tore", "tote", "vice", "wade", "wage", "wake", "wane", "ware", "wave", "wile", "wipe", "woke", "wove", "yoke",
  // 5-letter
  "boost", "brain", "brand", "build", "buyer", "chain", "cheap", "clean", "click", "close", "cloud", "coach", "craft", "cream", "crowd", "cycle", "daily", "delta", "drive", "eagle", "earth", "elite", "email", "entry", "equal", "event", "extra", "field", "first", "flash", "fleet", "float", "focus", "force", "forge", "forum", "found", "fresh", "front", "funds", "giant", "grace", "grade", "grand", "grant", "grape", "graph", "green", "group", "guard", "guide", "happy", "haven", "heart", "house", "human", "hyper", "index", "inner", "input", "intel", "judge", "juice", "laser", "layer", "level", "light", "local", "logic", "maker", "maple", "match", "media", "merge", "micro", "model", "money", "motor", "mount", "music", "noble", "north", "noted", "novel", "ocean", "offer", "order", "outer", "owner", "panel", "parse", "party", "patch", "penny", "phase", "phone", "piece", "pilot", "pixel", "place", "plant", "plaza", "point", "power", "press", "price", "prime", "print", "prize", "proof", "pulse", "punch", "quest", "queue", "quick", "quote", "radar", "radio", "raise", "range", "rapid", "reach", "ready", "realm", "reign", "relay", "renew", "rider", "right", "river", "robin", "royal", "rural", "sauce", "scale", "scene", "scope", "score", "scout", "sense", "serve", "seven", "shape", "share", "shift", "shine", "sight", "sigma", "since", "sixty", "skill", "slate", "sleep", "slide", "small", "smart", "smile", "snack", "solar", "solid", "solve", "south", "space", "spark", "speak", "speed", "spice", "spike", "spine", "split", "stack", "stage", "stake", "stand", "start", "state", "steam", "steel", "steep", "stock", "stone", "store", "storm", "story", "stove", "strap", "strip", "study", "style", "sugar", "super", "surge", "sweet", "swift", "swipe", "table", "taste", "theme", "think", "tiger", "titan", "token", "total", "touch", "tower", "trace", "track", "trade", "trail", "train", "trait", "trend", "trial", "tribe", "trick", "trust", "turbo", "twist", "ultra", "union", "unity", "upper", "urban", "usage", "valid", "value", "vault", "venue", "vigor", "viral", "voice", "watch", "water", "whale", "wheel", "white", "world", "worth", "yield",
  // 6+ letter
  "action", "anchor", "beyond", "bridge", "bright", "bundle", "canvas", "center", "choice", "circle", "clinic", "crypto", "custom", "decode", "delete", "design", "direct", "domain", "double", "enable", "energy", "engine", "expert", "falcon", "filter", "finder", "flight", "global", "golden", "growth", "health", "impact", "import", "inside", "invest", "launch", "leader", "legend", "market", "master", "matrix", "method", "mobile", "modern", "motion", "native", "nature", "online", "option", "output", "palace", "partner", "pocket", "portal", "profit", "public", "purple", "quest", "ranking", "record", "remote", "report", "result", "rocket", "sample", "search", "secure", "select", "signal", "silver", "simple", "single", "social", "source", "sphere", "sprint", "square", "status", "stream", "street", "string", "strike", "strong", "studio", "summit", "supply", "switch", "system", "target", "thread", "ticket", "timber", "toggle", "travel", "triple", "turret", "unique", "unlock", "update", "venture", "vision", "wonder",
]);

/**
 * Estimate word count in a domain name by finding the best split
 * using a dictionary-backed greedy approach.
 */
export function countWords(name: string): number {
  const lower = name.toLowerCase().replace(/[^a-z]/g, "");
  if (lower.length <= 2) return 1;
  
  // Try greedy longest-match from left to right
  const words: string[] = [];
  let i = 0;
  while (i < lower.length) {
    let best = 1; // default: single character = part of a word
    // Try lengths from longest to shortest
    for (let len = Math.min(lower.length - i, 10); len >= 2; len--) {
      const candidate = lower.slice(i, i + len);
      if (COMMON_WORDS.has(candidate)) {
        best = len;
        break;
      }
    }
    if (best >= 2) {
      words.push(lower.slice(i, i + best));
      i += best;
    } else {
      // Accumulate single chars into the previous or next word
      if (words.length > 0) {
        words[words.length - 1] += lower[i];
      } else {
        words.push(lower[i]);
      }
      i++;
    }
  }
  
  // Merge any single-char fragments
  return words.filter(w => w.length >= 2).length || 1;
}

export interface PronounceabilityResult {
  score: number; // 0-100
  grade: "Excellent" | "Good" | "Fair" | "Poor";
  wordCount: number;
  factors: { label: string; impact: "positive" | "negative" | "neutral"; detail: string }[];
}

/**
 * Count syllables for a single word segment, handling common suffixes.
 */
function wordSyllables(word: string): number {
  if (word.length <= 2) return 1;

  let extra = 0;
  let w = word;

  // Strip common syllable-adding suffixes
  const suffixes: { suffix: string; syl: number }[] = [
    { suffix: "tion", syl: 1 },
    { suffix: "sion", syl: 1 },
    { suffix: "ious", syl: 2 },
    { suffix: "eous", syl: 2 },
    { suffix: "able", syl: 2 },
    { suffix: "ible", syl: 2 },
    { suffix: "ness", syl: 1 },
    { suffix: "ment", syl: 1 },
    { suffix: "ing", syl: 1 },
    { suffix: "ful", syl: 1 },
    { suffix: "less", syl: 1 },
    { suffix: "ize", syl: 1 },
    { suffix: "ise", syl: 1 },
    { suffix: "ous", syl: 1 },
    { suffix: "ive", syl: 1 },
    { suffix: "ly", syl: 1 },
    { suffix: "er", syl: 1 },
    { suffix: "est", syl: 1 },
  ];

  for (const { suffix, syl } of suffixes) {
    if (w.endsWith(suffix) && w.length > suffix.length + 1) {
      extra += syl;
      w = w.slice(0, -suffix.length);
      break;
    }
  }

  // Handle "-ed": only adds a syllable after t/d
  if (!extra && w.endsWith("ed") && w.length > 3) {
    const beforeEd = w[w.length - 3];
    if (beforeEd === "t" || beforeEd === "d") {
      extra += 1;
    }
    w = w.slice(0, -2);
  }

  // Count vowel groups in remaining stem
  let count = 0;
  let prevVowel = false;
  for (const ch of w) {
    const isV = "aeiouy".includes(ch);
    if (isV && !prevVowel) count++;
    prevVowel = isV;
  }

  // Silent-e at end of stem
  if (w.length > 2 && w.endsWith("e") && !"aeiouy".includes(w[w.length - 2]) && count > 1) {
    count--;
  }

  return Math.max(1, count + extra);
}

/**
 * Count syllables in a domain name by first splitting into known words,
 * then counting syllables per word segment. This correctly handles
 * compound domains like "goodgoing" (3 syllables, not 2).
 */
export function countSyllables(name: string): number {
  const lower = name.toLowerCase().replace(/[^a-z]/g, "");
  if (!lower) return 0;

  // Split into known words using greedy match
  const segments: string[] = [];
  let i = 0;
  while (i < lower.length) {
    let best = 0;
    for (let len = Math.min(lower.length - i, 15); len >= 2; len--) {
      const slice = lower.slice(i, i + len);
      if (COMMON_WORDS.has(slice)) {
        best = len;
        break;
      }
    }
    if (best >= 2) {
      segments.push(lower.slice(i, i + best));
      i += best;
    } else {
      // Append leftover char to previous segment or start new one
      if (segments.length > 0) {
        segments[segments.length - 1] += lower[i];
      } else {
        segments.push(lower[i]);
      }
      i++;
    }
  }

  let total = 0;
  for (const seg of segments) {
    total += wordSyllables(seg);
  }
  return Math.max(1, total);
}

// ─── Syllable Stress Patterns ───
// Domains with natural stress patterns (trochaic: STRONG-weak) are easier to say
const STRESSED_ENDINGS = new Set(["tion", "sion", "ment", "ness", "ful", "less", "able", "ible", "ous", "ive", "ize", "ise", "ent", "ant", "ence", "ance"]);
const UNSTRESSED_PREFIXES = new Set(["pre", "pro", "un", "re", "de", "mis", "dis", "over", "under", "out"]);

function stressPatternScore(name: string): { score: number; detail: string } {
  const syllables = countSyllables(name);
  
  // 2-3 syllable names with natural trochaic stress are ideal for brands
  if (syllables >= 2 && syllables <= 3) {
    // Check for stressed ending patterns (these create natural rhythm)
    for (const ending of STRESSED_ENDINGS) {
      if (name.endsWith(ending)) {
        return { score: 8, detail: "Natural stress pattern — rhythmic and memorable" };
      }
    }
    // Check for common unstressed prefixes (creates WEAK-STRONG pattern, slightly less ideal)
    for (const prefix of UNSTRESSED_PREFIXES) {
      if (name.startsWith(prefix) && name.length > prefix.length + 2) {
        return { score: 5, detail: "Prefix-stress pattern — familiar rhythm" };
      }
    }
    // Check vowel-consonant alternation (creates natural flow)
    let alternations = 0;
    for (let i = 1; i < Math.min(name.length, 8); i++) {
      const prevIsVowel = "aeiouy".includes(name[i - 1]);
      const currIsVowel = "aeiouy".includes(name[i]);
      if (prevIsVowel !== currIsVowel) alternations++;
    }
    const altRatio = alternations / (Math.min(name.length, 8) - 1);
    if (altRatio >= 0.6) {
      return { score: 7, detail: "Alternating vowel-consonant flow — very smooth" };
    }
    return { score: 3, detail: "Acceptable stress pattern" };
  }
  
  if (syllables === 1) return { score: 4, detail: "Single syllable — punchy but simple" };
  return { score: 0, detail: "Complex stress pattern — harder to remember" };
}

// ─── Negative Connotation Detection ───
const NEGATIVE_SOUND_PATTERNS = [
  { pattern: /gr[auo]n/i, detail: "Contains 'groan/grunt' sound — negative connotation" },
  { pattern: /ugh/i, detail: "Contains 'ugh' sound — negative connotation" },
  { pattern: /blech|bleh/i, detail: "Contains disgust sound" },
  { pattern: /sn[aoi]r/i, detail: "Contains 'snarl/snore' sound — unfriendly" },
  { pattern: /scr[aue]/i, detail: "Contains 'scrape/scream' sound — harsh" },
  { pattern: /squ[eai]/i, detail: "Contains 'squeal/squash' sound — unpleasant" },
  { pattern: /cr[auo][nwk]/i, detail: "Contains 'croak/crank' sound — negative" },
];

function negativeConnotationPenalty(name: string): { penalty: number; detail: string } {
  for (const { pattern, detail } of NEGATIVE_SOUND_PATTERNS) {
    if (pattern.test(name)) {
      return { penalty: -5, detail };
    }
  }
  return { penalty: 0, detail: "" };
}

export function scorePronounceability(domain: string): PronounceabilityResult {
  // Strip TLD
  const name = domain.split(".")[0].toLowerCase().replace(/[^a-z]/g, "");
  if (!name) return { score: 0, grade: "Poor", wordCount: 0, factors: [{ label: "Empty", impact: "negative", detail: "No valid characters" }] };

  let score = 50; // Start neutral
  const factors: PronounceabilityResult["factors"] = [];
  const wordCount = countWords(name);

  // 1. Length check (ideal 4-8)
  if (name.length <= 8 && name.length >= 4) {
    score += 15;
    factors.push({ label: "Length", impact: "positive", detail: `${name.length} characters — ideal length` });
  } else if (name.length <= 12) {
    score += 5;
    factors.push({ label: "Length", impact: "neutral", detail: `${name.length} characters — slightly long` });
  } else {
    score -= 10;
    factors.push({ label: "Length", impact: "negative", detail: `${name.length} characters — too long to remember easily` });
  }

  // 2. Word count
  if (wordCount === 1) {
    score += 5;
    factors.push({ label: "Word Count", impact: "positive", detail: `Single word — concise and memorable` });
  } else if (wordCount === 2) {
    score += 2;
    factors.push({ label: "Word Count", impact: "neutral", detail: `2 words — easy compound name` });
  } else if (wordCount === 3) {
    score -= 5;
    factors.push({ label: "Word Count", impact: "neutral", detail: `3 words — getting long but workable` });
  } else {
    score -= 15;
    factors.push({ label: "Word Count", impact: "negative", detail: `${wordCount} words — too many words to remember` });
  }

  // 3. Vowel/consonant ratio
  const vowelCount = [...name].filter(c => VOWELS.has(c)).length;
  const ratio = vowelCount / name.length;
  if (ratio >= 0.3 && ratio <= 0.55) {
    score += 15;
    factors.push({ label: "Vowel Balance", impact: "positive", detail: `${Math.round(ratio * 100)}% vowels — natural flow` });
  } else if (ratio >= 0.2 && ratio <= 0.65) {
    score += 5;
    factors.push({ label: "Vowel Balance", impact: "neutral", detail: `${Math.round(ratio * 100)}% vowels — acceptable` });
  } else {
    score -= 15;
    factors.push({ label: "Vowel Balance", impact: "negative", detail: `${Math.round(ratio * 100)}% vowels — hard to pronounce` });
  }

  // 4. Consonant clusters
  if (BAD_CLUSTERS.test(name)) {
    score -= 20;
    factors.push({ label: "Consonant Clusters", impact: "negative", detail: "Contains difficult consonant groups" });
  } else {
    score += 10;
    factors.push({ label: "Consonant Clusters", impact: "positive", detail: "No difficult consonant clusters" });
  }

  // 5. Bigram analysis
  let goodBigrams = 0;
  for (let i = 0; i < name.length - 1; i++) {
    if (GOOD_BIGRAMS.has(name.slice(i, i + 2))) goodBigrams++;
  }
  const bigramRatio = name.length > 1 ? goodBigrams / (name.length - 1) : 0;
  if (bigramRatio >= 0.5) {
    score += 15;
    factors.push({ label: "Letter Patterns", impact: "positive", detail: "Uses common, easy letter combinations" });
  } else if (bigramRatio >= 0.25) {
    score += 5;
    factors.push({ label: "Letter Patterns", impact: "neutral", detail: "Some familiar letter patterns" });
  } else {
    score -= 10;
    factors.push({ label: "Letter Patterns", impact: "negative", detail: "Unusual letter combinations" });
  }

  // 6. Syllable estimate (word-aware)
  const syllables = countSyllables(name);
  if (syllables >= 2 && syllables <= 3) {
    score += 10;
    factors.push({ label: "Syllables", impact: "positive", detail: `~${syllables} syllables — easy to say` });
  } else if (syllables === 1 || syllables === 4) {
    score += 3;
    factors.push({ label: "Syllables", impact: "neutral", detail: `~${syllables} syllable${syllables > 1 ? "s" : ""} — acceptable` });
  } else {
    score -= 10;
    factors.push({ label: "Syllables", impact: "negative", detail: `~${syllables} syllables — too many` });
  }

  // 7. Repeated characters
  if (/(.)\1{2,}/i.test(name)) {
    score -= 10;
    factors.push({ label: "Repetition", impact: "negative", detail: "Contains triple+ repeated characters" });
  }

  // 8. Syllable stress pattern analysis (NEW)
  const stress = stressPatternScore(name);
  if (stress.score > 0) {
    score += stress.score;
    factors.push({
      label: "Stress Pattern",
      impact: stress.score >= 6 ? "positive" : "neutral",
      detail: stress.detail,
    });
  }

  // 9. Negative connotation detection (NEW)
  const negConnotation = negativeConnotationPenalty(name);
  if (negConnotation.penalty < 0) {
    score += negConnotation.penalty;
    factors.push({ label: "Sound Connotation", impact: "negative", detail: negConnotation.detail });
  }

  // Clamp
  score = Math.max(0, Math.min(100, score));

  const grade: PronounceabilityResult["grade"] =
    score >= 80 ? "Excellent" : score >= 60 ? "Good" : score >= 40 ? "Fair" : "Poor";

  return { score, grade, wordCount, factors };
}
