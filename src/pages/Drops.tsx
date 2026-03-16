import { useState, useRef, useCallback, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft, ChevronRight, Download, Loader2, Search, TrendingUp, Star, Clock } from "lucide-react";
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

type SortKey = "ai_score" | "estimated_value" | "brandability" | "keyword_strength" | "length_score" | "domain_name";

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
  const [showFilters, setShowFilters] = useState(false);
  const [loading, setLoading] = useState(true);
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
    dir: "asc" | "desc" = "desc"
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
        await fetchResults(scanId, pageRef.current, searchRef.current, categoryRef.current, sortKeyRef.current, sortDirRef.current);

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
      await fetchResults(resultsScan.id, 0, "", "all", "ai_score", "desc");
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
      fetchResults(scanId, 0, searchFilter, categoryFilter, sortKey, sortDir);
    }, searchFilter ? 300 : 0);
    return () => { if (filterTimerRef.current) clearTimeout(filterTimerRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchFilter, categoryFilter, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("desc"); }
  };

  const topPicks = results.filter(r => r.ai_score >= 75).length;
  const avgScore = results.length ? Math.round(results.reduce((s, r) => s + r.ai_score, 0) / results.length) : 0;

  const exportCsv = () => {
    if (!results.length) return;
    const headers = "Domain,Score,Category,Est. Value,Brandability,Keyword Strength,Length Score,Summary\n";
    const rows = results.map(r =>
      `"${r.domain_name}",${r.ai_score},"${r.category}",${r.estimated_value},${r.brandability},${r.keyword_strength},${r.length_score || 0},"${r.ai_summary}"`
    ).join("\n");
    const blob = new Blob([headers + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `drop-scan-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const totalPages = Math.ceil(totalResults / PAGE_SIZE);

  const goToPage = useCallback((newPage: number) => {
    if (!currentScan) return;
    setPage(newPage);
    fetchResults(currentScan.id, newPage, searchFilter, categoryFilter, sortKey, sortDir);
  }, [currentScan, fetchResults, searchFilter, categoryFilter, sortKey, sortDir]);

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
              </CardContent>
            </Card>
          )}

          {/* Results Section */}
          {(totalResults > 0 || results.length > 0 || (currentScan && currentScan.evaluated_domains > 0)) && (
            <>
              {/* Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <Card>
                  <CardContent className="py-4 text-center">
                    <p className="text-2xl font-bold text-foreground">
                      {(currentScan?.evaluated_domains || results.length).toLocaleString()}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {isProcessing ? "Evaluated So Far" : "Domains Evaluated"}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="py-4 text-center">
                    <p className="text-2xl font-bold text-primary">{topPicks}</p>
                    <p className="text-xs text-muted-foreground">Top Picks (75+)</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="py-4 text-center">
                    <p className="text-2xl font-bold text-foreground">{avgScore}</p>
                    <p className="text-xs text-muted-foreground">Avg Score</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="py-4 text-center">
                    <p className="text-2xl font-bold text-foreground">
                      ${Math.round(results.filter(r => r.ai_score >= 75).reduce((s, r) => s + r.estimated_value, 0)).toLocaleString()}
                    </p>
                    <p className="text-xs text-muted-foreground">Top Picks Value</p>
                  </CardContent>
                </Card>
              </div>

              {/* Filters */}
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
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-[160px]">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    <SelectItem value="premium">Premium</SelectItem>
                    <SelectItem value="brandable">Brandable</SelectItem>
                    <SelectItem value="keyword">Keyword</SelectItem>
                    <SelectItem value="short">Short</SelectItem>
                    <SelectItem value="geo">Geo</SelectItem>
                    <SelectItem value="niche">Niche</SelectItem>
                    <SelectItem value="generic">Generic</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" size="sm" onClick={exportCsv}>
                  <Download className="w-4 h-4 mr-1" /> Export
                </Button>
              </div>

              {/* Results Table */}
              <Card>
                <div className="overflow-auto max-h-[60vh]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="cursor-pointer" onClick={() => toggleSort("domain_name")}>
                          Domain {sortKey === "domain_name" && (sortDir === "asc" ? "↑" : "↓")}
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
                          <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                            No domains match your current filters.
                          </TableCell>
                        </TableRow>
                      ) : results.map((r) => (
                        <TableRow key={r.id}>
                          <TableCell className="font-medium">
                            {r.ai_score >= 80 && <Star className="w-3 h-3 inline mr-1 text-amber-400" />}
                            {r.domain_name}
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
                      ))}
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
