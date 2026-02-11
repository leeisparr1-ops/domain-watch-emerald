import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Mic, CheckCircle, XCircle, MinusCircle, Hash, ShieldAlert, ShieldCheck } from "lucide-react";
import { scorePronounceability, type PronounceabilityResult } from "@/lib/pronounceability";
import { checkTrademarkRisk, getTrademarkRiskDisplay, type TrademarkResult } from "@/lib/trademarkCheck";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function PronounceabilityScorer() {
  const [domain, setDomain] = useState("");
  const [result, setResult] = useState<PronounceabilityResult | null>(null);
  const [tmResult, setTmResult] = useState<TrademarkResult | null>(null);

  const handleScore = () => {
    if (!domain.trim()) return;
    const cleaned = domain.trim().replace(/\s+/g, "");
    setResult(scorePronounceability(cleaned));
    setTmResult(checkTrademarkRisk(cleaned));
  };

  const gradeColor = (grade: string) => {
    switch (grade) {
      case "Excellent": return "text-emerald-600 dark:text-emerald-400";
      case "Good": return "text-blue-600 dark:text-blue-400";
      case "Fair": return "text-amber-600 dark:text-amber-400";
      default: return "text-red-600 dark:text-red-400";
    }
  };

  const impactIcon = (impact: string) => {
    switch (impact) {
      case "positive": return <CheckCircle className="w-4 h-4 text-emerald-500" />;
      case "negative": return <XCircle className="w-4 h-4 text-red-500" />;
      default: return <MinusCircle className="w-4 h-4 text-amber-500" />;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mic className="w-5 h-5 text-primary" />
          Pronounceability Scorer
        </CardTitle>
        <CardDescription>
          Check how easy a domain name is to say, spell, and remember. Includes trademark risk screening.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex gap-3">
          <Input
            placeholder="Enter a domain name (e.g. shopify.com)"
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleScore()}
            className="flex-1"
          />
          <Button onClick={handleScore} disabled={!domain.trim()}>
            Score
          </Button>
        </div>

        {result && (
          <div className="space-y-4 animate-fade-in">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <span className="text-sm text-muted-foreground">Overall Score</span>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-bold text-foreground">{result.score}</span>
                  <span className="text-sm text-muted-foreground">/ 100</span>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className="flex items-center gap-1 text-sm px-3 py-1">
                  <Hash className="w-3 h-3" />
                  {result.wordCount} word{result.wordCount !== 1 ? "s" : ""}
                </Badge>
                <Badge variant="outline" className="flex items-center gap-1 text-sm px-3 py-1">
                  ~{(() => {
                    const name = domain.split(".")[0].toLowerCase().replace(/[^a-z]/g, "");
                    return name.match(/[aeiouy]+/gi)?.length || 1;
                  })()} syllable{(() => {
                    const name = domain.split(".")[0].toLowerCase().replace(/[^a-z]/g, "");
                    return (name.match(/[aeiouy]+/gi)?.length || 1) !== 1 ? "s" : "";
                  })()}
                </Badge>
                <Badge variant="outline" className={`text-lg px-4 py-1 ${gradeColor(result.grade)}`}>
                  {result.grade}
                </Badge>
              </div>
            </div>

            <Progress value={result.score} className="h-3" />

            {/* Trademark Risk Section */}
            {tmResult && (
              <div className={`p-3 rounded-lg border ${tmResult.riskLevel === "none" ? "border-emerald-500/20 bg-emerald-500/5" : tmResult.riskLevel === "low" ? "border-yellow-500/20 bg-yellow-500/5" : "border-red-500/20 bg-red-500/5"}`}>
                <div className="flex items-start gap-3">
                  {tmResult.riskLevel === "none" ? (
                    <ShieldCheck className="w-5 h-5 text-emerald-500 mt-0.5" />
                  ) : (
                    <ShieldAlert className="w-5 h-5 text-red-500 mt-0.5" />
                  )}
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-semibold text-foreground">Trademark Check</span>
                      <Badge variant="outline" className={`text-xs ${getTrademarkRiskDisplay(tmResult.riskLevel).color}`}>
                        {getTrademarkRiskDisplay(tmResult.riskLevel).label}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{tmResult.summary}</p>
                    {tmResult.matches.length > 0 && (
                      <div className="flex gap-1.5 mt-2 flex-wrap">
                        {tmResult.matches.map((m, i) => (
                          <Tooltip key={i}>
                            <TooltipTrigger asChild>
                              <Badge variant="outline" className="text-xs cursor-help">
                                {m.brand} ({m.matchType})
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{m.matchType === "exact" ? "Domain name matches this brand exactly" : m.matchType === "contains" ? "Domain contains this brand name" : "Domain closely resembles this brand"}</p>
                            </TooltipContent>
                          </Tooltip>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-foreground">Breakdown</h4>
              {result.factors.map((f, i) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-secondary/50">
                  {impactIcon(f.impact)}
                  <div>
                    <span className="text-sm font-medium text-foreground">{f.label}</span>
                    <p className="text-sm text-muted-foreground">{f.detail}</p>
                  </div>
                </div>
              ))}
            </div>

            <p className="text-xs text-muted-foreground italic">
              * Trademark screening checks ~200 major brands. This is not legal advice — always consult a trademark attorney for acquisitions.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
