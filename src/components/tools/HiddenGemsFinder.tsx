import { useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Progress } from "@/components/ui/progress";
import { Diamond, Filter, ChevronLeft, ChevronRight, ArrowUpDown, Sparkles, Clock, TrendingUp, Award, Mic, Shield, ExternalLink, RefreshCw, X, Heart } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useNavigate } from "react-router-dom";
import { useFavorites } from "@/hooks/useFavorites";

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
}

interface Filters {
  maxPrice: number;
  minGemScore: number;
  tld: string | null;
  minBrandability: number;
  minPronounceability: number;
  maxLength: number;
  sortBy: string;
  sortDir: string;
}

const DEFAULT_FILTERS: Filters = {
  maxPrice: 500,
  minGemScore: 50,
  tld: null,
  minBrandability: 0,
  minPronounceability: 0,
  maxLength: 20,
  sortBy: "gem_score",
  sortDir: "desc",
};

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

export function HiddenGemsFinder() {
  const navigate = useNavigate();
  const { favorites, toggleFavorite } = useFavorites();
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [page, setPage] = useState(0);
  const [showFilters, setShowFilters] = useState(false);

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
              AI-scored domains from our inventory — undervalued, brandable, and ready to flip.
              {totalCount > 0 && (
                <span className="ml-1 font-medium text-foreground">{totalCount.toLocaleString()} gems found</span>
              )}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className="gap-1.5"
            >
              <Filter className="w-3.5 h-3.5" />
              Filters
            </Button>
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

        {/* Filters panel */}
        {showFilters && (
          <div className="mt-4 p-4 rounded-lg bg-muted/50 border border-border/60 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Filters</span>
              <Button variant="ghost" size="sm" onClick={resetFilters} className="h-7 text-xs gap-1">
                <X className="w-3 h-3" /> Reset
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Max Price */}
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground">Max Price: ${filters.maxPrice}</label>
                <Slider
                  value={[filters.maxPrice]}
                  onValueChange={([v]) => { setFilters(p => ({ ...p, maxPrice: v })); setPage(0); }}
                  min={10}
                  max={5000}
                  step={10}
                />
              </div>

              {/* Min Gem Score */}
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground">Min Gem Score: {filters.minGemScore}</label>
                <Slider
                  value={[filters.minGemScore]}
                  onValueChange={([v]) => { setFilters(p => ({ ...p, minGemScore: v })); setPage(0); }}
                  min={0}
                  max={90}
                  step={5}
                />
              </div>

              {/* TLD */}
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground">TLD</label>
                <Select
                  value={filters.tld || "all"}
                  onValueChange={v => { setFilters(p => ({ ...p, tld: v === "all" ? null : v })); setPage(0); }}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All TLDs</SelectItem>
                    <SelectItem value="com">.com</SelectItem>
                    <SelectItem value="net">.net</SelectItem>
                    <SelectItem value="org">.org</SelectItem>
                    <SelectItem value="io">.io</SelectItem>
                    <SelectItem value="ai">.ai</SelectItem>
                    <SelectItem value="co">.co</SelectItem>
                    <SelectItem value="app">.app</SelectItem>
                    <SelectItem value="dev">.dev</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Min Brandability */}
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground">Min Brandability: {filters.minBrandability}</label>
                <Slider
                  value={[filters.minBrandability]}
                  onValueChange={([v]) => { setFilters(p => ({ ...p, minBrandability: v })); setPage(0); }}
                  min={0}
                  max={90}
                  step={5}
                />
              </div>

              {/* Min Pronounceability */}
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground">Min Pronounceability: {filters.minPronounceability}</label>
                <Slider
                  value={[filters.minPronounceability]}
                  onValueChange={([v]) => { setFilters(p => ({ ...p, minPronounceability: v })); setPage(0); }}
                  min={0}
                  max={90}
                  step={5}
                />
              </div>

              {/* Max Length */}
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground">Max Name Length: {filters.maxLength} chars</label>
                <Slider
                  value={[filters.maxLength]}
                  onValueChange={([v]) => { setFilters(p => ({ ...p, maxLength: v })); setPage(0); }}
                  min={3}
                  max={30}
                  step={1}
                />
              </div>
            </div>
          </div>
        )}
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
                    <TableHead className="hidden lg:table-cell">
                      <Tooltip>
                        <TooltipTrigger className="flex items-center gap-1"><Mic className="w-3.5 h-3.5" /> Pron.</TooltipTrigger>
                        <TooltipContent>Pronounceability Score</TooltipContent>
                      </Tooltip>
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
                  {data.map((gem) => (
                    <TableRow key={gem.id} className="group cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/tools?tab=advisor&domain=${gem.domain_name}`)}>
                      {/* Gem Score Cell */}
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-16">
                            <div className="flex items-center gap-1.5">
                              <span className={`text-lg font-bold ${gemScoreColor(gem.gem_score)}`}>
                                {gem.gem_score}
                              </span>
                              <span className="text-[10px] text-muted-foreground">/100</span>
                            </div>
                            <Progress value={gem.gem_score} className="h-1.5 mt-0.5" />
                          </div>
                          <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${gemScoreBg(gem.gem_score)}`}>
                            {gemLabel(gem.gem_score)}
                          </Badge>
                        </div>
                      </TableCell>

                      {/* Domain */}
                      <TableCell>
                        <div>
                          <span className="font-medium text-foreground">{gem.domain_name}</span>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            {gem.tld && <Badge variant="secondary" className="text-[10px] px-1 py-0">.{gem.tld}</Badge>}
                            {gem.domain_age && gem.domain_age > 0 && (
                              <span className="text-[10px] text-muted-foreground">{gem.domain_age}yr old</span>
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

                      {/* Pronounceability */}
                      <TableCell className="hidden lg:table-cell">
                        {gem.pronounceability_score != null ? (
                          <span className={`font-medium ${gem.pronounceability_score >= 70 ? "text-emerald-500" : gem.pronounceability_score >= 50 ? "text-green-500" : "text-muted-foreground"}`}>
                            {gem.pronounceability_score}
                          </span>
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
                  ))}
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
              Gem scores are algorithmic estimates based on valuation, brandability, pronounceability, domain age, and market signals. Not financial advice.
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
