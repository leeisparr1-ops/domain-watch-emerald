import { useState, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sparkles, Loader2, Globe, CheckCircle2, XCircle, HelpCircle, ShieldAlert, ShieldCheck, TrendingUp, Lightbulb, Filter, ExternalLink, RefreshCw, ArrowUpDown, Download, Gavel, Clock, Wand2, Save, FolderOpen, Trash2, ChevronDown } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/useAuth";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
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
import { useBackClose } from "@/hooks/useBackClose";

interface TldStatus {
  domain: string;
  available: boolean | null;
  status: "available" | "registered" | "unknown";
}

interface AuctionMatch {
  domain_name: string;
  price: number;
  end_time: string | null;
  inventory_source: string | null;
  auction_type: string | null;
}

interface Suggestion {
  name: string; // just the name part, no TLD
  score: number;
  trend_score?: number;
  reason: string;
  pronounceScore?: number;
  tldStatuses?: TldStatus[];
  checkingTlds?: boolean;
  trademarkRisk?: ReturnType<typeof checkTrademarkRisk>;
  auctionMatches?: AuctionMatch[];
}

type InputMode = "keywords" | "inspired" | "competitor";
type SortOption = "synergy" | "trend" | "alpha" | "auction";

// Default: .com only (verified via RDAP — authoritative registry lookup)
// Extra TLDs also use RDAP where supported, DNS fallback otherwise
const CORE_TLDS = [".com"];
const EXTRA_TLDS = [".ai", ".io", ".net", ".co", ".app", ".dev", ".org"];

interface SavedSession {
  id: string;
  session_name: string;
  input_mode: string;
  keywords: string | null;
  inspired_by: string | null;
  competitors: string | null;
  industry: string | null;
  style: string;
  suggestions: any;
  created_at: string;
}

export function NameGenerator() {
  const [keywords, setKeywords] = useState("");
  const [inspiredBy, setInspiredBy] = useState("");
  const [competitors, setCompetitors] = useState("");
  const [inputMode, setInputMode] = useState<InputMode>("keywords");
  const [industry, setIndustry] = useState("");
  const [style, setStyle] = useState("mixed");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [showOnlyAvailable, setShowOnlyAvailable] = useState(true);
  const [includeExtraTlds, setIncludeExtraTlds] = useState(false);
  const [availabilityProgress, setAvailabilityProgress] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("synergy");
  const [hasGenerated, setHasGenerated] = useState(false);
  const [savedSessions, setSavedSessions] = useState<SavedSession[]>([]);
  const [sessionsOpen, setSessionsOpen] = useState(false);
  const handleSessionsClose = useCallback(() => setSessionsOpen(false), []);
  useBackClose(sessionsOpen, handleSessionsClose);
  const [savingSession, setSavingSession] = useState(false);
  const [synonymBoost, setSynonymBoost] = useState(false);
  const [maxLengthFilter, setMaxLengthFilter] = useState(0); // 0 = no filter
  const { toast } = useToast();
  const { user } = useAuth();

  const tldsToCheck = includeExtraTlds ? [...CORE_TLDS, ...EXTRA_TLDS] : CORE_TLDS;

  // Load saved sessions on mount
  useEffect(() => {
    if (!user) return;
    const loadSessions = async () => {
      const { data } = await supabase
        .from("generator_sessions")
        .select("id, session_name, input_mode, keywords, inspired_by, competitors, industry, style, suggestions, created_at")
        .order("created_at", { ascending: false })
        .limit(50);
      if (data) setSavedSessions(data as SavedSession[]);
    };
    loadSessions();
  }, [user]);

  const handleSaveSession = async () => {
    if (!user) {
      toast({ title: "Sign in to save sessions", description: "Session saving requires an account.", variant: "destructive" });
      return;
    }
    if (suggestions.length === 0) return;
    setSavingSession(true);
    const sessionName = `${inputMode === "keywords" ? keywords : inputMode === "competitor" ? competitors : inspiredBy} — ${new Date().toLocaleDateString()}`;
    const { data, error } = await supabase
      .from("generator_sessions")
      .insert([{
        user_id: user.id,
        session_name: sessionName,
        input_mode: inputMode,
        keywords: keywords || null,
        inspired_by: inspiredBy || null,
        competitors: competitors || null,
        industry: industry || null,
        style,
        suggestions: JSON.parse(JSON.stringify(suggestions.map((s) => ({
          name: s.name, score: s.score, trend_score: s.trend_score, reason: s.reason,
          pronounceScore: s.pronounceScore, tldStatuses: s.tldStatuses,
          trademarkRisk: s.trademarkRisk, auctionMatches: s.auctionMatches,
        })))),
      }])
      .select("id, session_name, input_mode, keywords, inspired_by, competitors, industry, style, suggestions, created_at")
      .single();
    if (error) {
      toast({ title: "Failed to save", description: error.message, variant: "destructive" });
    } else if (data) {
      setSavedSessions((prev) => [data as SavedSession, ...prev]);
      toast({ title: "Session saved!", description: sessionName });
    }
    setSavingSession(false);
  };

  const handleLoadSession = (session: SavedSession) => {
    setInputMode(session.input_mode as InputMode);
    setKeywords(session.keywords || "");
    setInspiredBy(session.inspired_by || "");
    setCompetitors(session.competitors || "");
    setIndustry(session.industry || "");
    setStyle(session.style);
    const loaded: Suggestion[] = (session.suggestions || []).map((s: any) => ({
      name: s.name, score: s.score, trend_score: s.trend_score, reason: s.reason,
      pronounceScore: s.pronounceScore, tldStatuses: s.tldStatuses,
      trademarkRisk: s.trademarkRisk, auctionMatches: s.auctionMatches,
      checkingTlds: false,
    }));
    setSuggestions(loaded);
    setHasGenerated(true);
    setSessionsOpen(false);
    toast({ title: "Session loaded", description: session.session_name });
  };

  const handleDeleteSession = async (id: string) => {
    await supabase.from("generator_sessions").delete().eq("id", id);
    setSavedSessions((prev) => prev.filter((s) => s.id !== id));
  };

  // tldsToCheck defined above

  const loadingSteps = [
    { label: "Analyzing market trends & keywords...", icon: "📊" },
    { label: "Generating ~100 names with AI...", icon: "🤖" },
    { label: "Screening for trademark conflicts...", icon: "🛡️" },
    { label: availabilityProgress || `Checking availability across ${tldsToCheck.join(", ")}...`, icon: "🌐" },
    { label: "Cross-referencing auction inventory...", icon: "🔍" },
    { label: "Filtering & ranking results...", icon: "⚡" },
  ];

  // Cross-reference generated names against auctions database
  const crossReferenceAuctions = async (items: Suggestion[]) => {
    const names = items.map((s) => s.name.toLowerCase());
    // Build domain names to search for (name + common TLDs)
    const searchTlds = [".com", ".net", ".org", ".io", ".ai", ".co", ".app", ".dev"];
    const domainsToSearch = names.flatMap((n) => searchTlds.map((tld) => `${n}${tld}`));

    // Query in chunks of 500 to avoid query limits
    const CHUNK = 500;
    const allMatches: AuctionMatch[] = [];
    for (let i = 0; i < domainsToSearch.length; i += CHUNK) {
      const chunk = domainsToSearch.slice(i, i + CHUNK);
      const { data } = await supabase
        .from("auctions")
        .select("domain_name, price, end_time, inventory_source, auction_type")
        .in("domain_name", chunk);
      if (data) allMatches.push(...(data as AuctionMatch[]));
    }

    // Map matches back to suggestions by SLD
    setSuggestions((prev) =>
      prev.map((s) => {
        const sld = s.name.toLowerCase();
        const matches = allMatches.filter((m) =>
          m.domain_name.toLowerCase().startsWith(sld + ".")
        );
        return { ...s, auctionMatches: matches };
      })
    );
  };

  // "More like this" — generate 20 variations of a specific name
  const [moreLikeLoading, setMoreLikeLoading] = useState<string | null>(null);
  const handleMoreLikeThis = async (sourceName: string) => {
    setMoreLikeLoading(sourceName);
    try {
      const { data, error } = await supabase.functions.invoke("generate-domain-names", {
        body: {
          keywords: sourceName,
          industry: industry.trim() || undefined,
          style,
          inspired_by: sourceName,
          batch_count: 1,
        },
      });
      if (error) throw error;
      const newItems: Suggestion[] = (data?.suggestions || [])
        .slice(0, 20)
        .map((s: any) => {
          const namePart = s.name.replace(/\.(com|ai|io|co|net|app|dev|org)$/i, "").trim();
          return {
            name: namePart,
            score: s.score,
            trend_score: s.trend_score ?? 0,
            reason: s.reason,
            pronounceScore: scorePronounceability(namePart + ".com").score,
            trademarkRisk: checkTrademarkRisk(namePart + ".com"),
            checkingTlds: true,
          };
        });

      // Deduplicate against existing suggestions
      const existingNames = new Set(suggestions.map((s) => s.name.toLowerCase()));
      const unique = newItems.filter((s) => !existingNames.has(s.name.toLowerCase()));

      if (unique.length === 0) {
        toast({ title: "No new variations found", description: "Try regenerating instead." });
        setMoreLikeLoading(null);
        return;
      }

      setSuggestions((prev) => [...prev, ...unique]);

      // Check availability for new names
      await checkAvailabilityInBatches(unique);
      // Cross-reference new names against auctions
      await crossReferenceAuctions(unique);

      toast({ title: `Added ${unique.length} variations`, description: `Names inspired by "${sourceName}"` });
    } catch (e: any) {
      toast({ title: "Failed to generate variations", description: e.message, variant: "destructive" });
    }
    setMoreLikeLoading(null);
  };

  const checkAvailabilityInBatches = async (items: Suggestion[]) => {
    // Build all domain combos: name × TLDs
    const allDomains: string[] = [];
    items.forEach((s) => {
      tldsToCheck.forEach((tld) => {
        allDomains.push(`${s.name.toLowerCase()}${tld}`);
      });
    });

    if (allDomains.length === 0) return;

    // Split into chunks of 400 for each request (server allows 1000, DNS is free/unlimited)
    const CHUNK_SIZE = 400;
    const chunks: string[][] = [];
    for (let i = 0; i < allDomains.length; i += CHUNK_SIZE) {
      chunks.push(allDomains.slice(i, i + CHUNK_SIZE));
    }

    const allResults = new Map<string, TldStatus>();

    for (let c = 0; c < chunks.length; c++) {
      setAvailabilityProgress(`Checking availability (batch ${c + 1}/${chunks.length})...`);
      try {
        const { data, error } = await supabase.functions.invoke("check-domain-availability", {
          body: { domains: chunks[c] },
        });

        if (!error && data?.results) {
          (data.results as TldStatus[]).forEach((r) => allResults.set(r.domain, r));
        }
      } catch (e) {
        console.error(`Availability check batch ${c + 1} failed:`, e);
      }

      // Small delay between batches to avoid overwhelming the function
      if (c < chunks.length - 1) {
        await new Promise((r) => setTimeout(r, 500));
      }
    }

    // Map results back to suggestions
    setSuggestions((prev) =>
      prev.map((s) => {
        const tldStatuses = tldsToCheck.map((tld) => {
          const domain = `${s.name.toLowerCase()}${tld}`;
          return allResults.get(domain) || { domain, available: null, status: "unknown" as const };
        });
        return { ...s, tldStatuses, checkingTlds: false };
      })
    );
  };

  const handleGenerate = async () => {
    const input = inputMode === "inspired" ? inspiredBy.trim() 
      : inputMode === "competitor" ? competitors.trim()
      : keywords.trim();
    if (!input) return;
    setIsLoading(true);
    setLoadingStep(0);
    setSuggestions([]);
    setAvailabilityProgress("");

    try {
      const body: Record<string, string | boolean | undefined> = {
        keywords: inputMode === "keywords" ? input 
          : inputMode === "competitor" ? `domains differentiated from competitors: ${input}`
          : `domains similar to ${input}`,
        industry: industry.trim() || undefined,
        style,
        include_extra_tlds: includeExtraTlds,
        synonym_boost: synonymBoost,
      };
      if (inputMode === "inspired") {
        body.inspired_by = input;
      }
      if (inputMode === "competitor") {
        body.competitor_domains = input;
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
        const namePart = s.name.replace(/\.(com|ai|io|co|net|app|dev|org)$/i, "").trim();
        const pScore = scorePronounceability(namePart + ".com").score;
        return {
          name: namePart,
          score: s.score,
          trend_score: s.trend_score ?? 0,
          reason: s.reason,
          pronounceScore: pScore,
          trademarkRisk: checkTrademarkRisk(namePart + ".com"),
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

      // Step 4: Checking availability across all TLDs
      setLoadingStep(3);
      await checkAvailabilityInBatches(items);

      // Step 5: Cross-reference auctions
      setLoadingStep(4);
      await crossReferenceAuctions(items);

      // Step 6: Filtering
      setLoadingStep(5);
      await new Promise((r) => setTimeout(r, 400));

      setHasGenerated(true);
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

  const canGenerate = inputMode === "inspired" ? inspiredBy.trim().length > 0 
    : inputMode === "competitor" ? competitors.trim().length > 0 
    : keywords.trim().length > 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            AI Name Generator
            <Badge variant="secondary" className="text-[10px] font-bold uppercase tracking-wider bg-primary/10 text-primary border-primary/20">
              2026
            </Badge>
          </CardTitle>
          {user && (
            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs gap-1"
                disabled={suggestions.length === 0 || savingSession}
                onClick={handleSaveSession}
              >
                {savingSession ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                Save
              </Button>
              <Dialog open={sessionsOpen} onOpenChange={setSessionsOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="h-7 text-xs gap-1">
                    <FolderOpen className="w-3 h-3" />
                    Sessions{savedSessions.length > 0 && ` (${savedSessions.length})`}
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md max-h-[60vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Saved Sessions</DialogTitle>
                  </DialogHeader>
                  {savedSessions.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">No saved sessions yet. Generate names and click Save.</p>
                  ) : (
                    <div className="space-y-2">
                      {savedSessions.map((session) => (
                        <div key={session.id} className="flex items-center justify-between p-3 rounded-lg border border-border hover:border-primary/30 transition-colors">
                          <button
                            className="flex-1 text-left"
                            onClick={() => handleLoadSession(session)}
                          >
                            <p className="text-sm font-medium text-foreground truncate">{session.session_name}</p>
                            <p className="text-xs text-muted-foreground">
                              {(session.suggestions as any[])?.length ?? 0} names · {new Date(session.created_at).toLocaleDateString()}
                            </p>
                          </button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-destructive"
                            onClick={() => handleDeleteSession(session.id)}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </DialogContent>
              </Dialog>
            </div>
          )}
        </div>
        <CardDescription>
          Investor-grade domain name generation powered by 2026 market trends. Get names optimized for flipping, holding, or branding — with live availability across .com, .ai, .io, .net and more.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Input Mode Tabs */}
        <Tabs value={inputMode} onValueChange={(v) => setInputMode(v as InputMode)} className="w-full">
          <TabsList className="grid w-full grid-cols-3 h-9">
            <TabsTrigger value="keywords" className="text-xs flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              Keywords
            </TabsTrigger>
            <TabsTrigger value="inspired" className="text-xs flex items-center gap-1.5">
              <Lightbulb className="w-3.5 h-3.5" />
              Inspired By
            </TabsTrigger>
            <TabsTrigger value="competitor" className="text-xs flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5" />
              vs Competitors
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
          ) : inputMode === "competitor" ? (
            <div className="space-y-2">
              <Input
                placeholder="Competitor domains (e.g. stripe.com, plaid.com, wise.com)"
                value={competitors}
                onChange={(e) => setCompetitors(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !isLoading && handleGenerate()}
              />
              <p className="text-xs text-muted-foreground">
                Paste competitor domain names — AI will analyze their naming patterns and generate differentiated alternatives in the same niche.
              </p>
            </div>
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

          <div className="flex flex-col gap-2 p-3 rounded-lg border border-border bg-muted/30">
            <div className="flex items-center gap-2">
              <Switch
                id="extra-tlds"
                checked={includeExtraTlds}
                onCheckedChange={setIncludeExtraTlds}
              />
              <Label htmlFor="extra-tlds" className="text-xs cursor-pointer">
                <span className="font-medium text-foreground">
                  {includeExtraTlds ? "All TLDs" : ".com only"}
                </span>
                <span className="text-muted-foreground ml-1">
                  {includeExtraTlds
                    ? "— checking .com, .ai, .io, .net, .co, .app, .dev, .org (registry-verified)"
                    : "— .com availability verified via registry (toggle for +7 more TLDs)"}
                </span>
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="synonym-boost"
                checked={synonymBoost}
                onCheckedChange={setSynonymBoost}
              />
              <Label htmlFor="synonym-boost" className="text-xs cursor-pointer">
                <span className="font-medium text-foreground">Synonym Boost</span>
                <span className="text-muted-foreground ml-1">
                  — expand keywords with synonyms & related terms for more variety
                </span>
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <Label htmlFor="max-length" className="text-xs font-medium text-foreground whitespace-nowrap">
                Max Length:
              </Label>
              <Select value={String(maxLengthFilter)} onValueChange={(v) => setMaxLengthFilter(Number(v))}>
                <SelectTrigger className="h-7 text-xs w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">No limit</SelectItem>
                  <SelectItem value="5">≤ 5 chars</SelectItem>
                  <SelectItem value="6">≤ 6 chars</SelectItem>
                  <SelectItem value="7">≤ 7 chars</SelectItem>
                  <SelectItem value="8">≤ 8 chars</SelectItem>
                  <SelectItem value="10">≤ 10 chars</SelectItem>
                  <SelectItem value="12">≤ 12 chars</SelectItem>
                  <SelectItem value="15">≤ 15 chars</SelectItem>
                </SelectContent>
              </Select>
              <span className="text-[10px] text-muted-foreground">Filter results by name length</span>
            </div>
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
          // Filter suggestions: only show names that have at least 1 available TLD
          // Filter suggestions
          const filtered = (() => {
            let result = suggestions as (Suggestion | null)[];
            // Available filter
            if (showOnlyAvailable) {
              result = result.map((s) => {
                if (!s) return null;
                if (!s.tldStatuses) return s;
                const availableTlds = s.tldStatuses.filter((ts) => ts.status === "available");
                if (availableTlds.length === 0) return null;
                return { ...s, tldStatuses: availableTlds };
              });
            }
            // Length filter
            if (maxLengthFilter > 0) {
              result = result.map((s) => {
                if (!s) return null;
                return s.name.length <= maxLengthFilter ? s : null;
              });
            }
            return result.filter(Boolean) as Suggestion[];
          })();

          // Sort
          const sorted = [...filtered].sort((a, b) => {
            if (sortBy === "auction") {
              const aHas = (a.auctionMatches?.length ?? 0) > 0 ? 1 : 0;
              const bHas = (b.auctionMatches?.length ?? 0) > 0 ? 1 : 0;
              if (bHas !== aHas) return bHas - aHas;
              return b.score - a.score;
            }
            if (sortBy === "synergy") return b.score - a.score;
            if (sortBy === "trend") return (b.trend_score ?? 0) - (a.trend_score ?? 0);
            return a.name.localeCompare(b.name);
          });

          const stillChecking = suggestions.some((s) => s.checkingTlds);
          const totalAvailable = suggestions.filter(
            (s) => s.tldStatuses && s.tldStatuses.some((ts) => ts.status === "available")
          ).length;

          return (
            <div className="space-y-3 animate-fade-in">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h4 className="text-sm font-semibold text-foreground">
                  {showOnlyAvailable && !stillChecking
                    ? `${sorted.length} Names with Available TLDs`
                    : `${suggestions.length} Suggestions Generated`}
                  {!stillChecking && showOnlyAvailable && (
                    <span className="text-xs font-normal text-muted-foreground ml-2">
                      ({suggestions.length} generated, {totalAvailable} have available TLDs)
                    </span>
                  )}
                </h4>
                <div className="flex items-center gap-3 flex-wrap">
                  {/* Sort dropdown */}
                  <div className="flex items-center gap-1.5">
                    <ArrowUpDown className="w-3.5 h-3.5 text-muted-foreground" />
                    <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
                      <SelectTrigger className="h-7 text-xs w-[130px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="synergy">Synergy Score</SelectItem>
                        <SelectItem value="trend">Trend Score</SelectItem>
                        <SelectItem value="auction">Auction Matches</SelectItem>
                        <SelectItem value="alpha">A → Z</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {/* Regenerate button */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleGenerate}
                    disabled={isLoading}
                    className="h-7 text-xs gap-1"
                  >
                    <RefreshCw className="w-3 h-3" />
                    Regenerate
                  </Button>
                  {/* Export CSV button */}
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs gap-1"
                    onClick={() => {
                      const rows = sorted.map((s) => {
                        const availTlds = s.tldStatuses
                          ?.filter((ts) => ts.status === "available")
                          .map((ts) => ts.domain) ?? [];
                        const regTlds = s.tldStatuses
                          ?.filter((ts) => ts.status === "registered")
                          .map((ts) => ts.domain) ?? [];
                        return [
                          s.name,
                          s.score,
                          s.trend_score ?? 0,
                          s.pronounceScore ?? "",
                          s.trademarkRisk?.riskLevel ?? "",
                          availTlds.join(" "),
                          regTlds.join(" "),
                          `"${s.reason.replace(/"/g, '""')}"`,
                        ].join(",");
                      });
                      const csv = "Name,Synergy,Trend,Pronounceability,Trademark Risk,Available Domains,Registered Domains,Reason\n" + rows.join("\n");
                      const blob = new Blob([csv], { type: "text/csv" });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = "domain-names.csv";
                      a.click();
                      URL.revokeObjectURL(url);
                    }}
                  >
                    <Download className="w-3 h-3" />
                    Export
                  </Button>
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
                </div>
              </div>

              {!stillChecking && showOnlyAvailable && sorted.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Filter className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No names with available TLDs found.</p>
                  <p className="text-xs mt-1">Try turning off the "Available only" filter, or generate new names with different keywords.</p>
                </div>
              )}

              {sorted.map((s, i) => {
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
                          Synergy: {s.score}
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

                    {/* Auction matches */}
                    {s.auctionMatches && s.auctionMatches.length > 0 && (
                      <div className="mb-2 p-2 rounded-md border border-amber-500/30 bg-amber-500/5">
                        <div className="flex items-center gap-1.5 mb-1">
                          <Gavel className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                          <span className="text-xs font-semibold text-amber-700 dark:text-amber-300">
                            {s.auctionMatches.length} in auction inventory
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {s.auctionMatches.map((am) => (
                            <Tooltip key={am.domain_name}>
                              <TooltipTrigger asChild>
                                <Badge variant="outline" className="text-[10px] cursor-help border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300">
                                  {am.domain_name} — ${am.price}
                                  {am.end_time && (
                                    <Clock className="w-2.5 h-2.5 ml-0.5" />
                                  )}
                                </Badge>
                              </TooltipTrigger>
                              <TooltipContent className="max-w-xs">
                                <p className="text-xs">
                                  <strong>{am.domain_name}</strong> — ${am.price}
                                  {am.end_time && ` · Ends ${new Date(am.end_time).toLocaleDateString()}`}
                                  {am.inventory_source && ` · ${am.inventory_source}`}
                                  {am.auction_type && ` · ${am.auction_type}`}
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs text-muted-foreground mr-1">TLDs:</span>
                        {s.checkingTlds ? (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Loader2 className="w-3 h-3 animate-spin" /> Checking {tldsToCheck.length} TLDs...
                          </span>
                        ) : s.tldStatuses ? (
                          s.tldStatuses.map((ts) => {
                            const tld = ts.domain.substring(ts.domain.indexOf("."));
                            const registrars = [
                              { name: "Spaceship", url: `https://www.spaceship.com/domain/${encodeURIComponent(ts.domain)}` },
                              { name: "GoDaddy", url: `https://www.godaddy.com/domainsearch/find?domainToCheck=${encodeURIComponent(ts.domain)}` },
                              { name: "Namecheap", url: `https://www.namecheap.com/domains/registration/results/?domain=${encodeURIComponent(ts.domain)}` },
                              { name: "Unstoppable", url: `https://unstoppabledomains.com/search?searchTerm=${encodeURIComponent(ts.domain.split(".")[0])}` },
                            ];
                            return (
                              <span key={ts.domain} className="inline-flex items-center gap-0.5">
                                <Badge variant="outline" className={`text-xs flex items-center gap-1 ${statusBadgeClass(ts)}`}>
                                  {statusIcon(ts)}
                                  {tld}
                                </Badge>
                                {ts.status === "available" && (
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <button className="inline-flex items-center gap-0.5 text-[10px] font-medium text-primary hover:text-primary/80 transition-colors px-1">
                                        Register <ChevronDown className="w-2.5 h-2.5" />
                                      </button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="start" className="min-w-[140px]">
                                      {registrars.map((r) => (
                                        <DropdownMenuItem key={r.name} asChild>
                                          <a href={r.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-xs">
                                            <ExternalLink className="w-3 h-3" />
                                            {r.name}
                                          </a>
                                        </DropdownMenuItem>
                                      ))}
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                )}
                              </span>
                            );
                          })
                        ) : null}
                      </div>
                      {/* More like this button */}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 text-[10px] gap-1 text-muted-foreground hover:text-primary"
                        disabled={moreLikeLoading !== null}
                        onClick={() => handleMoreLikeThis(s.name)}
                      >
                        {moreLikeLoading === s.name ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Wand2 className="w-3 h-3" />
                        )}
                        More like this
                      </Button>
                    </div>
                  </div>
                );
              })}
              <p className="text-xs text-muted-foreground text-center mt-2">
                ✅ Availability verified via RDAP (authoritative registry lookups for .com, .net, .org, .io, .co, .app, .dev). Always confirm final price with your registrar. Trademark screening covers ~200 major brands — not legal advice.
              </p>
            </div>
          );
        })()}
      </CardContent>
    </Card>
  );
}
