import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Mic, CheckCircle, XCircle, MinusCircle } from "lucide-react";
import { scorePronounceability, type PronounceabilityResult } from "@/lib/pronounceability";

export function PronounceabilityScorer() {
  const [domain, setDomain] = useState("");
  const [result, setResult] = useState<PronounceabilityResult | null>(null);

  const handleScore = () => {
    if (!domain.trim()) return;
    setResult(scorePronounceability(domain.trim()));
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
          Check how easy a domain name is to say, spell, and remember. The "radio test" — can someone hear it and type it correctly?
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
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm text-muted-foreground">Overall Score</span>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-bold text-foreground">{result.score}</span>
                  <span className="text-sm text-muted-foreground">/ 100</span>
                </div>
              </div>
              <Badge variant="outline" className={`text-lg px-4 py-1 ${gradeColor(result.grade)}`}>
                {result.grade}
              </Badge>
            </div>

            <Progress value={result.score} className="h-3" />

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
          </div>
        )}
      </CardContent>
    </Card>
  );
}
