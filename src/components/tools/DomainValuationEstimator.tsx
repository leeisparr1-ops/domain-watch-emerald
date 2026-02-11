import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { DollarSign, TrendingUp, TrendingDown, Minus, ShieldAlert, ShieldCheck } from "lucide-react";
import { checkTrademarkRisk, getTrademarkRiskDisplay, type TrademarkResult } from "@/lib/trademarkCheck";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface ValuationResult {
  estimatedValue: string;
  confidence: "High" | "Medium" | "Low";
  overallScore: number;
  factors: { label: string; score: number; maxScore: number; detail: string }[];
  trademark: TrademarkResult;
}

const PREMIUM_TLDS: Record<string, number> = {
  com: 25, net: 14, org: 13, io: 16, ai: 18, co: 14, app: 12, dev: 11, me: 9, xyz: 5, info: 4, biz: 3,
};

const PREMIUM_KEYWORDS = new Set([
  "ai", "crypto", "cloud", "tech", "pay", "bet", "buy", "sell", "trade", "bank", "cash", "loan",
  "health", "fit", "auto", "car", "home", "solar", "green", "data", "code", "web", "app", "game",
  "shop", "store", "deal", "sale", "food", "travel", "hotel", "dating", "jobs", "news", "legal",
]);

// Domains containing these words are worth very little (trademark, pharma, adult)
const PENALTY_KEYWORDS = new Set([
  "viagra", "cialis", "porn", "sex", "xxx", "casino", "gambling", "weed", "marijuana",
  "pharma", "drug", "pill", "medication", "prescription", "erectile", "penis", "nude",
  "naked", "adult", "escort", "bitcoin", "ethereum", "nft", "forex", "mlm", "scam",
  "hack", "crack", "pirate", "torrent", "replica", "fake", "counterfeit",
]);

// Common English words for word-boundary detection
const COMMON_WORDS = new Set([
  "the", "and", "for", "are", "but", "not", "you", "all", "can", "had", "her", "was", "one",
  "our", "out", "day", "get", "has", "him", "his", "how", "its", "may", "new", "now", "old",
  "see", "way", "who", "did", "got", "let", "say", "she", "too", "use", "big", "top", "best",
  "go", "no", "my", "up", "do", "so", "we", "if", "me", "on", "in", "it", "to", "be", "as",
  "at", "by", "or", "an", "of", "is",
  "air", "app", "art", "bay", "bed", "bit", "box", "bus", "buy", "cab", "cap", "cup", "cut",
  "dog", "dot", "dry", "eat", "end", "eye", "fan", "far", "fast", "fat", "few", "fin", "fix",
  "fit", "fly", "fun", "gap", "gas", "gem", "gold", "good", "great", "grow", "gun", "gym",
  "hat", "help", "hero", "high", "hill", "hit", "hold", "home", "hope", "host", "hot", "hub",
  "idea", "info", "ink", "inn", "iron", "item", "jack", "jam", "jet", "job", "join", "joy",
  "jump", "just", "keen", "keep", "key", "kid", "kind", "king", "kit", "know", "lab", "lake",
  "land", "lane", "last", "late", "lead", "leaf", "lean", "life", "lift", "light", "like",
  "line", "link", "lion", "list", "live", "lock", "logo", "long", "look", "loop", "love",
  "luck", "made", "mail", "main", "make", "mall", "map", "mark", "mart", "mate", "meal",
  "meet", "menu", "mind", "mine", "mint", "miss", "mix", "mode", "moon", "more", "most",
  "move", "much", "must", "name", "near", "neat", "need", "nest", "next", "nice", "nine",
  "node", "note", "nova", "null", "only", "open", "over", "own", "pack", "page", "paid",
  "pair", "palm", "park", "part", "pass", "past", "path", "peak", "pick", "pine", "pink",
  "pipe", "plan", "play", "plot", "plus", "pod", "pool", "port", "post", "pour", "power",
  "pre", "pro", "pull", "pump", "pure", "push", "put", "quiz", "race", "rain", "rank",
  "rapid", "rate", "raw", "ray", "read", "real", "red", "rent", "rest", "rich", "ride",
  "ring", "rise", "road", "rock", "roll", "roof", "room", "root", "rope", "rose", "rule",
  "run", "rush", "safe", "sage", "sail", "salt", "same", "sand", "save", "scan", "seed",
  "seek", "self", "send", "set", "ship", "shop", "show", "shut", "side", "sign", "silk",
  "site", "size", "skin", "slim", "slot", "slow", "smart", "snap", "snow", "soft", "sole",
  "some", "song", "soon", "sort", "soul", "spot", "star", "stay", "step", "stop", "such",
  "suit", "sun", "sure", "surf", "swap", "sync", "tab", "tag", "tail", "take", "talk",
  "tall", "tank", "tape", "task", "team", "tech", "tell", "term", "test", "text", "that",
  "them", "then", "they", "thin", "this", "tick", "tide", "tile", "time", "tiny", "tip",
  "told", "tone", "tool", "tour", "town", "trap", "tree", "trek", "trim", "trip", "true",
  "tube", "tune", "turn", "twin", "type", "unit", "upon", "used", "user", "vale", "van",
  "vary", "vast", "very", "view", "vine", "visa", "void", "volt", "vote", "wage", "wait",
  "wake", "walk", "wall", "want", "warm", "warn", "wash", "wave", "wear", "well", "went",
  "west", "what", "when", "wide", "wild", "will", "wind", "wine", "wing", "wire", "wise",
  "wish", "with", "wood", "word", "work", "worm", "wrap", "yard", "year", "yoga", "your",
  "zero", "zone", "zoom",
  "cloud", "smart", "green", "blue", "black", "white", "prime", "swift", "bright", "quick",
  "clean", "clear", "fresh", "global", "local", "super", "ultra", "micro", "macro", "mini",
  "max", "net", "web", "pay", "trade", "cash", "bank", "loan", "health", "solar", "data",
  "code", "game", "store", "deal", "sale", "food", "travel", "hotel", "legal",
  "crypto", "tech", "auto", "car", "fit", "dating", "news",
]);

/** Try to split a domain name into recognizable words */
function splitIntoWords(name: string): string[] {
  const words: string[] = [];
  let remaining = name.toLowerCase();
  let iterations = 0;
  while (remaining.length > 0 && iterations < 30) {
    iterations++;
    let found = false;
    for (let len = Math.min(remaining.length, 8); len >= 2; len--) {
      const candidate = remaining.substring(0, len);
      if (COMMON_WORDS.has(candidate) || PREMIUM_KEYWORDS.has(candidate)) {
        words.push(candidate);
        remaining = remaining.substring(len);
        found = true;
        break;
      }
    }
    if (!found) {
      words.push(remaining[0]);
      remaining = remaining.substring(1);
    }
  }
  return words;
}

function estimateValue(domain: string): ValuationResult {
  const parts = domain.toLowerCase().replace(/^www\./, "").split(".");
  const name = parts[0].replace(/[^a-z0-9]/g, "");
  const tld = parts[1] || "com";
  const factors: ValuationResult["factors"] = [];
  let total = 0;

  // Run trademark check
  const trademark = checkTrademarkRisk(domain);

  // 1. Length (max 20)
  let lengthScore = 0;
  let lengthDetail = "";
  if (name.length <= 2) { lengthScore = 20; lengthDetail = "ultra-short premium"; }
  else if (name.length === 3) { lengthScore = 18; lengthDetail = "3-letter premium"; }
  else if (name.length === 4) { lengthScore = 15; lengthDetail = "4-letter — strong"; }
  else if (name.length === 5) { lengthScore = 12; lengthDetail = "5-letter — good"; }
  else if (name.length <= 7) { lengthScore = 9; lengthDetail = "moderate length"; }
  else if (name.length <= 10) { lengthScore = 5; lengthDetail = "getting long"; }
  else if (name.length <= 14) { lengthScore = 2; lengthDetail = "long — harder to sell"; }
  else { lengthScore = 1; lengthDetail = "very long — low demand"; }
  factors.push({ label: "Length", score: lengthScore, maxScore: 20, detail: `${name.length} characters — ${lengthDetail}` });
  total += lengthScore;

  // 2. TLD Value (max 25)
  const tldScore = PREMIUM_TLDS[tld] || 3;
  factors.push({ label: "TLD Value", score: tldScore, maxScore: 25, detail: `.${tld} — ${tldScore >= 16 ? "high-demand extension" : tldScore >= 10 ? "solid extension" : "lower-demand extension"}` });
  total += tldScore;

  // 3. Word Quality & Meaning (max 20)
  const wordParts = splitIntoWords(name);
  const meaningfulWords = wordParts.filter(w => w.length >= 2 && (COMMON_WORDS.has(w) || PREMIUM_KEYWORDS.has(w)));
  const junkChars = wordParts.filter(w => w.length === 1 && !COMMON_WORDS.has(w)).length;
  const hasPenaltyWord = [...PENALTY_KEYWORDS].some(kw => name.includes(kw));
  const premiumMatches = meaningfulWords.filter(w => PREMIUM_KEYWORDS.has(w));

  let wordScore = 0;
  if (hasPenaltyWord) {
    wordScore = 1;
  } else if (meaningfulWords.length >= 2 && junkChars === 0) {
    wordScore = premiumMatches.length >= 1 ? 18 : 14;
  } else if (meaningfulWords.length === 1 && junkChars === 0 && name.length <= 8) {
    wordScore = premiumMatches.length >= 1 ? 16 : 12;
  } else if (meaningfulWords.length >= 1) {
    wordScore = 6 + Math.min(4, premiumMatches.length * 2);
  } else {
    wordScore = 2;
  }

  let wordDetail = "";
  if (hasPenaltyWord) {
    wordDetail = "Contains risky/trademark term — severely limits value";
  } else if (meaningfulWords.length >= 2 && junkChars === 0) {
    wordDetail = `Clean compound: "${meaningfulWords.join(" + ")}"`;
  } else if (meaningfulWords.length >= 1) {
    wordDetail = `Found: ${meaningfulWords.join(", ")}${junkChars > 0 ? ` (${junkChars} extra chars)` : ""}`;
  } else {
    wordDetail = "No recognizable words — harder to brand";
  }
  factors.push({ label: "Word Quality", score: wordScore, maxScore: 20, detail: wordDetail });
  total += wordScore;

  // 4. Brandability (max 15)
  const vowelCount = [...name].filter(c => "aeiouy".includes(c)).length;
  const ratio = vowelCount / name.length;
  const isPronounceable = ratio >= 0.25 && ratio <= 0.6 && !/[bcdfghjklmnpqrstvwxz]{4,}/i.test(name);
  const hasNaturalFlow = meaningfulWords.length >= 1 && junkChars <= 1;
  let brandScore = 0;
  if (hasPenaltyWord) {
    brandScore = 1;
  } else if (isPronounceable && hasNaturalFlow && name.length <= 8) {
    brandScore = 15;
  } else if (isPronounceable && hasNaturalFlow) {
    brandScore = 10;
  } else if (isPronounceable) {
    brandScore = 7;
  } else {
    brandScore = 3;
  }
  const brandDetail = hasPenaltyWord ? "Risky content — unbrandable" :
    (isPronounceable && hasNaturalFlow) ? "Easy to say and remember" :
    isPronounceable ? "Pronounceable but not a natural brand" :
    "Difficult to pronounce and brand";
  factors.push({ label: "Brandability", score: brandScore, maxScore: 15, detail: brandDetail });
  total += brandScore;

  // 5. Character Composition (max 10)
  const isAlpha = /^[a-z]+$/.test(name);
  const hasNumbers = /\d/.test(name);
  const isNumeric = /^\d+$/.test(name);
  const hasDashes = /[-_]/.test(parts[0]);
  let compScore = isAlpha ? 10 : isNumeric && name.length <= 4 ? 7 : hasDashes ? 2 : hasNumbers ? 4 : 5;
  const charDetail = isAlpha ? "Pure letters — most desirable" : isNumeric ? "Numeric domain" : hasDashes ? "Contains hyphens — low demand" : "Mixed characters";
  factors.push({ label: "Character Mix", score: compScore, maxScore: 10, detail: charDetail });
  total += compScore;

  // 6. Market Risk (max 10)
  let penaltyScore = 10;
  let penaltyDetail = "No negative signals";
  if (hasPenaltyWord) {
    penaltyScore = 0;
    penaltyDetail = "Trademark/adult/pharma content — major value penalty";
  } else if (name.length > 15) {
    penaltyScore = 3;
    penaltyDetail = "Excessive length reduces marketability";
  } else if (junkChars > 2) {
    penaltyScore = 4;
    penaltyDetail = "Unrecognizable character sequences";
  }
  factors.push({ label: "Market Risk", score: penaltyScore, maxScore: 10, detail: penaltyDetail });
  total += penaltyScore;

  // 7. Trademark Risk (new factor, max 10)
  let tmScore = 10;
  let tmDetail = "No known trademark conflicts";
  if (trademark.riskLevel === "high") {
    tmScore = 0;
    tmDetail = trademark.summary;
  } else if (trademark.riskLevel === "medium") {
    tmScore = 3;
    tmDetail = trademark.summary;
  } else if (trademark.riskLevel === "low") {
    tmScore = 6;
    tmDetail = trademark.summary;
  }
  factors.push({ label: "Trademark Risk", score: tmScore, maxScore: 10, detail: tmDetail });
  total += tmScore;

  // Recalculate value bands (now out of 110 max)
  const normalizedTotal = Math.round((total / 110) * 100);

  let valueMin: number, valueMax: number;
  if (hasPenaltyWord || trademark.riskLevel === "high") { valueMin = 5; valueMax = 50; }
  else if (normalizedTotal >= 90) { valueMin = 5000; valueMax = 25000; }
  else if (normalizedTotal >= 80) { valueMin = 2000; valueMax = 8000; }
  else if (normalizedTotal >= 70) { valueMin = 500; valueMax = 2500; }
  else if (normalizedTotal >= 60) { valueMin = 150; valueMax = 800; }
  else if (normalizedTotal >= 50) { valueMin = 50; valueMax = 300; }
  else if (normalizedTotal >= 40) { valueMin = 20; valueMax = 100; }
  else { valueMin = 5; valueMax = 50; }

  const confidence: ValuationResult["confidence"] = normalizedTotal >= 75 ? "High" : normalizedTotal >= 50 ? "Medium" : "Low";
  const estimatedValue = `$${valueMin.toLocaleString()} – $${valueMax.toLocaleString()}`;

  return { estimatedValue, confidence, overallScore: normalizedTotal, factors, trademark };
}

export function DomainValuationEstimator() {
  const [domain, setDomain] = useState("");
  const [result, setResult] = useState<ValuationResult | null>(null);

  const handleEstimate = () => {
    if (!domain.trim()) return;
    setResult(estimateValue(domain.trim()));
  };

  const confidenceColor = (c: string) => {
    if (c === "High") return "text-emerald-600 dark:text-emerald-400 border-emerald-300";
    if (c === "Medium") return "text-amber-600 dark:text-amber-400 border-amber-300";
    return "text-red-600 dark:text-red-400 border-red-300";
  };

  const scoreIcon = (score: number, max: number) => {
    const pct = score / max;
    if (pct >= 0.7) return <TrendingUp className="w-4 h-4 text-emerald-500" />;
    if (pct >= 0.4) return <Minus className="w-4 h-4 text-amber-500" />;
    return <TrendingDown className="w-4 h-4 text-red-500" />;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-primary" />
          Domain Valuation Estimator
        </CardTitle>
        <CardDescription>
          Get an instant estimated value based on length, TLD, keywords, brandability, character composition, and trademark risk.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex gap-3">
          <Input
            placeholder="Enter a domain (e.g. cloudpay.com)"
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleEstimate()}
            className="flex-1"
          />
          <Button onClick={handleEstimate} disabled={!domain.trim()}>
            Estimate
          </Button>
        </div>

        {result && (
          <div className="space-y-5 animate-fade-in">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <span className="text-sm text-muted-foreground">Estimated Value</span>
                <p className="text-3xl font-bold text-foreground">{result.estimatedValue}</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-center">
                  <span className="text-sm text-muted-foreground block">Score</span>
                  <span className="text-2xl font-bold text-foreground">{result.overallScore}</span>
                  <span className="text-sm text-muted-foreground"> / 100</span>
                </div>
                <Badge variant="outline" className={`text-sm px-3 py-1 ${confidenceColor(result.confidence)}`}>
                  {result.confidence} Confidence
                </Badge>
              </div>
            </div>

            <Progress value={result.overallScore} className="h-3" />

            {/* Trademark Alert */}
            {result.trademark.riskLevel !== "none" && (
              <div className={`p-3 rounded-lg border ${result.trademark.riskLevel === "high" ? "border-red-500/20 bg-red-500/5" : result.trademark.riskLevel === "medium" ? "border-orange-500/20 bg-orange-500/5" : "border-yellow-500/20 bg-yellow-500/5"}`}>
                <div className="flex items-start gap-3">
                  <ShieldAlert className="w-5 h-5 text-red-500 mt-0.5" />
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-semibold text-foreground">Trademark Warning</span>
                      <Badge variant="outline" className={`text-xs ${getTrademarkRiskDisplay(result.trademark.riskLevel).color}`}>
                        {getTrademarkRiskDisplay(result.trademark.riskLevel).label}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{result.trademark.summary}</p>
                    {result.trademark.matches.length > 0 && (
                      <div className="flex gap-1.5 mt-2 flex-wrap">
                        {result.trademark.matches.map((m, i) => (
                          <Badge key={i} variant="outline" className="text-xs">
                            {m.brand} ({m.matchType})
                          </Badge>
                        ))}
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground/70 mt-2">
                      ⚠️ Domains infringing trademarks risk UDRP disputes and forced transfers. Value capped accordingly.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-foreground">Factor Breakdown</h4>
              {result.factors.map((f, i) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-secondary/50">
                  {scoreIcon(f.score, f.maxScore)}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-foreground">{f.label}</span>
                      <span className="text-xs text-muted-foreground">{f.score}/{f.maxScore}</span>
                    </div>
                    <Progress value={(f.score / f.maxScore) * 100} className="h-1.5 mb-1" />
                    <p className="text-sm text-muted-foreground">{f.detail}</p>
                  </div>
                </div>
              ))}
            </div>

            <p className="text-xs text-muted-foreground italic">
              * Algorithmic estimate for guidance only. Trademark check covers ~200 major brands — not legal advice. 
              Actual market value depends on demand, comparable sales, traffic, and other factors. Always consult a trademark attorney before major acquisitions.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
