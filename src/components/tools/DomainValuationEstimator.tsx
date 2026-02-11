import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { DollarSign, TrendingUp, TrendingDown, Minus } from "lucide-react";

interface ValuationResult {
  estimatedValue: string;
  confidence: "High" | "Medium" | "Low";
  overallScore: number;
  factors: { label: string; score: number; maxScore: number; detail: string }[];
}

const PREMIUM_TLDS: Record<string, number> = {
  com: 30, net: 18, org: 16, io: 20, ai: 22, co: 17, app: 15, dev: 14, me: 12, xyz: 8, info: 7, biz: 6,
};

const PREMIUM_KEYWORDS = new Set([
  "ai", "crypto", "cloud", "tech", "pay", "bet", "buy", "sell", "trade", "bank", "cash", "loan",
  "health", "fit", "auto", "car", "home", "solar", "green", "data", "code", "web", "app", "game",
  "shop", "store", "deal", "sale", "food", "travel", "hotel", "dating", "jobs", "news", "legal",
]);

function estimateValue(domain: string): ValuationResult {
  const parts = domain.toLowerCase().replace(/^www\./, "").split(".");
  const name = parts[0].replace(/[^a-z0-9]/g, "");
  const tld = parts[1] || "com";
  const factors: ValuationResult["factors"] = [];
  let total = 0;

  // 1. Length (max 25)
  let lengthScore = 0;
  if (name.length <= 3) { lengthScore = 25; }
  else if (name.length <= 5) { lengthScore = 22; }
  else if (name.length <= 7) { lengthScore = 18; }
  else if (name.length <= 10) { lengthScore = 12; }
  else if (name.length <= 15) { lengthScore = 6; }
  else { lengthScore = 2; }
  factors.push({ label: "Length", score: lengthScore, maxScore: 25, detail: `${name.length} characters — ${name.length <= 5 ? "premium short domain" : name.length <= 10 ? "moderate length" : "long domain"}` });
  total += lengthScore;

  // 2. TLD Value (max 30)
  const tldScore = PREMIUM_TLDS[tld] || 5;
  factors.push({ label: "TLD Value", score: tldScore, maxScore: 30, detail: `.${tld} — ${tldScore >= 20 ? "high-demand extension" : tldScore >= 12 ? "solid extension" : "lower-demand extension"}` });
  total += tldScore;

  // 3. Keyword Strength (max 20)
  const matchedKeywords = [...PREMIUM_KEYWORDS].filter(kw => name.includes(kw));
  let kwScore = Math.min(20, matchedKeywords.length * 8);
  if (matchedKeywords.length === 0) kwScore = 3;
  factors.push({ label: "Keyword Strength", score: kwScore, maxScore: 20, detail: matchedKeywords.length > 0 ? `Contains: ${matchedKeywords.join(", ")}` : "No high-value keywords detected" });
  total += kwScore;

  // 4. Brandability (max 15)
  const vowelCount = [...name].filter(c => "aeiouy".includes(c)).length;
  const ratio = vowelCount / name.length;
  const isPronounceable = ratio >= 0.25 && ratio <= 0.6 && !/[bcdfghjklmnpqrstvwxz]{4,}/i.test(name);
  const brandScore = isPronounceable ? (name.length <= 8 ? 15 : 10) : 4;
  factors.push({ label: "Brandability", score: brandScore, maxScore: 15, detail: isPronounceable ? "Easy to say and remember" : "Difficult to brand — hard to pronounce" });
  total += brandScore;

  // 5. Character Composition (max 10)
  const isAlpha = /^[a-z]+$/.test(name);
  const hasNumbers = /\d/.test(name);
  const isNumeric = /^\d+$/.test(name);
  let compScore = isAlpha ? 10 : isNumeric && name.length <= 4 ? 8 : hasNumbers ? 4 : 6;
  const detail = isAlpha ? "Pure letters — most desirable" : isNumeric ? "Numeric domain" : "Mixed characters";
  factors.push({ label: "Character Mix", score: compScore, maxScore: 10, detail });
  total += compScore;

  // Estimated dollar value
  let valueMin: number, valueMax: number;
  if (total >= 85) { valueMin = 10000; valueMax = 100000; }
  else if (total >= 70) { valueMin = 2000; valueMax = 15000; }
  else if (total >= 55) { valueMin = 500; valueMax = 3000; }
  else if (total >= 40) { valueMin = 100; valueMax = 800; }
  else { valueMin = 10; valueMax = 150; }

  const confidence: ValuationResult["confidence"] = total >= 70 ? "High" : total >= 45 ? "Medium" : "Low";
  const estimatedValue = `$${valueMin.toLocaleString()} – $${valueMax.toLocaleString()}`;

  return { estimatedValue, confidence, overallScore: total, factors };
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
          Get an instant estimated value based on length, TLD, keywords, brandability, and character composition.
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
              * This is an algorithmic estimate for guidance only. Actual market value depends on demand, comparable sales, traffic, and other factors.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
