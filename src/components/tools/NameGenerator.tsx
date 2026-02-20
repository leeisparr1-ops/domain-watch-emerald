import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sparkles, Loader2, Globe, CheckCircle2, XCircle, HelpCircle, ShieldAlert, ShieldCheck, TrendingUp, Lightbulb, Filter, ExternalLink } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
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
  const [loadingStep, setLoadingStep] = useState(0);
  const [showOnlyAvailable, setShowOnlyAvailable] = useState(true);
  const [includeExtraTlds, setIncludeExtraTlds] = useState(false);
  const { toast } = useToast();

  const loadingSteps = [
    { label: "Analyzing market trends & keywords...", icon: "📊" },
    { label: "Generating investor-grade names with AI...", icon: "🤖" },
    { label: "Screening for trademark conflicts...", icon: "🛡️" },
    { label: "Checking .com availability...", icon: "🌐" },
    { label: "Filtering & ranking results...", icon: "⚡" },
  ];

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
    setLoadingStep(0);
    setSuggestions([]);

    try {
      const body: Record<string, string | boolean | undefined> = {
        keywords: inputMode === "keywords" ? input : `domains similar to ${input}`,
        industry: industry.trim() || undefined,
        style,
        include_extra_tlds: includeExtraTlds,
      };
      if (inputMode === "inspired") {
        body.inspired_by = input;
      }

      // Step 1: Analyzing trends
      setLoadingStep(0);
      await new Promise((r) => setTimeout(r, 600));

      // Step 2: Generating names
      setLoadingStep(1);
      const { data, error } = await supabase.functions.invoke("generate-domain-names", { body });

      if (error) throw error;

      // Step 3: Trademark screening
      setLoadingStep(2);
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

      if (items.length === 0) {
        toast({
          title: "No names generated",
          description: "Try different keywords or a broader industry.",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      setSuggestions(items);

      // Step 4: Checking availability
      setLoadingStep(3);
      await checkAvailability(items);

      // Step 5: Filtering
      setLoadingStep(4);
      await new Promise((r) => setTimeout(r, 400));

      setIsLoading(false);
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

          <div className="flex items-center gap-2 p-3 rounded-lg border border-border bg-muted/30">
            <Switch
              id="extra-tlds"
              checked={includeExtraTlds}
              onCheckedChange={setIncludeExtraTlds}
            />
            <Label htmlFor="extra-tlds" className="text-xs cursor-pointer">
              <span className="font-medium text-foreground">.com only</span>
              <span className="text-muted-foreground ml-1">
                {includeExtraTlds ? "— also checking .ai, .io, .co, .app, .dev" : "— the king of resale (toggle for more TLDs)"}
              </span>
            </Label>
          </div>

          <Button onClick={handleGenerate} disabled={!canGenerate || isLoading} className="w-full">
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {loadingSteps[loadingStep]?.label || "Processing..."}
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                {inputMode === "inspired" ? "Generate Similar Names" : "Generate Names"}
              </>
            )}
          </Button>
        </div>

        {/* Multi-step loading indicator */}
        {isLoading && (
          <div className="space-y-3 p-4 rounded-lg border border-primary/20 bg-primary/5 animate-fade-in">
            <p className="text-sm font-medium text-foreground">Deep analysis in progress...</p>
            <div className="space-y-2">
              {loadingSteps.map((step, i) => (
                <div key={i} className={`flex items-center gap-2 text-xs transition-opacity duration-300 ${i <= loadingStep ? "opacity-100" : "opacity-30"}`}>
                  {i < loadingStep ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                  ) : i === loadingStep ? (
                    <Loader2 className="w-3.5 h-3.5 text-primary animate-spin flex-shrink-0" />
                  ) : (
                    <div className="w-3.5 h-3.5 rounded-full border border-muted-foreground/30 flex-shrink-0" />
                  )}
                  <span className={i <= loadingStep ? "text-foreground" : "text-muted-foreground"}>
                    {step.icon} {step.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {suggestions.length > 0 && (() => {
          // Filter suggestions: only show TLDs that are available, and hide names with 0 available TLDs
          const filtered = showOnlyAvailable
            ? suggestions
                .map((s) => {
                  if (!s.tldStatuses) return s; // still checking
                  const availableTlds = s.tldStatuses.filter((ts) => ts.status === "available");
                  if (availableTlds.length === 0) return null;
                  return { ...s, tldStatuses: availableTlds };
                })
                .filter(Boolean) as Suggestion[]
            : suggestions;

          const stillChecking = suggestions.some((s) => s.checkingTlds);
          const totalAvailable = suggestions.filter(
            (s) => s.tldStatuses && s.tldStatuses.some((ts) => ts.status === "available")
          ).length;

          return (
            <div className="space-y-3 animate-fade-in">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h4 className="text-sm font-semibold text-foreground">
                  {showOnlyAvailable && !stillChecking
                    ? `${filtered.length} Available Names`
                    : `${suggestions.length} Suggestions`}
                </h4>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Switch
                      id="available-only"
                      checked={showOnlyAvailable}
                      onCheckedChange={setShowOnlyAvailable}
                    />
                    <Label htmlFor="available-only" className="text-xs text-muted-foreground cursor-pointer">
                      Available only
                    </Label>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-emerald-500" /> Available</span>
                    <span className="flex items-center gap-1"><TrendingUp className="w-3 h-3 text-blue-500" /> Trend</span>
                  </div>
                </div>
              </div>

              {!stillChecking && showOnlyAvailable && filtered.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Filter className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No names with available TLDs found.</p>
                  <p className="text-xs mt-1">Try turning off the "Available only" filter, or generate new names.</p>
                </div>
              )}

              {filtered.map((s, i) => {
                const tmDisplay = s.trademarkRisk ? getTrademarkRiskDisplay(s.trademarkRisk.riskLevel) : null;
                return (
                  <div key={i} className={`p-4 rounded-lg border bg-card transition-colors ${s.trademarkRisk?.riskLevel === "high" ? "border-red-500/30" : s.trademarkRisk?.riskLevel === "medium" ? "border-orange-500/30" : "border-border hover:border-primary/30"}`}>
                    <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <Globe className="w-4 h-4 text-primary" />
                        <span className="font-semibold text-foreground">{extractNamePart(s.name)}</span>
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
                          const registerUrl = `https://www.godaddy.com/domainsearch/find?domainToCheck=${encodeURIComponent(ts.domain)}`;
                          return (
                            <span key={ts.domain} className="inline-flex items-center gap-0.5">
                              <Badge variant="outline" className={`text-xs flex items-center gap-1 ${statusBadgeClass(ts)}`}>
                                {statusIcon(ts)}
                                {tld}
                              </Badge>
                              {ts.status === "available" && (
                                <a
                                  href={registerUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-0.5 text-[10px] font-medium text-primary hover:text-primary/80 transition-colors px-1"
                                >
                                  Register <ExternalLink className="w-2.5 h-2.5" />
                                </a>
                              )}
                            </span>
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
                Availability checked via DNS — always verify with your registrar before purchasing. Trademark screening covers ~200 major brands — not legal advice.
              </p>
            </div>
          );
        })()}
      </CardContent>
    </Card>
  );
}
