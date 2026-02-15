import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BrainCircuit, Loader2, TrendingUp, ShieldAlert, Target, DollarSign, Clock, Users, ThumbsUp, ThumbsDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Analysis {
  verdict: string;
  value_range: string;
  buyer_persona: string;
  strengths: string[];
  weaknesses: string[];
  suggested_buy_price: string;
  flip_score: number;
  flip_timeline: string;
  niche: string;
  summary: string;
}

export function AIDomainAdvisor() {
  const [domain, setDomain] = useState("");
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleAnalyze = async () => {
    const input = domain.trim().toLowerCase();
    if (!input) return;
    setIsLoading(true);
    setAnalysis(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({
          title: "Sign in required",
          description: "Please log in to use the AI Domain Advisor.",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      const { data, error } = await supabase.functions.invoke("ai-domain-advisor", {
        body: { domain: input },
      });

      if (error) {
        const msg = error.message || "";
        if (msg.includes("429") || msg.includes("Rate limit")) {
          throw new Error("Rate limit exceeded. Please wait a moment and try again.");
        }
        if (msg.includes("402") || msg.includes("credits")) {
          throw new Error("AI credits exhausted. Please try again later.");
        }
        throw error;
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      setAnalysis(data);
    } catch (e: any) {
      console.error(e);
      toast({
        title: "Analysis failed",
        description: e.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const verdictColor = (v: string) => {
    if (v === "Strong Buy") return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-500/30";
    if (v === "Buy") return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-500/30";
    if (v === "Hold") return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-500/30";
    return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-500/30";
  };

  const flipScoreColor = (s: number) => {
    if (s >= 8) return "text-emerald-600 dark:text-emerald-400";
    if (s >= 5) return "text-blue-600 dark:text-blue-400";
    if (s >= 3) return "text-amber-600 dark:text-amber-400";
    return "text-red-600 dark:text-red-400";
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BrainCircuit className="w-5 h-5 text-primary" />
          AI Domain Advisor
          <Badge variant="secondary" className="text-[10px] font-bold uppercase tracking-wider bg-primary/10 text-primary border-primary/20">
            New
          </Badge>
        </CardTitle>
        <CardDescription>
          Get AI-powered investment analysis on any domain — verdict, valuation range, flip potential, buyer persona, and actionable advice.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex gap-3">
          <Input
            placeholder="Enter a domain (e.g. quantumpay.ai)"
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !isLoading && handleAnalyze()}
            className="flex-1"
          />
          <Button onClick={handleAnalyze} disabled={!domain.trim() || isLoading}>
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <BrainCircuit className="w-4 h-4" />}
            <span className="ml-2 hidden sm:inline">Analyze</span>
          </Button>
        </div>

        {analysis && (
          <div className="space-y-5 animate-fade-in">
            {/* Verdict + Summary */}
            <div className="flex items-start gap-3 p-4 rounded-lg border border-border bg-card">
              <Badge variant="outline" className={`text-sm font-bold px-3 py-1 shrink-0 ${verdictColor(analysis.verdict)}`}>
                {analysis.verdict}
              </Badge>
              <p className="text-sm text-foreground leading-relaxed">{analysis.summary}</p>
            </div>

            {/* Key Metrics Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="p-3 rounded-lg border border-border bg-card text-center">
                <DollarSign className="w-4 h-4 mx-auto mb-1 text-primary" />
                <p className="text-xs text-muted-foreground">Est. Value</p>
                <p className="text-sm font-semibold text-foreground">{analysis.value_range}</p>
              </div>
              <div className="p-3 rounded-lg border border-border bg-card text-center">
                <TrendingUp className={`w-4 h-4 mx-auto mb-1 ${flipScoreColor(analysis.flip_score)}`} />
                <p className="text-xs text-muted-foreground">Flip Score</p>
                <p className={`text-sm font-semibold ${flipScoreColor(analysis.flip_score)}`}>{analysis.flip_score}/10</p>
              </div>
              <div className="p-3 rounded-lg border border-border bg-card text-center">
                <Clock className="w-4 h-4 mx-auto mb-1 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">Flip Timeline</p>
                <p className="text-sm font-semibold text-foreground">{analysis.flip_timeline}</p>
              </div>
              <div className="p-3 rounded-lg border border-border bg-card text-center">
                <Target className="w-4 h-4 mx-auto mb-1 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">Max Buy Price</p>
                <p className="text-sm font-semibold text-foreground">{analysis.suggested_buy_price}</p>
              </div>
            </div>

            {/* Buyer + Niche */}
            <div className="flex flex-wrap gap-3">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-secondary/50 text-sm">
                <Users className="w-4 h-4 text-primary" />
                <span className="text-muted-foreground">Buyer:</span>
                <span className="text-foreground font-medium">{analysis.buyer_persona}</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-secondary/50 text-sm">
                <Target className="w-4 h-4 text-primary" />
                <span className="text-muted-foreground">Niche:</span>
                <span className="text-foreground font-medium">{analysis.niche}</span>
              </div>
            </div>

            {/* Strengths / Weaknesses */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                  <ThumbsUp className="w-4 h-4 text-emerald-500" /> Strengths
                </h4>
                <ul className="space-y-1.5">
                  {analysis.strengths.map((s, i) => (
                    <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                      <span className="text-emerald-500 mt-0.5">•</span> {s}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                  <ThumbsDown className="w-4 h-4 text-red-500" /> Risks
                </h4>
                <ul className="space-y-1.5">
                  {analysis.weaknesses.map((w, i) => (
                    <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                      <span className="text-red-500 mt-0.5">•</span> {w}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <p className="text-xs text-muted-foreground text-center">
              AI analysis based on market trends and public aftermarket data. Not financial advice — always do your own due diligence.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
