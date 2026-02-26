import { useState, useEffect, useRef } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  BrainCircuit, Loader2, TrendingUp, ShieldAlert, Target, DollarSign, Clock,
  Users, ThumbsUp, ThumbsDown, BarChart3, Flame, Send, MessageSquare,
  Award, Mic, Sparkles, Globe2, ArrowRight, CheckCircle2, AlertTriangle, HelpCircle,
  Share2, Link as LinkIcon, Copy,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { scoreBrandability } from "@/lib/brandability";
import { scorePronounceability } from "@/lib/pronounceability";
import { checkTrademarkRisk, getTrademarkRiskDisplay } from "@/lib/trademarkCheck";
import { scoreKeywordDemand } from "@/lib/keywordDemand";
import { fetchTrendEnrichment } from "@/lib/trendEnrichment";
import { quickValuation } from "@/lib/domainValuation";
import { estimateSEOVolume } from "@/lib/seoVolume";
import { scoreDomainAge } from "@/lib/domainAge";
import { FlipScoreGauge } from "./FlipScoreGauge";

interface KeyComparable {
  domain: string;
  price: string;
  relevance: string;
}

interface ValueDrivers {
  domain_length: number;
  keywords: number;
  tld: number;
  brandability: number;
  niche_demand: number;
  comparable_sales: number;
}

interface Analysis {
  verdict: string;
  end_user_value: string;
  wholesale_value?: string;
  value_range?: string;
  buyer_persona: string;
  strengths: string[];
  weaknesses: string[];
  suggested_buy_price: string;
  flip_score: number;
  flip_timeline: string;
  niche: string;
  summary: string;
  market_positioning?: string;
  development_potential?: string;
  seo_angle?: string;
  risk_detail?: string;
  valuation_confidence?: string;
  key_comparables?: KeyComparable[];
  confidence_range_low?: string;
  confidence_range_high?: string;
  value_drivers?: ValueDrivers;
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

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

/** Strip markdown formatting so chat replies read as clean plain text. */
function stripMarkdown(text: string): string {
  return text
    .replace(/#{1,6}\s+/g, "")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/__(.+?)__/g, "$1")
    .replace(/_(.+?)_/g, "$1")
    .replace(/~~(.+?)~~/g, "$1")
    .replace(/`(.+?)`/g, "$1")
    .replace(/^\s*[-*+]\s+/gm, "• ")
    .replace(/^\s*\d+\.\s+/gm, (m) => m)
    .trim();
}

const confidenceConfig: Record<string, { icon: typeof CheckCircle2; color: string; label: string }> = {
  High: { icon: CheckCircle2, color: "text-emerald-600 dark:text-emerald-400", label: "High Confidence" },
  Medium: { icon: AlertTriangle, color: "text-amber-600 dark:text-amber-400", label: "Medium Confidence" },
  Low: { icon: HelpCircle, color: "text-red-500 dark:text-red-400", label: "Low Confidence" },
};

interface TldAvailResult {
  domain: string;
  available: boolean | null;
  status: "available" | "registered" | "unknown";
}

export function AIDomainAdvisor() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [domain, setDomain] = useState("");
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [preScores, setPreScores] = useState<PreScores | null>(null);
  
  const [isLoading, setIsLoading] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [followUpInput, setFollowUpInput] = useState("");
  const [isFollowUpLoading, setIsFollowUpLoading] = useState(false);
  const [analyzedDomain, setAnalyzedDomain] = useState<string | null>(null);
  const [tldResults, setTldResults] = useState<TldAvailResult[]>([]);
  const [tldChecking, setTldChecking] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Auto-analyze from URL params (one-click from alerts)
  useEffect(() => {
    const domainParam = searchParams.get("domain");
    if (domainParam && !analyzedDomain) {
      setDomain(domainParam);
      setTimeout(() => handleAnalyze(domainParam), 100);
    }
  }, [searchParams]);

  // Auto-scroll chat only when user sends a message
  const lastScrollTrigger = useRef<"user" | "assistant" | null>(null);
  useEffect(() => {
    if (chatMessages.length === 0) return;
    const lastMsg = chatMessages[chatMessages.length - 1];
    if (lastMsg.role === "user") {
      chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatMessages]);

  const handleAnalyze = async (overrideDomain?: string) => {
    const input = (overrideDomain || domain).trim().toLowerCase();
    if (!input) return;
    setIsLoading(true);
    setAnalysis(null);
    setPreScores(null);
    setChatMessages([]);
    setAnalyzedDomain(input);
    setTldResults([]);
    setTldChecking(false);

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

      const domainWithTld = input.includes(".") ? input : `${input}.com`;
      const enrichment = await fetchTrendEnrichment();
      const brand = scoreBrandability(domainWithTld);
      const pronounce = scorePronounceability(domainWithTld);
      const trademark = checkTrademarkRisk(domainWithTld);
      const demand = scoreKeywordDemand(domainWithTld, enrichment);
      const val = quickValuation(domainWithTld, pronounce.score);
      
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

      if (data?.error) throw new Error(data.error);
      setAnalysis(data);

      // Check TLD availability for the base name
      const baseName = domainWithTld.split(".")[0];
      const tldsToCheck = [
        ".com", ".ai", ".io", ".net", ".co", ".app", ".dev", ".org", ".me", ".gg",
        ".xyz", ".tech", ".so", ".biz", ".cc", ".store", ".health", ".finance",
        ".law", ".agency", ".design", ".media", ".studio", ".sh", ".bio", ".club",
        ".pro", ".live", ".uk", ".de", ".ca", ".fr", ".nl", ".in", ".us", ".eu",
        ".com.au", ".online", ".site", ".info", ".click", ".link", ".space", ".fun",
      ];
      const domainsToCheck = tldsToCheck.map(tld => `${baseName}${tld}`);
      setTldChecking(true);
      try {
        const { data: availData } = await supabase.functions.invoke("check-domain-availability", {
          body: { domains: domainsToCheck },
        });
        if (availData?.results) {
          setTldResults(availData.results as TldAvailResult[]);
        }
      } catch (e) {
        console.error("TLD availability check failed:", e);
      } finally {
        setTldChecking(false);
      }
    } catch (e: any) {
      console.error(e);
      toast({ title: "Analysis failed", description: e.message || "Please try again.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleFollowUp = async () => {
    const question = followUpInput.trim();
    if (!question || !analyzedDomain || !analysis) return;

    const userMsg: ChatMessage = { role: "user", content: question, timestamp: new Date() };
    setChatMessages(prev => [...prev, userMsg]);
    setFollowUpInput("");
    setIsFollowUpLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({ title: "Sign in required", description: "Please log in.", variant: "destructive" });
        setIsFollowUpLoading(false);
        return;
      }

      const conversationHistory = chatMessages.map(m => ({
        role: m.role,
        content: m.content,
      }));

      const { data, error } = await supabase.functions.invoke("ai-domain-advisor", {
        body: {
          domain: analyzedDomain,
          scores: preScores,
          followUp: true,
          question,
          previousAnalysis: analysis,
          conversationHistory,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const assistantMsg: ChatMessage = {
        role: "assistant",
        content: data.answer || data.summary || "I couldn't generate a response.",
        timestamp: new Date(),
      };
      setChatMessages(prev => [...prev, assistantMsg]);
    } catch (e: any) {
      console.error(e);
      const errorMsg: ChatMessage = {
        role: "assistant",
        content: "Sorry, I couldn't process that. Please try again.",
        timestamp: new Date(),
      };
      setChatMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsFollowUpLoading(false);
    }
  };

  const verdictColor = (v: string) => {
    if (v === "Strong Buy") return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-500/30";
    if (v === "Buy") return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-500/30";
    if (v === "Hold") return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-500/30";
    return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-500/30";
  };

  const suggestedFollowUps = analyzedDomain ? [
    `What's the flip ROI for ${analyzedDomain} in e-commerce?`,
    `Compare ${analyzedDomain} to similar .com domains`,
    `Who would be the ideal buyer for ${analyzedDomain}?`,
    `What content strategy would maximize this domain's value?`,
  ] : [];

  const confidence = analysis?.valuation_confidence ? confidenceConfig[analysis.valuation_confidence] : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BrainCircuit className="w-5 h-5 text-primary" />
          AI Domain Advisor
        </CardTitle>
        <CardDescription>
          Get AI-powered investment analysis with follow-up questions. Ask anything about the domain after analysis.
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
          <Button onClick={() => handleAnalyze()} disabled={!domain.trim() || isLoading}>
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
            {/* Share Buttons */}
            <div className="flex items-center gap-2 justify-end">
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs"
                onClick={() => {
                  const url = `${window.location.origin}/tools?tab=advisor&domain=${encodeURIComponent(analyzedDomain || "")}`;
                  navigator.clipboard.writeText(url);
                  toast({ title: "Link copied!", description: "Domain link copied to clipboard." });
                }}
              >
                <LinkIcon className="w-3.5 h-3.5" /> Copy Link
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs"
                onClick={async () => {
                  try {
                    const { data: { session } } = await supabase.auth.getSession();
                    if (!session) {
                      toast({ title: "Sign in required", description: "Log in to save shareable reports.", variant: "destructive" });
                      return;
                    }
                    const { data, error } = await supabase.from("shared_reports").insert({
                      domain_name: analyzedDomain || "",
                      analysis: analysis as any,
                      pre_scores: preScores as any,
                      created_by: session.user.id,
                    }).select("id").single();
                    if (error) throw error;
                    const shareUrl = `${window.location.origin}/report/${data.id}`;
                    await navigator.clipboard.writeText(shareUrl);
                    toast({ title: "Report shared!", description: "Shareable link copied to clipboard. Valid for 90 days." });
                  } catch (e: any) {
                    toast({ title: "Share failed", description: e.message, variant: "destructive" });
                  }
                }}
              >
                <Share2 className="w-3.5 h-3.5" /> Share Report
              </Button>
            </div>

            {/* Verdict + Confidence + Summary */}
            <div className="flex items-start gap-3 p-4 rounded-lg border border-border bg-card">
              <div className="flex flex-col gap-1.5 shrink-0">
                <Badge variant="outline" className={`text-sm font-bold px-3 py-1 ${verdictColor(analysis.verdict)}`}>
                  {analysis.verdict}
                </Badge>
                {confidence && (
                  <div className={`flex items-center gap-1 text-[10px] font-medium ${confidence.color}`}>
                    <confidence.icon className="w-3 h-3" />
                    {confidence.label}
                  </div>
                )}
              </div>
              <p className="text-sm text-foreground leading-relaxed">{analysis.summary}</p>
            </div>

            {/* Flip Score Gauge + Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Flip Score Gauge */}
              <div className="flex flex-col items-center p-4 rounded-lg border border-border bg-card">
                <p className="text-xs text-muted-foreground mb-2 font-medium">Flip Potential</p>
                <FlipScoreGauge score={analysis.flip_score} size={140} />
                <p className="text-xs text-muted-foreground mt-2">
                  <Clock className="w-3 h-3 inline mr-1" />
                  {analysis.flip_timeline}
                </p>
              </div>

              {/* End-User Value */}
              <div className="p-4 rounded-lg border border-border bg-card text-center flex flex-col justify-center">
                <Users className="w-5 h-5 mx-auto mb-2 text-primary" />
                <p className="text-xs text-muted-foreground">End-User Value</p>
                <p className="text-lg font-bold text-foreground mt-1">{analysis.end_user_value || analysis.value_range}</p>
                <p className="text-[10px] text-muted-foreground mt-1">What a brand/startup would pay</p>
              </div>

              {/* Max Acquisition Price */}
              <div className="p-4 rounded-lg border border-border bg-card text-center flex flex-col justify-center">
                <DollarSign className="w-5 h-5 mx-auto mb-2 text-emerald-500" />
                <p className="text-xs text-muted-foreground">Max Buy Price</p>
                <p className="text-lg font-bold text-foreground mt-1">{analysis.suggested_buy_price}</p>
                <p className="text-[10px] text-muted-foreground mt-1">Max an investor should pay</p>
              </div>

              {/* Liquidation Value - 10% of Max Buy Price */}
              <div className="p-4 rounded-lg border border-border bg-card text-center flex flex-col justify-center">
                <TrendingUp className="w-5 h-5 mx-auto mb-2 text-amber-500" />
                <p className="text-xs text-muted-foreground">Liquidation Value</p>
                <p className="text-lg font-bold text-foreground mt-1">
                  {(() => {
                    const buyStr = analysis.suggested_buy_price || "";
                    const nums = buyStr.match(/[\d,]+/g);
                    if (nums && nums.length >= 1) {
                      const vals = nums.map(n => parseInt(n.replace(/,/g, ""), 10));
                      const liqVals = vals.map(v => Math.round(v * 0.1));
                      return liqVals.length === 2
                        ? `$${liqVals[0].toLocaleString()} - $${liqVals[1].toLocaleString()}`
                        : `$${liqVals[0].toLocaleString()}`;
                    }
                    return "N/A";
                  })()}
                </p>
                <p className="text-[10px] text-muted-foreground mt-1">Quick-sale / fire-sale price</p>
              </div>
            </div>

            {/* Confidence Interval Range */}
            {analysis.confidence_range_low && analysis.confidence_range_high && (
              <div className="p-4 rounded-lg border border-border bg-card space-y-2">
                <h4 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                  <BarChart3 className="w-4 h-4 text-primary" /> Confidence Interval
                </h4>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-muted-foreground">{analysis.confidence_range_low}</span>
                  <div className="flex-1 h-3 rounded-full bg-secondary relative overflow-hidden">
                    <div className="absolute inset-y-0 left-[15%] right-[15%] rounded-full bg-gradient-to-r from-amber-500/60 via-emerald-500/80 to-amber-500/60" />
                    <div className="absolute inset-y-0 left-[35%] right-[35%] rounded-full bg-emerald-500" />
                  </div>
                  <span className="text-sm font-medium text-muted-foreground">{analysis.confidence_range_high}</span>
                </div>
                <p className="text-[10px] text-muted-foreground text-center">
                  End-user value likely falls in this range • Centre = {analysis.end_user_value}
                </p>
              </div>
            )}

            {/* Value Driver Breakdown */}
            {analysis.value_drivers && (
              <div className="p-4 rounded-lg border border-border bg-card space-y-3">
                <h4 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                  <BarChart3 className="w-4 h-4 text-primary" /> Value Driver Breakdown
                </h4>
                <div className="space-y-2">
                  {[
                    { key: "keywords", label: "Keywords", color: "bg-blue-500" },
                    { key: "tld", label: "TLD Premium", color: "bg-emerald-500" },
                    { key: "brandability", label: "Brandability", color: "bg-violet-500" },
                    { key: "niche_demand", label: "Niche Demand", color: "bg-amber-500" },
                    { key: "domain_length", label: "Domain Length", color: "bg-rose-500" },
                    { key: "comparable_sales", label: "Comparable Sales", color: "bg-cyan-500" },
                  ]
                    .sort((a, b) => (analysis.value_drivers![b.key as keyof ValueDrivers] || 0) - (analysis.value_drivers![a.key as keyof ValueDrivers] || 0))
                    .map(({ key, label, color }) => {
                      const pct = analysis.value_drivers![key as keyof ValueDrivers] || 0;
                      if (pct === 0) return null;
                      return (
                        <div key={key} className="flex items-center gap-3">
                          <span className="text-xs text-muted-foreground w-28 shrink-0 text-right">{label}</span>
                          <div className="flex-1 h-2.5 rounded-full bg-secondary overflow-hidden">
                            <div
                              className={`h-full rounded-full ${color} transition-all`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="text-xs font-semibold text-foreground w-10">{pct}%</span>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}

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
                  <p className="text-[10px] text-muted-foreground">Trademark</p>
                  <p className={`text-sm font-bold ${preScores.trademarkRisk === "None" ? "text-emerald-600 dark:text-emerald-400" : preScores.trademarkRisk === "Low" ? "text-amber-600 dark:text-amber-400" : "text-red-600 dark:text-red-400"}`}>{preScores.trademarkRisk}</p>
                </div>
              </div>
            )}

            {/* TLD Registration Section */}
            {(tldResults.length > 0 || tldChecking) && (
              <div className="p-4 rounded-lg border border-border bg-card">
                <h4 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                  <Globe2 className="w-4 h-4 text-primary" /> TLD Registrations
                  {tldChecking ? (
                    <span className="flex items-center gap-1 ml-2 text-xs text-muted-foreground font-normal">
                      <Loader2 className="w-3 h-3 animate-spin" /> Checking {tldResults.length > 0 ? `${tldResults.length}` : ""} TLDs...
                    </span>
                  ) : tldResults.length > 0 && (() => {
                    const regCount = tldResults.filter(r => r.status === "registered").length;
                    const color = regCount >= 25 ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-500/30"
                      : regCount >= 15 ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-500/30"
                      : regCount >= 5 ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-500/30"
                      : "bg-muted text-muted-foreground border-border";
                    return (
                      <Badge variant="outline" className={`text-xs font-bold ml-2 ${color}`}>
                        {regCount}/{tldResults.length} TLDs registered
                      </Badge>
                    );
                  })()}
                </h4>
                <p className="text-xs text-muted-foreground mt-1">Higher count = more popular name across domain extensions</p>
              </div>
            )}

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

            {/* Key Comparables — "Why This Price?" */}
            {analysis.key_comparables && analysis.key_comparables.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                  <DollarSign className="w-4 h-4 text-primary" /> Why This Price? — Key Comparables
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {analysis.key_comparables.map((comp, i) => (
                    <div key={i} className="p-3 rounded-lg border border-border bg-card space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-foreground">{comp.domain}</span>
                        <span className="text-sm font-bold text-primary">{comp.price}</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground leading-relaxed">{comp.relevance}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

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

            {/* Deep Dive Insights */}
            {(analysis.market_positioning || analysis.development_potential || analysis.seo_angle || analysis.risk_detail) && (
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                  <BarChart3 className="w-4 h-4 text-primary" /> Deep Dive Insights
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {analysis.market_positioning && (
                    <div className="p-3 rounded-lg border border-border bg-card space-y-1">
                      <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                        <TrendingUp className="w-3.5 h-3.5 text-primary" /> Market Positioning
                      </p>
                      <p className="text-xs text-muted-foreground leading-relaxed">{analysis.market_positioning}</p>
                    </div>
                  )}
                  {analysis.development_potential && (
                    <div className="p-3 rounded-lg border border-border bg-card space-y-1">
                      <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-primary" /> Development Potential
                      </p>
                      <p className="text-xs text-muted-foreground leading-relaxed">{analysis.development_potential}</p>
                    </div>
                  )}
                  {analysis.seo_angle && (
                    <div className="p-3 rounded-lg border border-border bg-card space-y-1">
                      <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                        <Globe2 className="w-3.5 h-3.5 text-primary" /> SEO & Marketing
                      </p>
                      <p className="text-xs text-muted-foreground leading-relaxed">{analysis.seo_angle}</p>
                    </div>
                  )}
                  {analysis.risk_detail && (
                    <div className="p-3 rounded-lg border border-border bg-card space-y-1">
                      <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                        <ShieldAlert className="w-3.5 h-3.5 text-primary" /> Risk Assessment
                      </p>
                      <p className="text-xs text-muted-foreground leading-relaxed">{analysis.risk_detail}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="p-4 rounded-lg border border-border bg-secondary/30 space-y-3">
              <h4 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-primary" /> Next Steps
              </h4>
              <div className="flex flex-wrap gap-2">
                <Link to={`/tools/brandability-score?domain=${encodeURIComponent(analyzedDomain || "")}`}>
                  <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                    <Award className="w-3.5 h-3.5" /> Score Brandability
                    <ArrowRight className="w-3 h-3" />
                  </Button>
                </Link>
                <Link to={`/tools/pronounceability?domain=${encodeURIComponent(analyzedDomain || "")}`}>
                  <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                    <Mic className="w-3.5 h-3.5" /> Pronounceability
                    <ArrowRight className="w-3 h-3" />
                  </Button>
                </Link>
                <Link to={`/tools/domain-generator?seed=${encodeURIComponent(analyzedDomain?.split(".")[0] || "")}`}>
                  <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                    <Sparkles className="w-3.5 h-3.5" /> Generate Variants
                    <ArrowRight className="w-3 h-3" />
                  </Button>
                </Link>
                <Link to={`/tools/tld-compare?domain=${encodeURIComponent(analyzedDomain?.split(".")[0] || "")}`}>
                  <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                    <Globe2 className="w-3.5 h-3.5" /> Compare TLDs
                    <ArrowRight className="w-3 h-3" />
                  </Button>
                </Link>
              </div>
            </div>

            {/* Conversational Chat */}
            <div className="border border-border rounded-lg overflow-hidden">
              <div className="px-4 py-3 bg-secondary/30 border-b border-border flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium text-foreground">Ask Follow-Up Questions</span>
              </div>

              {/* Chat Messages */}
              {chatMessages.length > 0 && (
                <div className="h-72 overflow-y-auto p-4 overscroll-contain touch-pan-y">
                  <div className="space-y-3">
                    {chatMessages.map((msg, i) => (
                      <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[85%] px-3 py-2 rounded-lg text-sm whitespace-pre-wrap ${
                          msg.role === "user"
                            ? "bg-primary text-primary-foreground"
                            : "bg-secondary text-secondary-foreground"
                        }`}>
                          {msg.role === "assistant" ? stripMarkdown(msg.content) : msg.content}
                        </div>
                      </div>
                    ))}
                    {isFollowUpLoading && (
                      <div className="flex justify-start">
                        <div className="px-3 py-2 rounded-lg bg-secondary text-secondary-foreground text-sm flex items-center gap-2">
                          <Loader2 className="w-3 h-3 animate-spin" /> Thinking...
                        </div>
                      </div>
                    )}
                    <div ref={chatEndRef} />
                  </div>
                </div>
              )}

              {/* Suggested Questions */}
              {chatMessages.length === 0 && (
                <div className="p-3 flex flex-wrap gap-2">
                  {suggestedFollowUps.map((q, i) => (
                    <button
                      key={i}
                      onClick={() => { setFollowUpInput(q); }}
                      className="text-xs px-3 py-1.5 rounded-full bg-secondary/50 hover:bg-secondary text-muted-foreground hover:text-foreground border border-border/50 transition-colors"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              )}

              {/* Input */}
              <div className="flex gap-2 p-3 border-t border-border">
                <Input
                  placeholder={`Ask about ${analyzedDomain || "this domain"}...`}
                  value={followUpInput}
                  onChange={(e) => setFollowUpInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !isFollowUpLoading && handleFollowUp()}
                  className="flex-1"
                  disabled={isFollowUpLoading}
                />
                <Button size="sm" onClick={handleFollowUp} disabled={!followUpInput.trim() || isFollowUpLoading}>
                  {isFollowUpLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </Button>
              </div>
            </div>

            <p className="text-xs text-muted-foreground text-center">
              AI analysis enriched with brandability ({preScores?.brandability}), demand ({preScores?.keywordDemand}), and {analysis.key_comparables?.length || 0} comparable sales. Not financial advice.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
