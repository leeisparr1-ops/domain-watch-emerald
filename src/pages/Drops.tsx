import { useState, useRef, useCallback, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ChevronLeft, ChevronRight, Download, Loader2, Search, TrendingUp, Star, Clock, Filter, RotateCcw, X, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Input } from "@/components/ui/input";

interface ScanResult {
  id: string;
  domain_name: string;
  ai_score: number;
  ai_summary: string;
  category: string;
  estimated_value: number;
  brandability: number;
  keyword_strength: number;
  length_score: number;
}

interface Scan {
  id: string;
  filename: string;
  status: string;
  total_domains: number;
  filtered_domains: number;
  evaluated_domains: number;
  resume_from: number;
  created_at: string;
}

type SortKey = "ai_score" | "estimated_value" | "brandability" | "keyword_strength" | "length_score" | "domain_name" | "sld_length" | "word_count";

// Simple word segmentation using dictionary-like heuristic
function countDomainWords(domain: string): number {
  const sld = domain.split(".")[0].toLowerCase();
  // Common short words that appear in compound domains
  const markers = [
    "pay","bet","buy","sell","hub","app","web","dev","pro","lab","net","bio","eco","fit",
    "cloud","smart","data","code","tech","shop","store","cash","bank","loan","trade",
    "health","care","home","land","rent","game","play","safe","guard","solar","green",
    "crypto","chain","coin","token","defi","fund","wealth","money","credit","invest",
    "travel","hotel","food","chef","legal","law","hire","work","jobs","pet","dog","cat",
    "ai","ev","ml","vr","ar","iot",
  ];
  // Try to split into known words greedily
  let remaining = sld;
  let words = 0;
  while (remaining.length > 0) {
    let found = false;
    // Try longest match first (up to 10 chars)
    for (let len = Math.min(remaining.length, 10); len >= 2; len--) {
      const candidate = remaining.slice(0, len);
      if (markers.includes(candidate) || (len >= 4 && remaining.length > len)) {
        words++;
        remaining = remaining.slice(len);
        found = true;
        break;
      }
    }
    if (!found) {
      // If no known word found, the rest is one "word"
      words++;
      break;
    }
  }
  return Math.max(1, words);
}

function getSldLength(domain: string): number {
  return domain.split(".")[0].length;
}

const categoryColors: Record<string, string> = {
  premium: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  brandable: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  keyword: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  short: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  geo: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  niche: "bg-pink-500/20 text-pink-400 border-pink-500/30",
  generic: "bg-muted text-muted-foreground border-border",
  weak: "bg-destructive/20 text-destructive border-destructive/30",
};

const Drops = () => {
  const { user } = useAuth();
  const [currentScan, setCurrentScan] = useState<Scan | null>(null);
  const [results, setResults] = useState<ScanResult[]>([]);
  const [totalResults, setTotalResults] = useState(0);
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 50;
  const [sortKey, setSortKey] = useState<SortKey>("ai_score");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [searchFilter, setSearchFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [minScore, setMinScore] = useState<number>(0);
  const [maxLength, setMaxLength] = useState<number>(0);
  const [maxWords, setMaxWords] = useState<number>(0);
  const [minValue, setMinValue] = useState<number>(0);
  const [showFilters, setShowFilters] = useState(false);
  const [loading, setLoading] = useState(true);
  const [rerunning, setRerunning] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pageRef = useRef(0);
  const searchRef = useRef("");
  const categoryRef = useRef("all");
  const sortKeyRef = useRef<SortKey>("ai_score");
  const sortDirRef = useRef<"asc" | "desc">("desc");
  const minScoreRef = useRef(0);

  // Keep refs in sync
  useEffect(() => { pageRef.current = page; }, [page]);
  useEffect(() => { searchRef.current = searchFilter; }, [searchFilter]);
  useEffect(() => { categoryRef.current = categoryFilter; }, [categoryFilter]);
  useEffect(() => { sortKeyRef.current = sortKey; }, [sortKey]);
  useEffect(() => { sortDirRef.current = sortDir; }, [sortDir]);
  useEffect(() => { minScoreRef.current = minScore; }, [minScore]);

  // Fetch results for a scan (paginated, filtered server-side)
  const fetchResults = useCallback(async (
    scanId: string,
    pageNum = 0,
    search = "",
    category = "all",
    sort: SortKey = "ai_score",
    dir: "asc" | "desc" = "desc",
    scoreMin = 0
  ) => {
    const from = pageNum * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    let query = supabase
      .from("drop_scan_results")
      .select("*", { count: "exact" })
      .eq("scan_id", scanId);

    if (search) {
      query = query.ilike("domain_name", `%${search}%`);
    }
    if (category !== "all") {
      query = query.eq("category", category);
    }
    if (scoreMin > 0) {
      query = query.gte("ai_score", scoreMin);
    }

    query = query.order(sort, { ascending: dir === "asc" }).range(from, to);

    const { data, count } = await query;
    setResults((data || []) as ScanResult[]);
    if (count !== null) setTotalResults(count);
  }, []);

  // Start polling for an in-progress scan
  const startPolling = useCallback((scanId: string) => {
    if (pollRef.current) clearInterval(pollRef.current);

    pollRef.current = setInterval(async () => {
      const { data: scanUpdate } = await supabase
        .from("drop_scans")
        .select("*")
        .eq("id", scanId)
        .single();

      if (scanUpdate) {
        setCurrentScan(scanUpdate as Scan);
        await fetchResults(scanId, pageRef.current, searchRef.current, categoryRef.current, sortKeyRef.current, sortDirRef.current, minScoreRef.current);

        if (scanUpdate.status === "complete" || scanUpdate.status === "error") {
          if (pollRef.current) clearInterval(pollRef.current);
        }
      }
    }, 5000);
  }, [fetchResults]);

  // On mount: load the latest shared scan that has results
  const loadLatestScan = useCallback(async () => {
    setLoading(true);

    // Find the latest shared scan (system user or any) with results or currently processing
    const { data: scans } = await supabase
      .from("drop_scans")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(5);

    // First, find a scan that has actual results
    let resultsScan: typeof scans extends (infer T)[] | null ? T : never = null;
    for (const scan of scans || []) {
      const { count } = await supabase
        .from("drop_scan_results")
        .select("*", { count: "exact", head: true })
        .eq("scan_id", scan.id);
      if (count && count > 0) {
        resultsScan = scan;
        break;
      }
    }

    // Show results from whichever scan has them
    if (resultsScan) {
      setCurrentScan(resultsScan as Scan);
      await fetchResults(resultsScan.id, 0, "", "all", "ai_score", "desc", 0);
    }

    // Also check if there's an active scan (for progress banner)
    const activeScan = scans?.find(s => ["pre-screening", "evaluating", "processing"].includes(s.status));
    if (activeScan) {
      // If active scan is the same as results scan, show it and poll
      if (!resultsScan || activeScan.id === resultsScan.id) {
        setCurrentScan(activeScan as Scan);
      }
      startPolling(activeScan.id);
    }

    setLoading(false);
  }, [fetchResults]);

  useEffect(() => { loadLatestScan(); }, [loadLatestScan]);

  // Re-fetch when filters or sort change (debounced for search)
  const filterTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentScanIdRef = useRef<string | null>(null);
  useEffect(() => {
    currentScanIdRef.current = currentScan?.id || null;
  }, [currentScan?.id]);

  useEffect(() => {
    const scanId = currentScanIdRef.current;
    if (!scanId) return;
    if (filterTimerRef.current) clearTimeout(filterTimerRef.current);
    filterTimerRef.current = setTimeout(() => {
      setPage(0);
      fetchResults(scanId, 0, searchFilter, categoryFilter, sortKey, sortDir, minScore);
    }, searchFilter ? 300 : 0);
    return () => { if (filterTimerRef.current) clearTimeout(filterTimerRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchFilter, categoryFilter, sortKey, sortDir, minScore]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("desc"); }
  };

  const activeFilterCount = (categoryFilter !== "all" ? 1 : 0) + (minScore > 0 ? 1 : 0);


  const resetFilters = () => {
    setCategoryFilter("all");
    setMinScore(0);
    setSearchFilter("");
  };

  const exportCsv = () => {
    if (!results.length) return;
    const headers = "Domain,SLD Length,Words,Score,Category,Est. Value,Brandability,Keyword Strength,Length Score,Summary\n";
    const rows = results.map(r =>
      `"${r.domain_name}",${getSldLength(r.domain_name)},${countDomainWords(r.domain_name)},${r.ai_score},"${r.category}",${r.estimated_value},${r.brandability},${r.keyword_strength},${r.length_score || 0},"${r.ai_summary}"`
    ).join("\n");
    const blob = new Blob([headers + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `drop-scan-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const rerunScan = async () => {
    if (!user || rerunning) return;
    setRerunning(true);
    try {
      // Create a new scan entry
      const { data: newScan, error: insertErr } = await supabase
        .from("drop_scans")
        .insert({
          user_id: user.id,
          filename: "daily-drops.csv",
          status: "processing",
          total_domains: 0,
          filtered_domains: 0,
          evaluated_domains: 0,
        })
        .select()
        .single();

      if (insertErr || !newScan) throw new Error("Failed to create scan");

      // Delete old results from previous scan
      if (currentScan?.id) {
        await supabase.from("drop_scan_results").delete().eq("scan_id", currentScan.id);
      }

      // Trigger evaluation using the shared CSV
      const origin = window.location.origin;
      const { error: invokeErr } = await supabase.functions.invoke("evaluate-drops", {
        body: {
          scanId: newScan.id,
          csvUrl: `${origin}/store/daily-drops.csv`,
        },
      });

      if (invokeErr) throw invokeErr;

      setCurrentScan(newScan as Scan);
      setResults([]);
      setTotalResults(0);
      startPolling(newScan.id);
    } catch (err) {
      console.error("Re-run failed:", err);
    } finally {
      setRerunning(false);
    }
  };

  const totalPages = Math.ceil(totalResults / PAGE_SIZE);

  const goToPage = useCallback((newPage: number) => {
    if (!currentScan) return;
    setPage(newPage);
    fetchResults(currentScan.id, newPage, searchFilter, categoryFilter, sortKey, sortDir, minScore);
  }, [currentScan, fetchResults, searchFilter, categoryFilter, sortKey, sortDir, minScore]);

  const isProcessing = currentScan && ["processing", "evaluating", "pre-screening"].includes(currentScan.status);
  const progress = currentScan && currentScan.filtered_domains > 0
    ? Math.round((currentScan.evaluated_domains / currentScan.filtered_domains) * 100)
    : 0;

  const scanDate = currentScan?.created_at
    ? new Date(currentScan.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : null;

  return (
    <>
      <Helmet>
        <title>Daily Drop Scanner | ExpiredHawk</title>
        <meta name="description" content="AI-evaluated expiring domains ranked by investment potential. Updated daily." />
      </Helmet>
      <Navbar />
      <main className="min-h-screen bg-background pt-20 pb-16">
        <div className="container max-w-6xl mx-auto px-4">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
              <TrendingUp className="w-4 h-4" />
              Daily Drops
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">
              Today's Best Expiring Domains
            </h1>
            <p className="text-muted-foreground max-w-xl mx-auto">
              AI-evaluated daily drops. Only quality names make the cut.
            </p>
            {scanDate && !isProcessing && (
              <div className="flex items-center justify-center gap-1 mt-3 text-xs text-muted-foreground">
                <Clock className="w-3 h-3" />
                Last updated: {scanDate}
              </div>
            )}
          </div>

          {/* Loading state */}
          {loading && (
            <Card className="mt-4">
              <CardContent className="py-12 text-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
                <p className="text-sm text-muted-foreground">Loading today's drops...</p>
              </CardContent>
            </Card>
          )}

          {/* Processing banner */}
          {isProcessing && (
            <Card className="mb-8 border-primary/30 bg-primary/5">
              <CardContent className="py-6 text-center space-y-3">
                <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
                {currentScan?.status === "pre-screening" ? (
                  <>
                    <p className="font-medium text-foreground">
                      Pre-screening {currentScan?.total_domains?.toLocaleString() || 0} domains...
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {(currentScan?.resume_from || 0).toLocaleString()} scanned, {currentScan?.filtered_domains?.toLocaleString() || 0} qualified so far
                    </p>
                  </>
                ) : (
                  <>
                    <p className="font-medium text-foreground">
                      AI-evaluating {currentScan?.filtered_domains?.toLocaleString() || 0} pre-screened domains...
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {currentScan?.evaluated_domains?.toLocaleString() || 0} / {currentScan?.filtered_domains?.toLocaleString() || 0} evaluated
                    </p>
                  </>
                )}
                <Progress value={currentScan?.status === "pre-screening"
                  ? (currentScan?.total_domains ? Math.round(((currentScan?.resume_from || 0) / currentScan.total_domains) * 100) : 0)
                  : progress
                } className="max-w-sm mx-auto" />
                <p className="text-xs text-muted-foreground">
                  Results appear as they're processed — check back anytime
                </p>
                {/* Show reset button if scan appears stuck (>1hr on same count) */}
                {currentScan && currentScan.status === "evaluating" && (() => {
                  const ageMs = Date.now() - new Date(currentScan.created_at).getTime();
                  return ageMs > 60 * 60 * 1000; // >1 hour old
                })() && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs text-muted-foreground hover:text-destructive"
                    onClick={async () => {
                      await supabase.from("drop_scans").update({ status: "complete", csv_data: null } as any).eq("id", currentScan.id);
                      setCurrentScan({ ...currentScan, status: "complete" });
                      if (pollRef.current) clearInterval(pollRef.current);
                    }}
                  >
                    Scan appears stuck — mark as complete
                  </Button>
                )}
              </CardContent>
            </Card>
          )}

          {/* Results Section */}
          {(totalResults > 0 || results.length > 0 || (currentScan && currentScan.evaluated_domains > 0)) && (
            <>
              {/* Search + Export row */}
              <div className="flex flex-col sm:flex-row gap-3 mb-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search domains..."
                    value={searchFilter}
                    onChange={e => setSearchFilter(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <div className="flex gap-2 items-center">
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {totalResults.toLocaleString()} results
                  </span>
                  {!isProcessing && user && (
                    <Button variant="outline" size="sm" onClick={rerunScan} disabled={rerunning}>
                      <RefreshCw className={`w-4 h-4 mr-1 ${rerunning ? "animate-spin" : ""}`} /> Re-run
                    </Button>
                  )}
                  <Button variant="outline" size="sm" onClick={exportCsv}>
                    <Download className="w-4 h-4 mr-1" /> Export
                  </Button>
                </div>
              </div>

              {/* Chip-based Filter Panel */}
              <Collapsible open={showFilters} onOpenChange={setShowFilters}>
                <div className="mb-4 rounded-xl border border-border bg-card/50 backdrop-blur-sm overflow-hidden">
                  <CollapsibleTrigger asChild>
                    <button className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors">
                      <div className="flex items-center gap-2">
                        <Filter className="w-4 h-4 text-primary" />
                        <span className="font-semibold text-sm">Filters</span>
                        {activeFilterCount > 0 && (
                          <Badge variant="default" className="h-5 px-1.5 text-xs">
                            {activeFilterCount}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {activeFilterCount > 0 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs text-muted-foreground hover:text-foreground"
                            onClick={(e) => { e.stopPropagation(); resetFilters(); }}
                          >
                            <RotateCcw className="w-3 h-3 mr-1" /> Reset
                          </Button>
                        )}
                        <svg
                          className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${showFilters ? "rotate-180" : ""}`}
                          fill="none" stroke="currentColor" viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </button>
                  </CollapsibleTrigger>

                  <CollapsibleContent>
                    <div className="px-4 pb-4 space-y-4">
                      {/* Category */}
                      <div>
                        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Category</h4>
                        <div className="flex flex-wrap gap-1.5">
                          {[
                            { value: "all", label: "All", color: "default" },
                            { value: "premium", label: "Premium", color: "amber" },
                            { value: "brandable", label: "Brandable", color: "purple" },
                            { value: "keyword", label: "Keyword", color: "blue" },
                            { value: "short", label: "Short", color: "green" },
                            { value: "geo", label: "Geo", color: "orange" },
                            { value: "niche", label: "Niche", color: "rose" },
                            { value: "generic", label: "Generic", color: "default" },
                          ].map((opt) => {
                            const active = categoryFilter === opt.value;
                            const chipStyles: Record<string, string> = {
                              default: active
                                ? "bg-primary/20 text-primary border-primary/50 ring-1 ring-primary/20"
                                : "bg-muted/60 text-foreground border-border/60 hover:bg-muted",
                              amber: active
                                ? "bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/50 ring-1 ring-amber-500/20"
                                : "bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-500/20 hover:bg-amber-100",
                              purple: active
                                ? "bg-purple-500/20 text-purple-600 dark:text-purple-400 border-purple-500/50 ring-1 ring-purple-500/20"
                                : "bg-purple-50 dark:bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-500/20 hover:bg-purple-100",
                              blue: active
                                ? "bg-blue-500/20 text-blue-600 dark:text-blue-400 border-blue-500/50 ring-1 ring-blue-500/20"
                                : "bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-500/20 hover:bg-blue-100",
                              green: active
                                ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/50 ring-1 ring-emerald-500/20"
                                : "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20 hover:bg-emerald-100",
                              orange: active
                                ? "bg-orange-500/20 text-orange-600 dark:text-orange-400 border-orange-500/50 ring-1 ring-orange-500/20"
                                : "bg-orange-50 dark:bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-500/20 hover:bg-orange-100",
                              rose: active
                                ? "bg-rose-500/20 text-rose-600 dark:text-rose-400 border-rose-500/50 ring-1 ring-rose-500/20"
                                : "bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-500/20 hover:bg-rose-100",
                            };
                            return (
                              <button
                                key={opt.value}
                                onClick={() => setCategoryFilter(opt.value)}
                                className={`inline-flex items-center px-3 py-1.5 rounded-full text-[13px] font-medium border transition-all duration-150 cursor-pointer select-none ${chipStyles[opt.color]}`}
                              >
                                {opt.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Min Score */}
                      <div>
                        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Minimum Score</h4>
                        <div className="flex flex-wrap gap-1.5">
                          {[
                            { value: 0, label: "Any" },
                            { value: 50, label: "50+" },
                            { value: 65, label: "65+" },
                            { value: 75, label: "75+ (Top Picks)" },
                            { value: 85, label: "85+ (Elite)" },
                          ].map((opt) => {
                            const active = minScore === opt.value;
                            return (
                              <button
                                key={opt.value}
                                onClick={() => setMinScore(opt.value)}
                                className={`inline-flex items-center px-3 py-1.5 rounded-full text-[13px] font-medium border transition-all duration-150 cursor-pointer select-none ${
                                  active
                                    ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/50 ring-1 ring-emerald-500/20"
                                    : "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20 hover:bg-emerald-100"
                                }`}
                              >
                                {opt.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Active filter summary */}
                      {activeFilterCount > 0 && (
                        <div className="pt-3 border-t border-border flex flex-wrap gap-1.5">
                          {categoryFilter !== "all" && (
                            <Badge variant="secondary" className="flex items-center gap-1 text-xs">
                              Category: {categoryFilter}
                              <X className="w-3 h-3 cursor-pointer" onClick={() => setCategoryFilter("all")} />
                            </Badge>
                          )}
                          {minScore > 0 && (
                            <Badge variant="secondary" className="flex items-center gap-1 text-xs">
                              Score: {minScore}+
                              <X className="w-3 h-3 cursor-pointer" onClick={() => setMinScore(0)} />
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>

              {/* Results Table */}
              <Card>
                <div className="overflow-auto max-h-[60vh]">
               <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="cursor-pointer" onClick={() => toggleSort("domain_name")}>
                          Domain {sortKey === "domain_name" && (sortDir === "asc" ? "↑" : "↓")}
                        </TableHead>
                        <TableHead className="cursor-pointer text-center w-14" onClick={() => toggleSort("sld_length")}>
                          Len {sortKey === "sld_length" && (sortDir === "asc" ? "↑" : "↓")}
                        </TableHead>
                        <TableHead className="cursor-pointer text-center w-14" onClick={() => toggleSort("word_count")}>
                          Words {sortKey === "word_count" && (sortDir === "asc" ? "↑" : "↓")}
                        </TableHead>
                        <TableHead className="cursor-pointer text-center" onClick={() => toggleSort("ai_score")}>
                          Score {sortKey === "ai_score" && (sortDir === "asc" ? "↑" : "↓")}
                        </TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead className="cursor-pointer text-right" onClick={() => toggleSort("estimated_value")}>
                          Est. Value {sortKey === "estimated_value" && (sortDir === "asc" ? "↑" : "↓")}
                        </TableHead>
                        <TableHead className="cursor-pointer text-center hidden md:table-cell" onClick={() => toggleSort("brandability")}>
                          Brand {sortKey === "brandability" && (sortDir === "asc" ? "↑" : "↓")}
                        </TableHead>
                        <TableHead className="cursor-pointer text-center hidden md:table-cell" onClick={() => toggleSort("keyword_strength")}>
                          Keyword {sortKey === "keyword_strength" && (sortDir === "asc" ? "↑" : "↓")}
                        </TableHead>
                        <TableHead className="hidden lg:table-cell">Summary</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {results.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                            No domains match your current filters.
                          </TableCell>
                        </TableRow>
                      ) : (sortKey === "sld_length" || sortKey === "word_count"
                        ? [...results].sort((a, b) => {
                            const aVal = sortKey === "sld_length" ? getSldLength(a.domain_name) : countDomainWords(a.domain_name);
                            const bVal = sortKey === "sld_length" ? getSldLength(b.domain_name) : countDomainWords(b.domain_name);
                            return sortDir === "asc" ? aVal - bVal : bVal - aVal;
                          })
                        : results
                      ).map((r) => {
                        const sldLen = getSldLength(r.domain_name);
                        const wordCount = countDomainWords(r.domain_name);
                        return (
                        <TableRow key={r.id}>
                          <TableCell className="font-medium">
                            {r.ai_score >= 80 && <Star className="w-3 h-3 inline mr-1 text-amber-400" />}
                            {r.domain_name}
                          </TableCell>
                          <TableCell className="text-center">
                            <span className={`text-xs font-mono ${sldLen <= 6 ? "text-emerald-400 font-bold" : sldLen <= 10 ? "text-foreground" : "text-muted-foreground"}`}>
                              {sldLen}
                            </span>
                          </TableCell>
                          <TableCell className="text-center">
                            <span className={`inline-flex items-center justify-center w-6 h-5 rounded text-xs font-bold ${
                              wordCount === 1 ? "bg-emerald-500/20 text-emerald-400" :
                              wordCount === 2 ? "bg-blue-500/20 text-blue-400" :
                              "bg-orange-500/20 text-orange-400"
                            }`}>
                              {wordCount}
                            </span>
                          </TableCell>
                          <TableCell className="text-center">
                            <span className={`inline-flex items-center justify-center w-10 h-6 rounded text-xs font-bold ${
                              r.ai_score >= 80 ? "bg-emerald-500/20 text-emerald-400" :
                              r.ai_score >= 60 ? "bg-amber-500/20 text-amber-400" :
                              r.ai_score >= 40 ? "bg-orange-500/20 text-orange-400" :
                              "bg-muted text-muted-foreground"
                            }`}>
                              {r.ai_score}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={`text-[10px] ${categoryColors[r.category] || categoryColors.generic}`}>
                              {r.category}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            ${r.estimated_value?.toLocaleString() || "—"}
                          </TableCell>
                          <TableCell className="text-center hidden md:table-cell">
                            <span className="text-sm">{r.brandability}</span>
                          </TableCell>
                          <TableCell className="text-center hidden md:table-cell">
                            <span className="text-sm">{r.keyword_strength}</span>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate hidden lg:table-cell">
                            {r.ai_summary}
                          </TableCell>
                        </TableRow>
                      )})}
                    </TableBody>
                  </Table>
                </div>
                {/* Pagination */}
                <div className="flex items-center justify-between px-4 py-3 border-t">
                  <p className="text-sm text-muted-foreground">
                    {totalResults > 0
                      ? `${page * PAGE_SIZE + 1}–${Math.min((page + 1) * PAGE_SIZE, totalResults)} of ${totalResults.toLocaleString()}`
                      : "No results"}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page === 0}
                      onClick={() => goToPage(page - 1)}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <span className="text-sm text-muted-foreground">
                      Page {page + 1} of {totalPages || 1}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page >= totalPages - 1}
                      onClick={() => goToPage(page + 1)}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            </>
          )}

          {/* Empty state */}
          {!loading && !isProcessing && results.length === 0 && (
            <Card className="mt-4">
              <CardContent className="py-12 text-center">
                <TrendingUp className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-semibold text-foreground mb-2">No results yet</h3>
                <p className="text-sm text-muted-foreground max-w-md mx-auto">
                  Today's drop list is being processed. Check back shortly — results will appear here automatically.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
};

export default Drops;
