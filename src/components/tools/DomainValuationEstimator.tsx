import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { DollarSign, TrendingUp, TrendingDown, Minus, ShieldAlert, ShieldCheck, Flame, BarChart3, Target } from "lucide-react";
import { checkTrademarkRisk, getTrademarkRiskDisplay, type TrademarkResult } from "@/lib/trademarkCheck";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  PREMIUM_TLDS,
  PREMIUM_KEYWORDS,
  PENALTY_KEYWORDS,
  DICTIONARY_WORDS,
  TRENDING_KEYWORDS,
  NICHE_CATEGORIES,
  splitIntoWords,
  isSingleDictionaryWord,
  getTrendingMultiplier,
  detectNiche,
  computeTrendScore,
  type NicheDetection,
} from "@/lib/domainValuation";

interface ValuationResult {
  estimatedValue: string;
  confidence: "High" | "Medium" | "Low";
  overallScore: number;
  factors: { label: string; score: number; maxScore: number; detail: string }[];
  trademark: TrademarkResult;
  comparableSales: ComparableSale[];
  trendScore: number;
  trendLabel: string;
  niche: NicheDetection;
}

interface ComparableSale {
  domain: string;
  price: string;
  date: string;
  pattern: string;
  keywords?: string[];
}

// Curated comparable sales from publicly reported aftermarket data.
const COMPARABLE_SALES: ComparableSale[] = [
  // Ultra-short / 2-3 letter
  { domain: "AI.com", price: "$11,000,000", date: "2023", pattern: "2-letter .com", keywords: ["ai"] },
  { domain: "TX.com", price: "$950,000", date: "2024", pattern: "2-letter .com", keywords: ["tx"] },
  { domain: "GPT.ai", price: "$152,000", date: "2024", pattern: "3-letter .ai", keywords: ["gpt"] },
  { domain: "VPN.com", price: "$610,000", date: "2023", pattern: "3-letter .com", keywords: ["vpn"] },
  // Single-word .com
  { domain: "Bets.com", price: "$4,350,000", date: "2024", pattern: "single-word .com", keywords: ["bet", "bets"] },
  { domain: "Fuel.com", price: "$725,000", date: "2024", pattern: "single-word .com", keywords: ["fuel"] },
  { domain: "Hype.com", price: "$500,000", date: "2024", pattern: "single-word .com", keywords: ["hype"] },
  { domain: "Odds.com", price: "$440,000", date: "2024", pattern: "single-word .com", keywords: ["odds"] },
  { domain: "Connect.com", price: "$600,000", date: "2024", pattern: "single-word .com", keywords: ["connect"] },
  { domain: "Wallet.com", price: "$350,000", date: "2024", pattern: "single-word .com", keywords: ["wallet"] },
  { domain: "Shield.com", price: "$120,000", date: "2024", pattern: "single-word .com", keywords: ["shield"] },
  { domain: "Launch.com", price: "$175,000", date: "2023", pattern: "single-word .com", keywords: ["launch"] },
  { domain: "Harvest.com", price: "$115,000", date: "2024", pattern: "single-word .com", keywords: ["harvest"] },
  { domain: "Growth.com", price: "$280,000", date: "2024", pattern: "single-word .com", keywords: ["growth"] },
  { domain: "Dream.com", price: "$200,000", date: "2024", pattern: "single-word .com", keywords: ["dream"] },
  { domain: "Crown.com", price: "$145,000", date: "2024", pattern: "single-word .com", keywords: ["crown"] },
  { domain: "Ocean.com", price: "$185,000", date: "2024", pattern: "single-word .com", keywords: ["ocean"] },
  { domain: "Silver.com", price: "$250,000", date: "2024", pattern: "single-word .com", keywords: ["silver"] },
  { domain: "Rocket.com", price: "$155,000", date: "2024", pattern: "single-word .com", keywords: ["rocket"] },
  // 2025-2026 premium sales
  { domain: "Midnight.com", price: "$1,150,000", date: "2025", pattern: "single-word .com", keywords: ["midnight"] },
  { domain: "C4.com", price: "$265,000", date: "2025", pattern: "2-char .com", keywords: [] },
  { domain: "Surface.ai", price: "$110,000", date: "2025", pattern: "single-word .ai", keywords: ["surface"] },
  { domain: "Speed.ai", price: "$165,000", date: "2025", pattern: "single-word .ai", keywords: ["speed"] },
  { domain: "Synthetic.ai", price: "$100,000", date: "2025", pattern: "single-word .ai", keywords: ["synthetic"] },
  { domain: "Amber.ai", price: "$115,000", date: "2025", pattern: "single-word .ai", keywords: ["amber"] },
  // Two-word brandable .com
  { domain: "CloudBank.com", price: "$62,500", date: "2024", pattern: "two-word brandable .com", keywords: ["cloud", "bank"] },
  { domain: "PayHub.com", price: "$45,000", date: "2024", pattern: "two-word brandable .com", keywords: ["pay", "hub"] },
  { domain: "DataFlow.com", price: "$38,000", date: "2024", pattern: "two-word brandable .com", keywords: ["data", "flow"] },
  { domain: "SmartHome.com", price: "$52,000", date: "2023", pattern: "two-word brandable .com", keywords: ["smart", "home"] },
  { domain: "HealthHub.com", price: "$33,000", date: "2024", pattern: "two-word brandable .com", keywords: ["health", "hub"] },
  { domain: "TechStack.com", price: "$22,000", date: "2024", pattern: "two-word brandable .com", keywords: ["tech", "stack"] },
  { domain: "FastTrack.com", price: "$35,000", date: "2023", pattern: "two-word brandable .com", keywords: ["fast", "track"] },
  { domain: "TrueNorth.com", price: "$25,000", date: "2024", pattern: "two-word brandable .com", keywords: ["true", "north"] },
  { domain: "WildFire.com", price: "$22,000", date: "2023", pattern: "two-word brandable .com", keywords: ["wild", "fire"] },
  { domain: "MoonLight.com", price: "$35,000", date: "2024", pattern: "two-word brandable .com", keywords: ["moon", "light"] },
  // Trending AI/crypto/fintech
  { domain: "DeepAI.com", price: "$180,000", date: "2024", pattern: "AI keyword .com", keywords: ["deep", "ai"] },
  { domain: "TradeBot.com", price: "$42,000", date: "2024", pattern: "fintech keyword .com", keywords: ["trade", "bot"] },
  { domain: "CryptoVault.com", price: "$55,000", date: "2023", pattern: "crypto keyword .com", keywords: ["crypto", "vault"] },
  // .io domains
  { domain: "Stack.io", price: "$40,000", date: "2024", pattern: "single-word .io", keywords: ["stack"] },
  { domain: "Deploy.io", price: "$18,000", date: "2024", pattern: "single-word .io", keywords: ["deploy"] },
  { domain: "Auth.io", price: "$25,000", date: "2024", pattern: "single-word .io", keywords: ["auth"] },
  { domain: "Growth.io", price: "$22,000", date: "2024", pattern: "single-word .io", keywords: ["growth"] },
  // .ai domains
  { domain: "Trade.ai", price: "$75,000", date: "2024", pattern: "single-word .ai", keywords: ["trade"] },
  { domain: "Health.ai", price: "$55,000", date: "2024", pattern: "single-word .ai", keywords: ["health"] },
  { domain: "Cloud.ai", price: "$48,000", date: "2024", pattern: "single-word .ai", keywords: ["cloud"] },
  { domain: "Growth.ai", price: "$32,000", date: "2024", pattern: "single-word .ai", keywords: ["growth"] },
  // Generic / ccTLD
  { domain: "BestDeals.com", price: "$12,000", date: "2024", pattern: "two-word generic .com", keywords: ["best", "deal", "deals"] },
  { domain: "Tech.co.uk", price: "$6,500", date: "2024", pattern: "single-word ccTLD", keywords: ["tech"] },
  { domain: "Jobs.ca", price: "$12,500", date: "2024", pattern: "single-word ccTLD", keywords: ["jobs"] },
];

function findComparableSales(domain: string, score: number, domainWords: string[]): ComparableSale[] {
  const parts = domain.toLowerCase().replace(/^www\./, "").split(".");
  const name = parts[0].replace(/[^a-z0-9]/g, "");
  const tld = parts.slice(1).join(".");
  const inputWords = domainWords.filter(w => w.length >= 2).map(w => w.toLowerCase());

  const scored: { sale: ComparableSale; relevance: number }[] = [];

  for (const sale of COMPARABLE_SALES) {
    const saleParts = sale.domain.toLowerCase().split(".");
    const saleName = saleParts[0];
    const saleTld = saleParts.slice(1).join(".");
    const saleKeywords = sale.keywords || [];

    let wordMatches = 0;
    for (const word of inputWords) {
      if (saleKeywords.includes(word)) wordMatches++;
    }
    if (wordMatches === 0) continue;

    let relevance = wordMatches * 5;
    if (saleTld === tld) relevance += 2;
    else if (saleTld.endsWith("com") && tld.endsWith("com")) relevance += 1;
    const lenDiff = Math.abs(saleName.length - name.length);
    if (lenDiff <= 2) relevance += 2;
    else if (lenDiff <= 4) relevance += 1;
    if (saleKeywords.length === inputWords.length) relevance += 1;

    scored.push({ sale, relevance });
  }

  return scored.sort((a, b) => b.relevance - a.relevance).slice(0, 4).map(s => s.sale);
}

// Re-use shared COMMON_WORDS set logic locally for word splitting (component already imports splitIntoWords)
const COMMON_WORDS = new Set([
  ...DICTIONARY_WORDS,
  ...PREMIUM_KEYWORDS,
  "the", "and", "for", "are", "but", "not", "you", "all", "can", "had", "her", "was", "one",
  "our", "out", "day", "get", "has", "him", "his", "how", "its", "may", "new", "now", "old",
  "see", "way", "who", "did", "got", "let", "say", "she", "too", "use", "big", "top", "best",
  "go", "no", "my", "up", "do", "so", "we", "if", "me", "on", "in", "it", "to", "be", "as",
  "at", "by", "or", "an", "of", "is",
]);

function estimateValue(domain: string, nicheOverride?: string): ValuationResult {
  const parts = domain.toLowerCase().replace(/^www\./, "").split(".");
  const name = parts[0].replace(/[^a-z0-9]/g, "");
  const tld = parts[1] || "com";
  const factors: ValuationResult["factors"] = [];
  let total = 0;

  const trademark = checkTrademarkRisk(domain);

  // 1. Length (max 20)
  let lengthScore = 0;
  let lengthDetail = "";
  if (name.length <= 2) { lengthScore = 20; lengthDetail = "ultra-short premium"; }
  else if (name.length === 3) { lengthScore = 18; lengthDetail = "3-letter premium"; }
  else if (name.length === 4) { lengthScore = 16; lengthDetail = "4-letter — very strong"; }
  else if (name.length === 5) { lengthScore = 14; lengthDetail = "5-letter — strong"; }
  else if (name.length === 6) { lengthScore = 12; lengthDetail = "6-letter — solid"; }
  else if (name.length <= 8) { lengthScore = 10; lengthDetail = "good length"; }
  else if (name.length <= 10) { lengthScore = 6; lengthDetail = "moderate length"; }
  else if (name.length <= 14) { lengthScore = 3; lengthDetail = "getting long"; }
  else { lengthScore = 1; lengthDetail = "very long — low demand"; }
  factors.push({ label: "Length", score: lengthScore, maxScore: 20, detail: `${name.length} characters — ${lengthDetail}` });
  total += lengthScore;

  // 2. TLD Value (max 25)
  const tldScore = PREMIUM_TLDS[tld] || 3;
  factors.push({ label: "TLD Value", score: tldScore, maxScore: 25, detail: `.${tld} — ${tldScore >= 16 ? "high-demand extension" : tldScore >= 10 ? "solid extension" : "lower-demand extension"}` });
  total += tldScore;

  // 3. Word Quality & Meaning (max 25)
  const wordParts = splitIntoWords(name);
  const meaningfulWords = wordParts.filter(w => w.length >= 2 && (COMMON_WORDS.has(w) || DICTIONARY_WORDS.has(w) || PREMIUM_KEYWORDS.has(w)));
  const junkChars = wordParts.filter(w => w.length === 1 && !COMMON_WORDS.has(w)).length;
  const hasPenaltyWord = [...PENALTY_KEYWORDS].some(kw => name.includes(kw));
  const premiumMatches = meaningfulWords.filter(w => PREMIUM_KEYWORDS.has(w));
  const isDictWord = isSingleDictionaryWord(name);
  const allMeaningful = meaningfulWords.length >= 1 && junkChars === 0 && meaningfulWords.join("").length === name.length;

  let wordScore = 0;
  if (hasPenaltyWord) wordScore = 1;
  else if (isDictWord) wordScore = 25;
  else if (allMeaningful && meaningfulWords.length >= 2) wordScore = premiumMatches.length >= 1 ? 22 : 18;
  else if (meaningfulWords.length >= 2 && junkChars <= 1) wordScore = premiumMatches.length >= 1 ? 18 : 14;
  else if (meaningfulWords.length === 1 && junkChars === 0 && name.length <= 8) wordScore = premiumMatches.length >= 1 ? 16 : 12;
  else if (meaningfulWords.length >= 1) wordScore = 6 + Math.min(4, premiumMatches.length * 2);
  else wordScore = 2;

  let wordDetail = "";
  if (hasPenaltyWord) wordDetail = "Contains risky/trademark term — severely limits value";
  else if (isDictWord) wordDetail = `Single dictionary word "${name}" — ultra-premium`;
  else if (allMeaningful && meaningfulWords.length >= 2) wordDetail = `Clean compound: "${meaningfulWords.join(" + ")}" — strong brandable combo`;
  else if (meaningfulWords.length >= 1) wordDetail = `Found: ${meaningfulWords.join(", ")}${junkChars > 0 ? ` (${junkChars} extra chars)` : ""}`;
  else wordDetail = "No recognizable words — harder to brand";
  factors.push({ label: "Word Quality", score: wordScore, maxScore: 25, detail: wordDetail });
  total += wordScore;

  // 4. Brandability (max 15)
  const vowelCount = [...name].filter(c => "aeiouy".includes(c)).length;
  const ratio = vowelCount / name.length;
  const isPronounceable = ratio >= 0.25 && ratio <= 0.6 && !/[bcdfghjklmnpqrstvwxz]{4,}/i.test(name);
  const hasNaturalFlow = meaningfulWords.length >= 1 && junkChars <= 1;
  let brandScore = 0;
  if (hasPenaltyWord) brandScore = 1;
  else if (isDictWord && name.length <= 8) brandScore = 15;
  else if (isPronounceable && hasNaturalFlow && name.length <= 8) brandScore = 15;
  else if (isPronounceable && hasNaturalFlow) brandScore = 11;
  else if (isPronounceable) brandScore = 7;
  else brandScore = 3;
  const brandDetail = hasPenaltyWord ? "Risky content — unbrandable" :
    isDictWord ? "Real dictionary word — instant brand recognition" :
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

  // 6. Trending / Niche Value (max 15)
  const { multiplier: trendMult, trends } = getTrendingMultiplier(meaningfulWords);
  let trendFactorScore = 0;
  let trendDetail = "";
  if (hasPenaltyWord) {
    trendFactorScore = 0; trendDetail = "Penalty content — no trend value";
  } else if (trends.length >= 2) {
    trendFactorScore = 15; trendDetail = `Trending combo: ${trends.join(" + ")} — high market demand`;
  } else if (trends.length === 1) {
    trendFactorScore = Math.round((trendMult - 1) * 15);
    trendDetail = `Trending keyword: "${trends[0]}" — in-demand niche`;
  } else if (isDictWord) {
    trendFactorScore = 8; trendDetail = "Dictionary word — evergreen value";
  } else {
    trendFactorScore = 2; trendDetail = "No trending keywords detected";
  }
  trendFactorScore = Math.min(15, Math.max(0, trendFactorScore));
  factors.push({ label: "Trending / Niche", score: trendFactorScore, maxScore: 15, detail: trendDetail });
  total += trendFactorScore;

  // 7. Market Risk (max 10)
  let penaltyScore = 10;
  let penaltyDetail = "No negative signals";
  if (hasPenaltyWord) { penaltyScore = 0; penaltyDetail = "Trademark/adult/pharma content — major value penalty"; }
  else if (name.length > 15) { penaltyScore = 3; penaltyDetail = "Excessive length reduces marketability"; }
  else if (junkChars > 2) { penaltyScore = 4; penaltyDetail = "Unrecognizable character sequences"; }
  factors.push({ label: "Market Risk", score: penaltyScore, maxScore: 10, detail: penaltyDetail });
  total += penaltyScore;

  // 8. Trademark Risk (max 10)
  const isMultiWord = meaningfulWords.length >= 2;
  let tmScore = 10;
  let tmDetail = "No known trademark conflicts";
  if (trademark.riskLevel === "high" && !isMultiWord) { tmScore = 0; tmDetail = trademark.summary; }
  else if (trademark.riskLevel === "high" && isMultiWord) { tmScore = 5; tmDetail = trademark.summary + " (multi-word, reduced risk)"; }
  else if (trademark.riskLevel === "medium" && !isMultiWord) { tmScore = 3; tmDetail = trademark.summary; }
  else if (trademark.riskLevel === "medium" && isMultiWord) { tmScore = 7; tmDetail = trademark.summary + " (part of compound word)"; }
  else if (trademark.riskLevel === "low") { tmScore = 6; tmDetail = trademark.summary; }
  factors.push({ label: "Trademark Risk", score: tmScore, maxScore: 10, detail: tmDetail });
  total += tmScore;

  // ─── TREND SCORE & NICHE ───
  const { score: trendScore, label: trendLabel, niche } = computeTrendScore(meaningfulWords, tld, nicheOverride);

  // ─── VALUE CALCULATION ───
  const normalizedTotal = Math.round((total / 130) * 100);

  let valueMin: number, valueMax: number;
  if ((hasPenaltyWord) || (trademark.riskLevel === "high" && !isMultiWord)) {
    valueMin = 5; valueMax = 50;
  } else if (normalizedTotal >= 92) {
    valueMin = 75000; valueMax = 250000;
  } else if (normalizedTotal >= 85) {
    valueMin = 25000; valueMax = 100000;
  } else if (normalizedTotal >= 78) {
    valueMin = 8000; valueMax = 35000;
  } else if (normalizedTotal >= 70) {
    valueMin = 2500; valueMax = 12000;
  } else if (normalizedTotal >= 62) {
    valueMin = 800; valueMax = 4000;
  } else if (normalizedTotal >= 55) {
    valueMin = 200; valueMax = 1200;
  } else if (normalizedTotal >= 45) {
    valueMin = 50; valueMax = 400;
  } else if (normalizedTotal >= 35) {
    valueMin = 15; valueMax = 100;
  } else {
    valueMin = 5; valueMax = 50;
  }

  // Apply trending multiplier
  if (trendMult > 1.0 && !hasPenaltyWord && trademark.riskLevel !== "high") {
    valueMin = Math.round(valueMin * trendMult);
    valueMax = Math.round(valueMax * trendMult);
  }

  // Apply niche multiplier on top (if niche detected with reasonable confidence)
  if (niche.multiplier > 1.0 && niche.confidence !== "Low" && !hasPenaltyWord && trademark.riskLevel !== "high") {
    const nicheBoost = 1 + (niche.multiplier - 1) * 0.5; // dampen to avoid double-counting with trend
    valueMin = Math.round(valueMin * nicheBoost);
    valueMax = Math.round(valueMax * nicheBoost);
  }

  // Dictionary word on .com bonus — single dictionary words on .com are ultra-premium
  if (isDictWord && tld === "com" && !hasPenaltyWord && trademark.riskLevel !== "high") {
    const dictFloorMin = name.length <= 3 ? 200000 : name.length <= 4 ? 100000 : name.length <= 5 ? 50000 : name.length <= 6 ? 25000 : name.length <= 8 ? 12000 : 8000;
    const dictFloorMax = name.length <= 3 ? 500000 : name.length <= 4 ? 400000 : name.length <= 5 ? 250000 : name.length <= 6 ? 150000 : name.length <= 8 ? 50000 : 30000;
    valueMin = Math.max(valueMin, dictFloorMin);
    valueMax = Math.max(valueMax, dictFloorMax);
  }

  // Two-word brandable .com bonus
  if (!isDictWord && allMeaningful && meaningfulWords.length === 2 && tld === "com" && !hasPenaltyWord && trademark.riskLevel !== "high") {
    const hasPremium = premiumMatches.length >= 1;
    const twoWordFloorMin = hasPremium ? 3000 : 1500;
    const twoWordFloorMax = hasPremium ? 10000 : 5000;
    valueMin = Math.max(valueMin, twoWordFloorMin);
    valueMax = Math.max(valueMax, twoWordFloorMax);
  }

  // Tighten band
  if (valueMax > valueMin * 3) {
    valueMax = Math.round(valueMin * 3);
  }

  const confidence: ValuationResult["confidence"] = normalizedTotal >= 75 ? "High" : normalizedTotal >= 50 ? "Medium" : "Low";
  const estimatedValue = `$${valueMin.toLocaleString()} – $${valueMax.toLocaleString()}`;
  const comparableSales = findComparableSales(domain, normalizedTotal, meaningfulWords);

  return { estimatedValue, confidence, overallScore: normalizedTotal, factors, trademark, comparableSales, trendScore, trendLabel, niche };
}

// ─── Trend Score visual helpers ───

function getTrendScoreColor(score: number): string {
  if (score >= 85) return "text-red-500";
  if (score >= 70) return "text-orange-500";
  if (score >= 50) return "text-amber-500";
  if (score >= 30) return "text-blue-500";
  return "text-muted-foreground";
}

function getTrendScoreBg(score: number): string {
  if (score >= 85) return "bg-red-500/10 border-red-500/30";
  if (score >= 70) return "bg-orange-500/10 border-orange-500/30";
  if (score >= 50) return "bg-amber-500/10 border-amber-500/30";
  if (score >= 30) return "bg-blue-500/10 border-blue-500/30";
  return "bg-muted/50 border-border";
}

function getNicheHeatColor(heat: "hot" | "warm" | "stable" | "cooling"): string {
  switch (heat) {
    case "hot": return "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20";
    case "warm": return "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20";
    case "stable": return "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20";
    case "cooling": return "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20";
  }
}

export function DomainValuationEstimator() {
  const [domain, setDomain] = useState("");
  const [nicheOverride, setNicheOverride] = useState<string>("");
  const [result, setResult] = useState<ValuationResult | null>(null);

  const handleEstimate = () => {
    if (!domain.trim()) return;
    setResult(estimateValue(domain.trim(), nicheOverride || undefined));
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
          Get an instant estimated value based on length, TLD, keywords, brandability, trending niches, and trademark risk.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-col gap-3">
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
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground whitespace-nowrap">Niche override:</span>
            <Select value={nicheOverride} onValueChange={setNicheOverride}>
              <SelectTrigger className="w-48 h-8 text-xs">
                <SelectValue placeholder="Auto-detect" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">Auto-detect</SelectItem>
                {Object.entries(NICHE_CATEGORIES).map(([key, cat]) => (
                  <SelectItem key={key} value={key}>{cat.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {nicheOverride && nicheOverride !== "auto" && (
              <Button variant="ghost" size="sm" className="h-8 text-xs px-2" onClick={() => setNicheOverride("")}>
                Reset
              </Button>
            )}
          </div>
        </div>

        {result && (
          <div className="space-y-5 animate-fade-in">
            {/* ─── Top-line: Value + Score + Trend Score ─── */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Estimated Value */}
              <div className="p-4 rounded-xl bg-secondary/50 border border-border/50">
                <span className="text-xs text-muted-foreground block mb-1">Estimated Value</span>
                <p className="text-2xl font-bold text-foreground">{result.estimatedValue}</p>
                <Badge variant="outline" className={`text-xs mt-2 ${confidenceColor(result.confidence)}`}>
                  {result.confidence} Confidence
                </Badge>
              </div>

              {/* Overall Score */}
              <div className="p-4 rounded-xl bg-secondary/50 border border-border/50">
                <span className="text-xs text-muted-foreground block mb-1">Quality Score</span>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-bold text-foreground">{result.overallScore}</span>
                  <span className="text-sm text-muted-foreground">/ 100</span>
                </div>
                <Progress value={result.overallScore} className="h-2 mt-2" />
              </div>

              {/* Trend Score — NEW */}
              <div className={`p-4 rounded-xl border ${getTrendScoreBg(result.trendScore)}`}>
                <span className="text-xs text-muted-foreground block mb-1 flex items-center gap-1.5">
                  <Flame className="w-3.5 h-3.5" />
                  Trend Score
                </span>
                <div className="flex items-baseline gap-2">
                  <span className={`text-2xl font-bold ${getTrendScoreColor(result.trendScore)}`}>{result.trendScore}</span>
                  <span className="text-sm text-muted-foreground">/ 100</span>
                </div>
                <span className={`text-xs font-medium mt-1 block ${getTrendScoreColor(result.trendScore)}`}>
                  {result.trendLabel}
                </span>
              </div>
            </div>

            {/* ─── Niche Detection Card ─── */}
            <div className="p-4 rounded-xl bg-secondary/30 border border-border/50">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <Target className="w-4 h-4 text-primary" />
                  <span className="text-sm font-semibold text-foreground">Detected Niche</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className={`text-xs ${result.niche.niche !== "general" && NICHE_CATEGORIES[result.niche.niche] ? getNicheHeatColor(NICHE_CATEGORIES[result.niche.niche].heat) : "bg-muted/50"}`}>
                    {result.niche.label}
                  </Badge>
                  {result.niche.multiplier > 1.0 && (
                    <Tooltip>
                      <TooltipTrigger>
                        <Badge variant="outline" className="text-xs bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">
                          +{Math.round((result.niche.multiplier - 1) * 100)}% niche boost
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs max-w-xs">This domain aligns with a high-demand niche, which boosts its estimated aftermarket value based on recent publicly reported trends.</p>
                      </TooltipContent>
                    </Tooltip>
                  )}
                  <Badge variant="outline" className="text-xs">
                    {result.niche.confidence} match
                  </Badge>
                </div>
              </div>
              {result.niche.matchedKeywords.length > 0 && (
                <div className="flex gap-1.5 mt-2 flex-wrap">
                  {result.niche.matchedKeywords.map((kw, i) => (
                    <Badge key={i} variant="secondary" className="text-xs">
                      {kw}
                    </Badge>
                  ))}
                </div>
              )}
              {result.niche.niche !== "general" && NICHE_CATEGORIES[result.niche.niche] && (
                <p className="text-xs text-muted-foreground mt-2">
                  {NICHE_CATEGORIES[result.niche.niche].heat === "hot" ? "🔥 This niche is currently surging in aftermarket demand." :
                   NICHE_CATEGORIES[result.niche.niche].heat === "warm" ? "📈 This niche shows strong, growing demand." :
                   NICHE_CATEGORIES[result.niche.niche].heat === "stable" ? "➡️ This niche has steady, consistent demand." :
                   "⬇️ This niche is cooling — prices may be softening."}
                </p>
              )}
            </div>

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

            {/* Factor Breakdown */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-primary" />
                Factor Breakdown
              </h4>
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

            {/* Comparable Sales */}
            {result.comparableSales.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-primary" />
                  Comparable Recent Sales
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {result.comparableSales.map((sale, i) => (
                    <div key={i} className="flex items-center justify-between p-2.5 rounded-lg bg-secondary/50 border border-border/50">
                      <div>
                        <span className="text-sm font-medium text-foreground">{sale.domain}</span>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">{sale.pattern}</Badge>
                          <span className="text-xs text-muted-foreground">{sale.date}</span>
                        </div>
                      </div>
                      <span className="text-sm font-bold text-primary">{sale.price}</span>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  Based on publicly reported aftermarket sales matching your domain's keywords.
                </p>
              </div>
            )}

            <p className="text-xs text-muted-foreground italic">
              * Algorithmic estimate for guidance only. Comparable sales sourced from publicly reported aftermarket data.
              Trademark check covers ~200 major brands — not legal advice.
              Actual market value depends on demand, comparable sales, traffic, and other factors. Always consult a trademark attorney before major acquisitions.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
