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
  Award, Mic, Sparkles, Globe2, ArrowRight,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { scoreBrandability } from "@/lib/brandability";
import { scorePronounceability } from "@/lib/pronounceability";
import { checkTrademarkRisk, getTrademarkRiskDisplay } from "@/lib/trademarkCheck";
import { scoreKeywordDemand } from "@/lib/keywordDemand";
import { quickValuation } from "@/lib/domainValuation";
import { estimateSEOVolume } from "@/lib/seoVolume";
import { scoreDomainAge } from "@/lib/domainAge";
import { FlipScoreGauge } from "./FlipScoreGauge";

interface Analysis {
  verdict: string;
  end_user_value: string;
  value_range?: string;
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
  valuationMin: number;
  valuationMax: number;
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
    .replace(/#{1,6}\s+/g, "")          // ### headings
    .replace(/\*\*(.+?)\*\*/g, "$1")     // **bold**
    .replace(/\*(.+?)\*/g, "$1")         // *italic*
    .replace(/__(.+?)__/g, "$1")         // __bold__
    .replace(/_(.+?)_/g, "$1")           // _italic_
    .replace(/~~(.+?)~~/g, "$1")         // ~~strike~~
    .replace(/`(.+?)`/g, "$1")           // `code`
    .replace(/^\s*[-*+]\s+/gm, "• ")     // list bullets → •
    .replace(/^\s*\d+\.\s+/gm, (m) => m) // keep numbered lists
    .trim();
}

export function AIDomainAdvisor() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [domain, setDomain] = useState("");
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [preScores, setPreScores] = useState<PreScores | null>(null);
  const [algorithmicValuation, setAlgorithmicValuation] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [followUpInput, setFollowUpInput] = useState("");
  const [isFollowUpLoading, setIsFollowUpLoading] = useState(false);
  const [analyzedDomain, setAnalyzedDomain] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Auto-analyze from URL params (one-click from alerts)
  useEffect(() => {
    const domainParam = searchParams.get("domain");
    if (domainParam && !analyzedDomain) {
      setDomain(domainParam);
      // Small delay to allow component to mount
      setTimeout(() => handleAnalyze(domainParam), 100);
    }
  }, [searchParams]);

  // Auto-scroll chat only when user sends a message (not on AI response)
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
      const brand = scoreBrandability(domainWithTld);
      const pronounce = scorePronounceability(domainWithTld);
      const trademark = checkTrademarkRisk(domainWithTld);
      const demand = scoreKeywordDemand(domainWithTld);
      const val = quickValuation(domainWithTld, pronounce.score);
      setAlgorithmicValuation(`$${val.valueMin.toLocaleString()} - $${val.valueMax.toLocaleString()}`);
      const seo = estimateSEOVolume(domainWithTld);
      const age = scoreDomainAge(null);

      const scores: PreScores = {
        brandability: brand.overall,
        pronounceability: pronounce.score,
        keywordDemand: demand.score,
        keywordDemandLabel: demand.label,
        valuationRange: val.band,
        valuationMin: val.valueMin,
        valuationMax: val.valueMax,
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

      // Build conversation context
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
            {/* Verdict + Summary */}
            <div className="flex items-start gap-3 p-4 rounded-lg border border-border bg-card">
              <Badge variant="outline" className={`text-sm font-bold px-3 py-1 shrink-0 ${verdictColor(analysis.verdict)}`}>
                {analysis.verdict}
              </Badge>
              <p className="text-sm text-foreground leading-relaxed">{analysis.summary}</p>
            </div>

            {/* Flip Score Gauge + Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                <DollarSign className="w-5 h-5 mx-auto mb-2 text-primary" />
                <p className="text-xs text-muted-foreground">Max Acquisition Price</p>
                <p className="text-lg font-bold text-foreground mt-1">{analysis.suggested_buy_price}</p>
                <p className="text-[10px] text-muted-foreground mt-1">Max an investor should pay</p>
              </div>
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
                  <p className="text-[10px] text-muted-foreground">Algo. Value</p>
                  <p className="text-xs font-bold text-foreground">{algorithmicValuation || "N/A"}</p>
                </div>
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

            {/* Tool Chaining Actions */}
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
                <Link to={`/tools/valuation?domain=${encodeURIComponent(analyzedDomain || "")}`}>
                  <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                    <DollarSign className="w-3.5 h-3.5" /> Deep Valuation
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
              AI analysis enriched with brandability ({preScores?.brandability}), demand ({preScores?.keywordDemand}), and valuation scores. Not financial advice.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
