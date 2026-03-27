import { useState, useCallback, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Progress } from "@/components/ui/progress";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Diamond, ChevronLeft, ChevronRight, ArrowUpDown, Sparkles, Clock, TrendingUp,
  Award, Users, Scale, Shield, RefreshCw, Heart, SlidersHorizontal, ChevronDown, Flame, Info, Download,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useNavigate } from "react-router-dom";
import { useFavorites } from "@/hooks/useFavorites";
import { fetchTrendEnrichment, type TrendEnrichment } from "@/lib/trendEnrichment";
import { downloadCsv } from "@/lib/csvExport";

interface GemResult {
  total_count: number;
  id: string;
  domain_name: string;
  price: number;
  valuation: number;
  brandability_score: number | null;
  pronounceability_score: number | null;
  domain_age: number | null;
  bid_count: number;
  traffic_count: number;
  tld: string | null;
  end_time: string | null;
  auction_type: string | null;
  inventory_source: string | null;
  trademark_risk: string | null;
  deal_ratio: number;
  gem_score: number;
  created_at: string;
  has_comparable: boolean;
}

interface Filters {
  maxPrice: number;
  minGemScore: number;
  tld: string | null;
  minBrandability: number;
  minPronounceability: number;
  maxLength: number;
  nicheFilter: string | null;
  sortBy: string;
  sortDir: string;
}

const DEFAULT_FILTERS: Filters = {
  maxPrice: 500,
  minGemScore: 40,
  tld: "com",
  minBrandability: 0,
  minPronounceability: 0,
  maxLength: 20,
  nicheFilter: null,
  sortBy: "gem_score",
  sortDir: "desc",
};

const NICHE_OPTIONS = [
  { value: "all", label: "All Niches" },
  { value: "ai_tech", label: "🤖 AI & Tech" },
  { value: "fintech", label: "💰 Fintech" },
  { value: "health", label: "🏥 Health" },
  { value: "biotech", label: "🧬 Biotech" },
  { value: "ecommerce", label: "🛒 E-Commerce" },
  { value: "saas", label: "☁️ SaaS" },
  { value: "security", label: "🔒 Security" },
  { value: "crypto", label: "🪙 Crypto" },
  { value: "gaming", label: "🎮 Gaming" },
  { value: "real_estate", label: "🏠 Real Estate" },
  { value: "energy", label: "⚡ Energy" },
  { value: "travel", label: "✈️ Travel" },
  { value: "pet", label: "🐾 Pets" },
  { value: "beauty", label: "💄 Beauty" },
  { value: "food", label: "🍕 Food" },
];

const PAGE_SIZE = 25;

function gemScoreColor(score: number): string {
  if (score >= 80) return "text-emerald-500";
  if (score >= 65) return "text-green-500";
  if (score >= 50) return "text-amber-500";
  return "text-muted-foreground";
}

function gemScoreBg(score: number): string {
  if (score >= 80) return "bg-emerald-500/10 text-emerald-600 border-emerald-500/20";
  if (score >= 65) return "bg-green-500/10 text-green-600 border-green-500/20";
  if (score >= 50) return "bg-amber-500/10 text-amber-600 border-amber-500/20";
  return "bg-muted text-muted-foreground";
}

function gemLabel(score: number): string {
  if (score >= 85) return "💎 Rare Gem";
  if (score >= 75) return "✨ Great Find";
  if (score >= 65) return "🔍 Good Value";
  if (score >= 50) return "📊 Potential";
  return "➡️ Average";
}

function isNewListing(createdAt: string): boolean {
  const created = new Date(createdAt).getTime();
  const cutoff = Date.now() - 48 * 60 * 60 * 1000;
  return created > cutoff;
}

/** Build a human-readable breakdown of why a domain scored the way it did */
function buildScoreBreakdown(gem: GemResult): { factor: string; value: string; strength: "strong" | "good" | "neutral" | "weak" }[] {
  const factors: { factor: string; value: string; strength: "strong" | "good" | "neutral" | "weak" }[] = [];

  // Deal ratio
  const dr = Number(gem.deal_ratio);
  if (dr >= 5) factors.push({ factor: "Deal Ratio", value: `${dr.toFixed(1)}x undervalued`, strength: "strong" });
  else if (dr >= 2) factors.push({ factor: "Deal Ratio", value: `${dr.toFixed(1)}x undervalued`, strength: "good" });
  else if (dr >= 1.2) factors.push({ factor: "Deal Ratio", value: `${dr.toFixed(1)}x undervalued`, strength: "neutral" });
  else factors.push({ factor: "Deal Ratio", value: `${dr.toFixed(1)}x`, strength: "weak" });

  // Brandability
  const bs = gem.brandability_score ?? 0;
  if (bs >= 75) factors.push({ factor: "Brandability", value: `${bs}/100`, strength: "strong" });
  else if (bs >= 55) factors.push({ factor: "Brandability", value: `${bs}/100`, strength: "good" });
  else if (bs >= 35) factors.push({ factor: "Brandability", value: `${bs}/100`, strength: "neutral" });
  else factors.push({ factor: "Brandability", value: `${bs}/100`, strength: "weak" });

  // Length
  const name = gem.domain_name.split(".")[0];
  if (name.length <= 5) factors.push({ factor: "Length", value: `${name.length} chars — premium short`, strength: "strong" });
  else if (name.length <= 8) factors.push({ factor: "Length", value: `${name.length} chars — concise`, strength: "good" });
  else if (name.length <= 12) factors.push({ factor: "Length", value: `${name.length} chars`, strength: "neutral" });
  else factors.push({ factor: "Length", value: `${name.length} chars — long`, strength: "weak" });

  // Traffic
  if (gem.traffic_count > 100) factors.push({ factor: "Traffic", value: `${gem.traffic_count.toLocaleString()}/mo`, strength: "strong" });
  else if (gem.traffic_count > 0) factors.push({ factor: "Traffic", value: `${gem.traffic_count}/mo`, strength: "good" });
  else factors.push({ factor: "Traffic", value: "None detected", strength: "weak" });

  // Domain age
  if (gem.domain_age && gem.domain_age >= 10) factors.push({ factor: "Age", value: `${gem.domain_age} years — established`, strength: "strong" });
  else if (gem.domain_age && gem.domain_age >= 3) factors.push({ factor: "Age", value: `${gem.domain_age} years`, strength: "good" });
  else if (gem.domain_age && gem.domain_age > 0) factors.push({ factor: "Age", value: `${gem.domain_age} year(s)`, strength: "neutral" });

  // Competition
  if (gem.bid_count <= 1) factors.push({ factor: "Competition", value: `${gem.bid_count} bid(s) — low competition`, strength: "strong" });
  else if (gem.bid_count <= 5) factors.push({ factor: "Competition", value: `${gem.bid_count} bids`, strength: "neutral" });
  else factors.push({ factor: "Competition", value: `${gem.bid_count} bids — competitive`, strength: "weak" });

  // Comparable sales
  if (gem.has_comparable) factors.push({ factor: "Comparable Sales", value: "Market validated ✓", strength: "strong" });

  return factors;
}

const strengthColors: Record<string, string> = {
  strong: "text-emerald-500",
  good: "text-green-500",
  neutral: "text-muted-foreground",
  weak: "text-amber-500",
};

const strengthIcons: Record<string, string> = {
  strong: "●",
  good: "●",
  neutral: "○",
  weak: "○",
};

/** Check if a domain name contains any trending keywords */
function getTrendingMatch(domainName: string, enrichment: TrendEnrichment | null): string | null {
  if (!enrichment) return null;
  const name = domainName.split(".")[0].toLowerCase();
  for (const [keyword, heat] of Object.entries(enrichment.keywords)) {
    if (heat >= 1.5 && name.includes(keyword.toLowerCase())) {
      return keyword;
    }
  }
  return null;
}

export function HiddenGemsFinder() {
  const navigate = useNavigate();
  const { favorites, toggleFavorite } = useFavorites();
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [page, setPage] = useState(0);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  // Fetch trend enrichment data for trending badges
  const [trendData, setTrendData] = useState<TrendEnrichment | null>(null);
  useEffect(() => {
    fetchTrendEnrichment().then(setTrendData).catch(() => {});
  }, []);

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["hidden-gems", filters, page],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("find_hidden_gems", {
        p_min_gem_score: filters.minGemScore,
        p_max_price: filters.maxPrice,
        p_tld_filter: filters.tld,
        p_min_brandability: filters.minBrandability,
        p_min_pronounceability: filters.minPronounceability,
        p_max_length: filters.maxLength,
        p_niche_filter: filters.nicheFilter,
        p_sort_by: filters.sortBy,
        p_sort_dir: filters.sortDir,
        p_offset: page * PAGE_SIZE,
        p_limit: PAGE_SIZE,
      });
      if (error) throw error;
      return (data as unknown as GemResult[]) || [];
    },
    staleTime: 5 * 60 * 1000,
    retry: 2,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 5000),
  });

  const totalCount = data?.[0]?.total_count ?? 0;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  // Count how many results have trending keywords
  const trendingCount = useMemo(() => {
    if (!data || !trendData) return 0;
    return data.filter(g => getTrendingMatch(g.domain_name, trendData) !== null).length;
  }, [data, trendData]);

  const toggleSort = useCallback((col: string) => {
    setFilters(prev => ({
      ...prev,
      sortBy: col,
      sortDir: prev.sortBy === col && prev.sortDir === "desc" ? "asc" : "desc",
    }));
    setPage(0);
  }, []);

  const resetFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
    setPage(0);
  }, []);

  const handleExportGems = useCallback(() => {
    if (!data || data.length === 0) { toast.error("No gems to export"); return; }
    const rows = data.map(g => ({
      domain: g.domain_name,
      gem_score: g.gem_score,
      price: Number(g.price),
      valuation: Number(g.valuation),
      deal_ratio: Number(g.deal_ratio),
      brandability: g.brandability_score ?? "",
      pronounceability: g.pronounceability_score ?? "",
      traffic: g.traffic_count,
      age: g.domain_age ?? "",
      tld: g.tld ?? "",
      auction_type: g.auction_type ?? "",
      source: g.inventory_source ?? "",
      end_time: g.end_time ?? "",
    }));
    downloadCsv(rows, `expiredhawk-gems-${new Date().toISOString().slice(0, 10)}.csv`);
    toast.success(`Exported ${rows.length} gems to CSV`);
  }, [data]);

  const hasActiveAdvanced = filters.minBrandability > 0 || filters.minPronounceability > 0 || filters.maxLength < 20 || filters.nicheFilter !== null;

  return (
    <Card className="border-border/60">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Diamond className="w-5 h-5 text-primary" />
              Hidden Gems Finder
            </CardTitle>
            <CardDescription className="mt-1">
              Undervalued domains with real flip potential — EMDs, single words, and keyword combos.
              {totalCount > 0 && (
                <span className="ml-1 font-medium text-foreground">{totalCount.toLocaleString()} gems found</span>
              )}
              {trendingCount > 0 && (
                <span className="ml-1 text-orange-500 font-medium">
                  · {trendingCount} trending
                </span>
              )}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Select
              value={filters.maxPrice.toString()}
              onValueChange={v => { setFilters(p => ({ ...p, maxPrice: Number(v) })); setPage(0); }}
            >
              <SelectTrigger className="h-8 text-xs w-[100px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="100">≤ $100</SelectItem>
                <SelectItem value="250">≤ $250</SelectItem>
                <SelectItem value="500">≤ $500</SelectItem>
                <SelectItem value="1000">≤ $1,000</SelectItem>
                <SelectItem value="5000">≤ $5,000</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={filters.tld || "com"}
              onValueChange={v => { setFilters(p => ({ ...p, tld: v === "all" ? null : v })); setPage(0); }}
            >
              <SelectTrigger className="h-8 text-xs w-[80px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All TLDs</SelectItem>
                <SelectItem value="com">.com</SelectItem>
                <SelectItem value="ai">.ai</SelectItem>
                <SelectItem value="io">.io</SelectItem>
                <SelectItem value="net">.net</SelectItem>
                <SelectItem value="org">.org</SelectItem>
                <SelectItem value="co">.co</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => refetch()}
              disabled={isFetching}
              className="h-8 w-8"
            >
              <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>

        {/* Advanced Filters */}
        <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="h-7 px-2 mt-2 text-xs text-muted-foreground gap-1">
              <SlidersHorizontal className="w-3.5 h-3.5" />
              Advanced Filters
              {hasActiveAdvanced && <Badge variant="secondary" className="h-4 px-1 text-[9px]">Active</Badge>}
              <ChevronDown className={`w-3 h-3 transition-transform ${advancedOpen ? "rotate-180" : ""}`} />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-3 space-y-3">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {/* Niche Filter */}
              <div>
                <label className="text-[10px] text-muted-foreground mb-1 block">Niche</label>
                <Select
                  value={filters.nicheFilter || "all"}
                  onValueChange={v => { setFilters(p => ({ ...p, nicheFilter: v === "all" ? null : v })); setPage(0); }}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {NICHE_OPTIONS.map(n => (
                      <SelectItem key={n.value} value={n.value}>{n.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Min Brandability */}
              <div>
                <label className="text-[10px] text-muted-foreground mb-1 block">
                  Min Brandability: {filters.minBrandability}
                </label>
                <Slider
                  value={[filters.minBrandability]}
                  onValueChange={([v]) => { setFilters(p => ({ ...p, minBrandability: v })); setPage(0); }}
                  min={0} max={80} step={5}
                  className="py-2"
                />
              </div>

              {/* Min Pronounceability */}
              <div>
                <label className="text-[10px] text-muted-foreground mb-1 block">
                  Min Pronounceability: {filters.minPronounceability}
                </label>
                <Slider
                  value={[filters.minPronounceability]}
                  onValueChange={([v]) => { setFilters(p => ({ ...p, minPronounceability: v })); setPage(0); }}
                  min={0} max={80} step={5}
                  className="py-2"
                />
              </div>

              {/* Max Length */}
              <div>
                <label className="text-[10px] text-muted-foreground mb-1 block">
                  Max Length: {filters.maxLength} chars
                </label>
                <Slider
                  value={[filters.maxLength]}
                  onValueChange={([v]) => { setFilters(p => ({ ...p, maxLength: v })); setPage(0); }}
                  min={3} max={20} step={1}
                  className="py-2"
                />
              </div>
            </div>

            {hasActiveAdvanced && (
              <Button variant="ghost" size="sm" onClick={resetFilters} className="h-6 text-[10px] text-muted-foreground">
                Reset all filters
              </Button>
            )}
          </CollapsibleContent>
        </Collapsible>
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full rounded-md" />
            ))}
          </div>
        ) : !data || data.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Diamond className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p className="font-medium">No gems found matching your filters</p>
            <p className="text-sm mt-1">Try lowering the minimum gem score or increasing the max price</p>
            {hasActiveAdvanced && (
              <Button variant="outline" size="sm" onClick={resetFilters} className="mt-3">
                Reset Filters
              </Button>
            )}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto -mx-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[180px]">
                      <button onClick={() => toggleSort("gem_score")} className="flex items-center gap-1 hover:text-foreground transition-colors">
                        <Diamond className="w-3.5 h-3.5" /> Gem Score
                        {filters.sortBy === "gem_score" && <ArrowUpDown className="w-3 h-3" />}
                      </button>
                    </TableHead>
                    <TableHead>Domain</TableHead>
                    <TableHead>
                      <button onClick={() => toggleSort("price")} className="flex items-center gap-1 hover:text-foreground transition-colors">
                        Price
                        {filters.sortBy === "price" && <ArrowUpDown className="w-3 h-3" />}
                      </button>
                    </TableHead>
                    <TableHead>
                      <button onClick={() => toggleSort("deal_ratio")} className="flex items-center gap-1 hover:text-foreground transition-colors">
                        <TrendingUp className="w-3.5 h-3.5" /> Deal
                        {filters.sortBy === "deal_ratio" && <ArrowUpDown className="w-3 h-3" />}
                      </button>
                    </TableHead>
                    <TableHead className="hidden md:table-cell">
                      <button onClick={() => toggleSort("brandability")} className="flex items-center gap-1 hover:text-foreground transition-colors">
                        <Award className="w-3.5 h-3.5" /> Brand
                        {filters.sortBy === "brandability" && <ArrowUpDown className="w-3 h-3" />}
                      </button>
                    </TableHead>
                    <TableHead className="hidden md:table-cell">
                      <button onClick={() => toggleSort("traffic")} className="flex items-center gap-1 hover:text-foreground transition-colors">
                        <Users className="w-3.5 h-3.5" /> Traffic
                        {filters.sortBy === "traffic" && <ArrowUpDown className="w-3 h-3" />}
                      </button>
                    </TableHead>
                    <TableHead className="hidden lg:table-cell">
                      <Tooltip>
                        <TooltipTrigger className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> Ends</TooltipTrigger>
                        <TooltipContent>Auction End Time</TooltipContent>
                      </Tooltip>
                    </TableHead>
                    <TableHead className="w-20" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.map((gem) => {
                    const isNew = gem.created_at && isNewListing(gem.created_at);
                    const trendMatch = getTrendingMatch(gem.domain_name, trendData);
                    const breakdown = buildScoreBreakdown(gem);
                    return (
                      <TableRow key={gem.id} className="group cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/tools?tab=advisor&domain=${gem.domain_name}`)}>
                        {/* Gem Score Cell with breakdown popover */}
                        <TableCell>
                          <Popover>
                            <PopoverTrigger asChild>
                              <button
                                className="flex items-center gap-2 text-left"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <div className="w-16">
                                  <div className="flex items-center gap-1.5">
                                    <span className={`text-lg font-bold ${gemScoreColor(gem.gem_score)}`}>
                                      {gem.gem_score}
                                    </span>
                                    <span className="text-[10px] text-muted-foreground">/100</span>
                                  </div>
                                  <Progress value={gem.gem_score} className="h-1.5 mt-0.5" />
                                </div>
                                <div className="flex flex-col items-start gap-0.5">
                                  <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${gemScoreBg(gem.gem_score)}`}>
                                    {gemLabel(gem.gem_score)}
                                  </Badge>
                                  <span className="text-[9px] text-muted-foreground/60 flex items-center gap-0.5 group-hover:text-muted-foreground transition-colors">
                                    <Info className="w-2.5 h-2.5" /> Why?
                                  </span>
                                </div>
                              </button>
                            </PopoverTrigger>
                            <PopoverContent className="w-64 p-3" side="right" align="start">
                              <p className="text-xs font-semibold mb-2 flex items-center gap-1.5">
                                <Diamond className="w-3.5 h-3.5 text-primary" />
                                Score Breakdown
                              </p>
                              <div className="space-y-1.5">
                                {breakdown.map((f, i) => (
                                  <div key={i} className="flex items-center justify-between text-[11px]">
                                    <span className="text-muted-foreground flex items-center gap-1">
                                      <span className={strengthColors[f.strength]}>{strengthIcons[f.strength]}</span>
                                      {f.factor}
                                    </span>
                                    <span className={`font-medium ${strengthColors[f.strength]}`}>{f.value}</span>
                                  </div>
                                ))}
                                {trendMatch && (
                                  <div className="flex items-center justify-between text-[11px] pt-1 border-t border-border/40">
                                    <span className="text-orange-500 flex items-center gap-1">
                                      <Flame className="w-3 h-3" /> Trending
                                    </span>
                                    <span className="font-medium text-orange-500">"{trendMatch}" is hot</span>
                                  </div>
                                )}
                              </div>
                              <p className="text-[9px] text-muted-foreground/60 mt-2">Click row for full AI analysis</p>
                            </PopoverContent>
                          </Popover>
                        </TableCell>

                        {/* Domain */}
                        <TableCell>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-medium text-foreground">{gem.domain_name}</span>
                              {isNew && (
                                <Badge className="text-[9px] px-1 py-0 bg-blue-500/10 text-blue-600 border-blue-500/20 border" variant="outline">
                                  NEW
                                </Badge>
                              )}
                              {trendMatch && (
                                <Tooltip>
                                  <TooltipTrigger>
                                    <Flame className="w-3.5 h-3.5 text-orange-500" />
                                  </TooltipTrigger>
                                  <TooltipContent>Contains trending keyword: "{trendMatch}"</TooltipContent>
                                </Tooltip>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              {gem.tld && <Badge variant="secondary" className="text-[10px] px-1 py-0">.{gem.tld}</Badge>}
                              {gem.domain_age && gem.domain_age > 0 && (
                                <span className="text-[10px] text-muted-foreground">{gem.domain_age}yr old</span>
                              )}
                              {gem.has_comparable && (
                                <Tooltip>
                                  <TooltipTrigger>
                                    <Scale className="w-3 h-3 text-primary" />
                                  </TooltipTrigger>
                                  <TooltipContent>Market validated — similar TLD domains have sold for more</TooltipContent>
                                </Tooltip>
                              )}
                              {gem.trademark_risk && gem.trademark_risk !== "none" && (
                                <Tooltip>
                                  <TooltipTrigger>
                                    <Shield className="w-3 h-3 text-amber-500" />
                                  </TooltipTrigger>
                                  <TooltipContent>TM Risk: {gem.trademark_risk}</TooltipContent>
                                </Tooltip>
                              )}
                            </div>
                          </div>
                        </TableCell>

                        {/* Price */}
                        <TableCell>
                          <div>
                            <span className="font-medium">${Number(gem.price).toLocaleString()}</span>
                            <div className="text-[10px] text-muted-foreground">
                              Val: ${Number(gem.valuation).toLocaleString()}
                            </div>
                          </div>
                        </TableCell>

                        {/* Deal Ratio */}
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={
                              Number(gem.deal_ratio) >= 3
                                ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                                : Number(gem.deal_ratio) >= 1.5
                                  ? "bg-green-500/10 text-green-600 border-green-500/20"
                                  : "bg-muted text-muted-foreground"
                            }
                          >
                            {Number(gem.deal_ratio).toFixed(1)}x
                          </Badge>
                        </TableCell>

                        {/* Brandability */}
                        <TableCell className="hidden md:table-cell">
                          {gem.brandability_score != null ? (
                            <span className={`font-medium ${gem.brandability_score >= 70 ? "text-emerald-500" : gem.brandability_score >= 50 ? "text-green-500" : "text-muted-foreground"}`}>
                              {gem.brandability_score}
                            </span>
                          ) : (
                            <span className="text-muted-foreground text-xs">—</span>
                          )}
                        </TableCell>

                        {/* Traffic */}
                        <TableCell className="hidden md:table-cell">
                          {gem.traffic_count > 0 ? (
                            <Tooltip>
                              <TooltipTrigger>
                                <span className="font-medium text-foreground">
                                  {gem.traffic_count >= 1000 ? `${(gem.traffic_count / 1000).toFixed(1)}K` : gem.traffic_count}
                                </span>
                              </TooltipTrigger>
                              <TooltipContent>{gem.traffic_count.toLocaleString()} monthly visitors</TooltipContent>
                            </Tooltip>
                          ) : (
                            <span className="text-muted-foreground text-xs">—</span>
                          )}
                        </TableCell>

                        {/* End Time */}
                        <TableCell className="hidden lg:table-cell">
                          {gem.end_time ? (
                            <span className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(gem.end_time), { addSuffix: true })}
                            </span>
                          ) : (
                            <span className="text-muted-foreground text-xs">—</span>
                          )}
                        </TableCell>

                        {/* Actions */}
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className={`h-7 w-7 transition-opacity ${favorites.has(gem.domain_name) ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleFavorite(gem.domain_name, gem.id);
                                  }}
                                >
                                  <Heart className={`w-4 h-4 ${favorites.has(gem.domain_name) ? "fill-red-500 text-red-500" : "text-muted-foreground"}`} />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>{favorites.has(gem.domain_name) ? "Remove from Watchlist" : "Save to Watchlist"}</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    navigate(`/tools?tab=advisor&domain=${gem.domain_name}`);
                                  }}
                                >
                                  <Sparkles className="w-4 h-4 text-primary" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Deep Analyze</TooltipContent>
                            </Tooltip>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-border/60">
                <span className="text-xs text-muted-foreground">
                  Page {page + 1} of {totalPages}
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page === 0}
                    onClick={() => setPage(p => p - 1)}
                    className="h-7 px-2"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= totalPages - 1}
                    onClick={() => setPage(p => p + 1)}
                    className="h-7 px-2"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}

            <p className="text-[10px] text-muted-foreground/60 mt-3 text-center">
              Gem scores combine valuation gap, brandability, pronounceability, traffic, domain age, and market signals. Not financial advice.
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
