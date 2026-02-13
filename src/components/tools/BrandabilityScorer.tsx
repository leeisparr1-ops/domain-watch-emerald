import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Award, Mic, Ruler, BookOpen, Shield, Brain, Eye, Info } from "lucide-react";
import { scoreBrandability, type BrandabilityResult } from "@/lib/brandability";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const DIMENSION_ICONS: Record<string, React.ElementType> = {
  mic: Mic,
  ruler: Ruler,
  book: BookOpen,
  shield: Shield,
  brain: Brain,
  eye: Eye,
};

function getGradeColor(grade: string) {
  switch (grade) {
    case "A+": case "A": return "text-emerald-600 dark:text-emerald-400 border-emerald-500/30 bg-emerald-500/10";
    case "B": return "text-blue-600 dark:text-blue-400 border-blue-500/30 bg-blue-500/10";
    case "C": return "text-amber-600 dark:text-amber-400 border-amber-500/30 bg-amber-500/10";
    default: return "text-red-600 dark:text-red-400 border-red-500/30 bg-red-500/10";
  }
}

function getScoreColor(score: number) {
  if (score >= 80) return "text-emerald-600 dark:text-emerald-400";
  if (score >= 60) return "text-blue-600 dark:text-blue-400";
  if (score >= 40) return "text-amber-600 dark:text-amber-400";
  return "text-red-600 dark:text-red-400";
}

function getProgressColor(score: number) {
  if (score >= 80) return "[&>div]:bg-emerald-500";
  if (score >= 60) return "[&>div]:bg-blue-500";
  if (score >= 40) return "[&>div]:bg-amber-500";
  return "[&>div]:bg-red-500";
}

export function BrandabilityScorer() {
  const [domain, setDomain] = useState("");
  const [result, setResult] = useState<BrandabilityResult | null>(null);

  const handleScore = () => {
    if (!domain.trim()) return;
    const cleaned = domain.trim().replace(/\s+/g, "");
    setResult(scoreBrandability(cleaned));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Award className="w-5 h-5 text-primary" />
          Brandability Score
        </CardTitle>
        <CardDescription>
          Get a single 0-100 score measuring how brandable a domain name is. Combines pronounceability, length, word structure, trademark safety, memorability, and visual appeal.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex gap-3">
          <Input
            placeholder="Enter a domain name (e.g. sparkflow.com)"
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
          <div className="space-y-6 animate-fade-in">
            {/* Overall Score Hero */}
            <div className="text-center p-6 rounded-xl bg-secondary/50 border">
              <div className="flex items-center justify-center gap-4 mb-2">
                <div>
                  <span className="text-6xl font-bold text-foreground">{result.overall}</span>
                  <span className="text-xl text-muted-foreground ml-1">/ 100</span>
                </div>
                <Badge variant="outline" className={`text-2xl px-4 py-2 font-bold ${getGradeColor(result.grade)}`}>
                  {result.grade}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">{result.summary}</p>
            </div>

            {/* Dimension Breakdown */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-semibold text-foreground">Score Breakdown</h4>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-[250px]">
                    <p>Each dimension is weighted and combined into the overall score. Percentages show the weight of each factor.</p>
                  </TooltipContent>
                </Tooltip>
              </div>

              <div className="grid gap-3">
                {result.dimensions.map((dim) => {
                  const Icon = DIMENSION_ICONS[dim.icon] || Eye;
                  return (
                    <div key={dim.name} className="p-3 rounded-lg bg-secondary/30 border border-border/50">
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <Icon className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm font-medium text-foreground">{dim.name}</span>
                          <span className="text-xs text-muted-foreground">({Math.round(dim.weight * 100)}%)</span>
                        </div>
                        <span className={`text-sm font-bold ${getScoreColor(dim.score)}`}>
                          {dim.score}
                        </span>
                      </div>
                      <Progress value={dim.score} className={`h-1.5 mb-1.5 ${getProgressColor(dim.score)}`} />
                      <p className="text-xs text-muted-foreground">{dim.detail}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Trademark Badge */}
            {result.trademarkRisk !== "none" && (
              <div className={`p-3 rounded-lg border ${
                result.trademarkRisk === "high" ? "border-red-500/20 bg-red-500/5" :
                result.trademarkRisk === "medium" ? "border-orange-500/20 bg-orange-500/5" :
                "border-yellow-500/20 bg-yellow-500/5"
              }`}>
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-red-500" />
                  <span className="text-sm font-medium text-foreground">
                    {result.trademarkRisk === "high" ? "⚠️ High trademark risk" :
                     result.trademarkRisk === "medium" ? "⚡ Medium trademark risk" :
                     "💡 Low trademark risk"} — always consult a trademark attorney before acquiring.
                  </span>
                </div>
              </div>
            )}

            <p className="text-xs text-muted-foreground italic">
              * Brandability Score is for informational purposes only. This is not financial or legal advice — always do your own due diligence.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
