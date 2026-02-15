import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BrainCircuit, Loader2, TrendingUp, ShieldAlert, Target, DollarSign, Clock, Users, ThumbsUp, ThumbsDown, BarChart3, Flame } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { scoreBrandability } from "@/lib/brandability";
import { scorePronounceability } from "@/lib/pronounceability";
import { checkTrademarkRisk, getTrademarkRiskDisplay } from "@/lib/trademarkCheck";
import { scoreKeywordDemand } from "@/lib/keywordDemand";
import { quickValuation } from "@/lib/domainValuation";
import { estimateSEOVolume } from "@/lib/seoVolume";
import { scoreDomainAge } from "@/lib/domainAge";

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

interface PreScores {
  brandability: number;
  pronounceability: number;
  keywordDemand: number;
  keywordDemandLabel: string;
  valuationRange: string;
  trendScore: number | undefined;
  trendLabel: string | undefined;
  niche: string;
  trademarkRisk: string;
  seoVolume: number;
  seoVolumeLabel: string;
  domainAgeLabel: string;
  comparableSales: { domain: string; price: string; date: string; pattern: string }[];
}

export function AIDomainAdvisor() {
  const [domain, setDomain] = useState("");
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [preScores, setPreScores] = useState<PreScores | null>(null);
  const [algorithmicValuation, setAlgorithmicValuation] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleAnalyze = async () => {
    const input = domain.trim().toLowerCase();
    if (!input) return;
    setIsLoading(true);
    setAnalysis(null);
    setPreScores(null);

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

      // Pre-compute all scores client-side to send to AI
      const domainWithTld = input.includes(".") ? input : `${input}.com`;
      const brand = scoreBrandability(domainWithTld);
      const pronounce = scorePronounceability(domainWithTld);
      const trademark = checkTrademarkRisk(domainWithTld);
      const demand = scoreKeywordDemand(domainWithTld);
      const val = quickValuation(domainWithTld, pronounce.score);
      // Store algorithmic valuation for consistent display across tools
      setAlgorithmicValuation(`$${val.valueMin.toLocaleString()} - $${val.valueMax.toLocaleString()}`);
      const seo = estimateSEOVolume(domainWithTld);
      const age = scoreDomainAge(null);

      const scores: PreScores = {
        brandability: brand.overall,
        pronounceability: pronounce.score,
        keywordDemand: demand.score,
        keywordDemandLabel: demand.label,
        valuationRange: val.band,
        trendScore: undefined,
        trendLabel: undefined,
        niche: demand.niche.label,
        trademarkRisk: getTrademarkRiskDisplay(trademark.riskLevel).label,
        seoVolume: seo.estimatedMonthlySearches,
        seoVolumeLabel: seo.volumeLabel,
        domainAgeLabel: age.ageLabel,
        comparableSales: [],
      };
      setPreScores(scores);

      const { data, error } = await supabase.functions.invoke("ai-domain-advisor", {
        body: { domain: domainWithTld, scores },
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
        </CardTitle>
        <CardDescription>
          Get AI-powered investment analysis enriched with brandability, keyword demand, valuation, and comparable sales data for smarter verdicts.
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

        {/* Pre-computed scores shown while AI is loading */}
        {preScores && !analysis && isLoading && (
          <div className="space-y-3 animate-fade-in">
            <p className="text-xs text-muted-foreground flex items-center gap-2">
              <Loader2 className="w-3 h-3 animate-spin" />
              AI is analyzing — here are your pre-computed scores:
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <div className="p-2.5 rounded-lg border border-border bg-card text-center">
                <BarChart3 className="w-3.5 h-3.5 mx-auto mb-0.5 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">Brand</p>
                <p className="text-sm font-semibold text-foreground">{preScores.brandability}/100</p>
              </div>
              <div className="p-2.5 rounded-lg border border-border bg-card text-center">
                <Flame className="w-3.5 h-3.5 mx-auto mb-0.5 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">Demand</p>
                <p className="text-sm font-semibold text-foreground">{preScores.keywordDemand}/100</p>
              </div>
              <div className="p-2.5 rounded-lg border border-border bg-card text-center">
                <DollarSign className="w-3.5 h-3.5 mx-auto mb-0.5 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">Valuation</p>
                <p className="text-xs font-semibold text-foreground">{preScores.valuationRange}</p>
              </div>
              <div className="p-2.5 rounded-lg border border-border bg-card text-center">
                <Target className="w-3.5 h-3.5 mx-auto mb-0.5 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">Niche</p>
                <p className="text-xs font-semibold text-foreground">{preScores.niche}</p>
              </div>
            </div>
          </div>
        )}

        {analysis && (
          <div className="space-y-5 animate-fade-in">
            {/* Verdict + Summary */}
            <div className="flex items-start gap-3 p-4 rounded-lg border border-border bg-card">
              <Badge variant="outline" className={`text-sm font-bold px-3 py-1 shrink-0 ${verdictColor(analysis.verdict)}`}>
                {analysis.verdict}
              </Badge>
              <p className="text-sm text-foreground leading-relaxed">{analysis.summary}</p>
            </div>

            {/* Pre-computed scores strip */}
            {preScores && (
              <div className="grid grid-cols-4 gap-2">
                <div className="p-2 rounded-lg bg-secondary/50 text-center">
                  <p className="text-[10px] text-muted-foreground">Brand</p>
                  <p className={`text-sm font-bold ${preScores.brandability >= 70 ? "text-emerald-600 dark:text-emerald-400" : preScores.brandability >= 50 ? "text-blue-600 dark:text-blue-400" : "text-amber-600 dark:text-amber-400"}`}>{preScores.brandability}</p>
                </div>
                <div className="p-2 rounded-lg bg-secondary/50 text-center">
                  <p className="text-[10px] text-muted-foreground">Pronounce</p>
                  <p className={`text-sm font-bold ${preScores.pronounceability >= 70 ? "text-emerald-600 dark:text-emerald-400" : preScores.pronounceability >= 50 ? "text-blue-600 dark:text-blue-400" : "text-amber-600 dark:text-amber-400"}`}>{preScores.pronounceability}</p>
                </div>
                <div className="p-2 rounded-lg bg-secondary/50 text-center">
                  <p className="text-[10px] text-muted-foreground">Demand</p>
                  <p className={`text-sm font-bold ${preScores.keywordDemand >= 70 ? "text-emerald-600 dark:text-emerald-400" : preScores.keywordDemand >= 40 ? "text-blue-600 dark:text-blue-400" : "text-amber-600 dark:text-amber-400"}`}>{preScores.keywordDemand}</p>
                </div>
                <div className="p-2 rounded-lg bg-secondary/50 text-center">
                  <p className="text-[10px] text-muted-foreground">TM Risk</p>
                  <p className="text-sm font-bold text-foreground">{preScores.trademarkRisk}</p>
                </div>
              </div>
            )}

            {/* Key Metrics Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="p-3 rounded-lg border border-border bg-card text-center">
                <DollarSign className="w-4 h-4 mx-auto mb-1 text-primary" />
                <p className="text-xs text-muted-foreground">Est. Value</p>
                <p className="text-sm font-semibold text-foreground">{algorithmicValuation || analysis.value_range}</p>
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
              AI analysis enriched with brandability ({preScores?.brandability}), demand ({preScores?.keywordDemand}), and valuation scores. Not financial advice.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
