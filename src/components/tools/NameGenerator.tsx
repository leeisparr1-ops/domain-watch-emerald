import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sparkles, Loader2, Globe, CheckCircle2, XCircle, HelpCircle, ShieldAlert, ShieldCheck, TrendingUp, Lightbulb } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { scorePronounceability } from "@/lib/pronounceability";
import { checkTrademarkRisk, getTrademarkRiskDisplay } from "@/lib/trademarkCheck";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface TldStatus {
  domain: string;
  available: boolean | null;
  status: "available" | "registered" | "unknown";
}

interface Suggestion {
  name: string;
  score: number;
  trend_score?: number;
  reason: string;
  available_tlds: string[];
  pronounceScore?: number;
  tldStatuses?: TldStatus[];
  checkingTlds?: boolean;
  trademarkRisk?: ReturnType<typeof checkTrademarkRisk>;
}

type InputMode = "keywords" | "inspired";

export function NameGenerator() {
  const [keywords, setKeywords] = useState("");
  const [inspiredBy, setInspiredBy] = useState("");
  const [inputMode, setInputMode] = useState<InputMode>("keywords");
  const [industry, setIndustry] = useState("");
  const [style, setStyle] = useState("mixed");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const extractNamePart = (fullDomain: string) => {
    const dot = fullDomain.lastIndexOf(".");
    return dot > 0 ? fullDomain.substring(0, dot) : fullDomain;
  };

  const checkAvailability = async (items: Suggestion[]) => {
    const allDomains: string[] = [];
    items.forEach((s) => {
      const namePart = extractNamePart(s.name);
      s.available_tlds.forEach((tld) => {
        const domain = `${namePart}${tld.startsWith(".") ? tld : `.${tld}`}`;
        allDomains.push(domain);
      });
    });

    if (allDomains.length === 0) return;

    try {
      const { data, error } = await supabase.functions.invoke("check-domain-availability", {
        body: { domains: allDomains },
      });

      if (error || !data?.results) {
        console.error("Availability check failed:", error);
        return;
      }

      const resultMap = new Map<string, TldStatus>();
      (data.results as TldStatus[]).forEach((r) => resultMap.set(r.domain, r));

      setSuggestions((prev) =>
        prev.map((s) => {
          const namePart = extractNamePart(s.name);
          const tldStatuses = s.available_tlds.map((tld) => {
            const domain = `${namePart}${tld.startsWith(".") ? tld : `.${tld}`}`;
            return resultMap.get(domain) || { domain, available: null, status: "unknown" as const };
          });
          return { ...s, tldStatuses, checkingTlds: false };
        })
      );
    } catch (e) {
      console.error("Availability check error:", e);
      setSuggestions((prev) => prev.map((s) => ({ ...s, checkingTlds: false })));
    }
  };

  const handleGenerate = async () => {
    const input = inputMode === "inspired" ? inspiredBy.trim() : keywords.trim();
    if (!input) return;
    setIsLoading(true);
    setSuggestions([]);

    try {
      const body: Record<string, string | undefined> = {
        keywords: inputMode === "keywords" ? input : `domains similar to ${input}`,
        industry: industry.trim() || undefined,
        style,
      };
      if (inputMode === "inspired") {
        body.inspired_by = input;
      }

      const { data, error } = await supabase.functions.invoke("generate-domain-names", { body });

      if (error) throw error;

      const items: Suggestion[] = (data?.suggestions || []).map((s: any) => {
        const pScore = scorePronounceability(s.name).score;
        return {
          ...s,
          trend_score: s.trend_score ?? 0,
          pronounceScore: pScore,
          trademarkRisk: checkTrademarkRisk(s.name),
          checkingTlds: true,
        };
      });

      setSuggestions(items);
      setIsLoading(false);
      checkAvailability(items);
    } catch (e: any) {
      console.error(e);
      toast({
        title: "Generation failed",
        description: e.message || "Please try again.",
        variant: "destructive",
      });
      setIsLoading(false);
    }
  };

  const scoreColor = (score: number) => {
    if (score >= 80) return "text-emerald-600 dark:text-emerald-400";
    if (score >= 60) return "text-blue-600 dark:text-blue-400";
    if (score >= 40) return "text-amber-600 dark:text-amber-400";
    return "text-red-600 dark:text-red-400";
  };

  const trendColor = (score: number) => {
    if (score >= 75) return "text-emerald-600 dark:text-emerald-400 border-emerald-500/30 bg-emerald-500/10";
    if (score >= 50) return "text-blue-600 dark:text-blue-400 border-blue-500/30 bg-blue-500/10";
    if (score >= 25) return "text-amber-600 dark:text-amber-400 border-amber-500/30 bg-amber-500/10";
    return "text-muted-foreground";
  };

  const statusIcon = (status: TldStatus) => {
    if (status.status === "available") return <CheckCircle2 className="w-3 h-3 text-emerald-500" />;
    if (status.status === "registered") return <XCircle className="w-3 h-3 text-red-500" />;
    return <HelpCircle className="w-3 h-3 text-muted-foreground" />;
  };

  const statusBadgeClass = (status: TldStatus) => {
    if (status.status === "available") return "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400";
    if (status.status === "registered") return "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-400 line-through";
    return "";
  };

  const canGenerate = inputMode === "inspired" ? inspiredBy.trim().length > 0 : keywords.trim().length > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          AI Name Generator
          <Badge variant="secondary" className="text-[10px] font-bold uppercase tracking-wider bg-primary/10 text-primary border-primary/20">
            2026
          </Badge>
        </CardTitle>
        <CardDescription>
          Investor-grade domain name generation powered by 2026 market trends. Get names optimized for flipping, holding, or branding — with live availability, trademark screening, and trend alignment scores.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Input Mode Tabs */}
        <Tabs value={inputMode} onValueChange={(v) => setInputMode(v as InputMode)} className="w-full">
          <TabsList className="grid w-full grid-cols-2 h-9">
            <TabsTrigger value="keywords" className="text-xs flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              Keywords
            </TabsTrigger>
            <TabsTrigger value="inspired" className="text-xs flex items-center gap-1.5">
              <Lightbulb className="w-3.5 h-3.5" />
              Inspired By
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="space-y-4">
          {inputMode === "keywords" ? (
            <Input
              placeholder="Keywords (e.g. ai fintech startup, quantum computing)"
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !isLoading && handleGenerate()}
            />
          ) : (
            <Input
              placeholder="Paste a sold domain (e.g. Surface.ai, Midnight.com)"
              value={inspiredBy}
              onChange={(e) => setInspiredBy(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !isLoading && handleGenerate()}
            />
          )}
          <div className="grid grid-cols-2 gap-3">
            <Input
              placeholder="Industry (optional)"
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
            />
            <Select value={style} onValueChange={setStyle}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="mixed">🎯 Mixed Strategy</SelectItem>
                <SelectItem value="investor_flip">🔥 Investor Flip</SelectItem>
                <SelectItem value="premium_brand">💎 Premium Brand</SelectItem>
                <SelectItem value="keyword_rich">🔑 Keyword-Rich</SelectItem>
                <SelectItem value="expired_pattern">📡 Expired Pattern</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Style hint */}
          <p className="text-xs text-muted-foreground">
            {style === "investor_flip" && "⚡ Short, trending names for quick 3-10x flips. Biased toward .ai and .com."}
            {style === "premium_brand" && "💎 Invented, ultra-memorable names that command premium aftermarket prices."}
            {style === "keyword_rich" && "🔑 Exact-match & descriptive names with SEO and type-in traffic potential."}
            {style === "expired_pattern" && "📡 Names matching common drop patterns — the kind ExpiredHawk alerts catch daily."}
            {style === "mixed" && "🎯 Strategic mix of flip candidates, premium brands, and keyword-rich domains."}
          </p>

          <Button onClick={handleGenerate} disabled={!canGenerate || isLoading} className="w-full">
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generating with 2026 trends...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                {inputMode === "inspired" ? "Generate Similar Names" : "Generate Names"}
              </>
            )}
          </Button>
        </div>

        {suggestions.length > 0 && (
          <div className="space-y-3 animate-fade-in">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h4 className="text-sm font-semibold text-foreground">{suggestions.length} Suggestions</h4>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-emerald-500" /> Available</span>
                <span className="flex items-center gap-1"><XCircle className="w-3 h-3 text-red-500" /> Taken</span>
                <span className="flex items-center gap-1"><TrendingUp className="w-3 h-3 text-blue-500" /> Trend</span>
              </div>
            </div>
            {suggestions.map((s, i) => {
              const tmDisplay = s.trademarkRisk ? getTrademarkRiskDisplay(s.trademarkRisk.riskLevel) : null;
              return (
                <div key={i} className={`p-4 rounded-lg border bg-card transition-colors ${s.trademarkRisk?.riskLevel === "high" ? "border-red-500/30" : s.trademarkRisk?.riskLevel === "medium" ? "border-orange-500/30" : "border-border hover:border-primary/30"}`}>
                  <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <Globe className="w-4 h-4 text-primary" />
                      <span className="font-semibold text-foreground">{s.name}</span>
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <Badge variant="outline" className={scoreColor(s.score)}>
                        Brand: {s.score}
                      </Badge>
                      {s.trend_score !== undefined && s.trend_score > 0 && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Badge variant="outline" className={`cursor-help ${trendColor(s.trend_score)}`}>
                              <TrendingUp className="w-3 h-3 mr-0.5" />
                              {s.trend_score}
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Trend Score: How aligned with current market signals and recent sales trends</p>
                          </TooltipContent>
                        </Tooltip>
                      )}
                      {s.pronounceScore !== undefined && (
                        <Badge variant="outline" className={scoreColor(s.pronounceScore)}>
                          Say: {s.pronounceScore}
                        </Badge>
                      )}
                      {tmDisplay && s.trademarkRisk && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Badge variant="outline" className={`text-xs cursor-help ${tmDisplay.color}`}>
                              {s.trademarkRisk.riskLevel === "none" ? (
                                <ShieldCheck className="w-3 h-3 mr-0.5" />
                              ) : (
                                <ShieldAlert className="w-3 h-3 mr-0.5" />
                              )}
                              {tmDisplay.label}
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <p>{s.trademarkRisk.summary}</p>
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">{s.reason}</p>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs text-muted-foreground mr-1">TLDs:</span>
                    {s.checkingTlds ? (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Loader2 className="w-3 h-3 animate-spin" /> Checking availability...
                      </span>
                    ) : s.tldStatuses ? (
                      s.tldStatuses.map((ts) => {
                        const tld = ts.domain.substring(ts.domain.indexOf("."));
                        return (
                          <Badge key={ts.domain} variant="outline" className={`text-xs flex items-center gap-1 ${statusBadgeClass(ts)}`}>
                            {statusIcon(ts)}
                            {tld}
                          </Badge>
                        );
                      })
                    ) : (
                      s.available_tlds.map((tld) => (
                        <Badge key={tld} variant="secondary" className="text-xs">
                          {tld}
                        </Badge>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
            <p className="text-xs text-muted-foreground text-center mt-2">
              Trend data based on publicly available market reports. Availability via RDAP. Trademark screening covers ~200 major brands — not legal advice. Always verify independently.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
