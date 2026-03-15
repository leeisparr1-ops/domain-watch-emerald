import { useState, useRef, useCallback, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, Zap, Trophy, ArrowUpDown, Download, Loader2, Search, TrendingUp, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
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
}

interface Scan {
  id: string;
  filename: string;
  status: string;
  total_domains: number;
  filtered_domains: number;
  evaluated_domains: number;
  created_at: string;
}

type SortKey = "ai_score" | "estimated_value" | "brandability" | "keyword_strength" | "domain_name";
const BATCH_SIZE = 25;

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
  const fileRef = useRef<HTMLInputElement>(null);
  const [scanning, setScanning] = useState(false);
  const [currentScan, setCurrentScan] = useState<Scan | null>(null);
  const [results, setResults] = useState<ScanResult[]>([]);
  const [sortKey, setSortKey] = useState<SortKey>("ai_score");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [searchFilter, setSearchFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const handleUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (!file.name.endsWith(".csv") && !file.name.endsWith(".txt")) {
      toast.error("Please upload a CSV or TXT file");
      return;
    }

    setScanning(true);
    setResults([]);

    try {
      const csvText = await file.text();
      const lines = csvText.trim().split("\n");
      if (lines.length < 2) {
        toast.error("File appears empty");
        setScanning(false);
        return;
      }

      // Create scan record
      const { data: scan, error: scanErr } = await supabase
        .from("drop_scans")
        .insert({ user_id: user.id, filename: file.name, total_domains: lines.length - 1 })
        .select()
        .single();

      if (scanErr || !scan) throw new Error(scanErr?.message || "Failed to create scan");
      setCurrentScan(scan as Scan);

      // Fire off evaluation (async — we poll for progress)
      supabase.functions.invoke("evaluate-drops", {
        body: { csvText, scanId: scan.id },
      }).catch(err => console.error("Eval invoke error:", err));

      toast.success(`Processing ${lines.length - 1} domains...`);

      // Poll for progress
      pollRef.current = setInterval(async () => {
        const { data: scanUpdate } = await supabase
          .from("drop_scans")
          .select("*")
          .eq("id", scan.id)
          .single();

        if (scanUpdate) {
          setCurrentScan(scanUpdate as Scan);

          if (scanUpdate.status === "complete" || scanUpdate.status === "error") {
            if (pollRef.current) clearInterval(pollRef.current);
            setScanning(false);

            // Fetch results
            const { data: resultData } = await supabase
              .from("drop_scan_results")
              .select("*")
              .eq("scan_id", scan.id)
              .order("ai_score", { ascending: false })
              .limit(1000);

            setResults((resultData || []) as ScanResult[]);
            toast.success(`Scan complete! ${resultData?.length || 0} domains evaluated.`);
          }
        }
      }, 3000);
    } catch (err: any) {
      toast.error(err.message || "Upload failed");
      setScanning(false);
    }

    // Reset file input
    if (fileRef.current) fileRef.current.value = "";
  }, [user]);

  const loadPastScan = useCallback(async () => {
    if (!user) return;
    const { data: scans } = await supabase
      .from("drop_scans")
      .select("*")
      .eq("user_id", user.id)
      .eq("status", "complete")
      .order("created_at", { ascending: false })
      .limit(1);

    if (scans && scans.length > 0) {
      const scan = scans[0] as Scan;
      setCurrentScan(scan);
      const { data: resultData } = await supabase
        .from("drop_scan_results")
        .select("*")
        .eq("scan_id", scan.id)
        .order("ai_score", { ascending: false })
        .limit(1000);
      setResults((resultData || []) as ScanResult[]);
    }
  }, [user]);

  // Load last scan on mount
  useEffect(() => { loadPastScan(); }, [loadPastScan]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("desc"); }
  };

  const filteredResults = results
    .filter(r => {
      if (searchFilter && !r.domain_name.includes(searchFilter.toLowerCase())) return false;
      if (categoryFilter !== "all" && r.category !== categoryFilter) return false;
      return true;
    })
    .sort((a, b) => {
      let cmp = 0;
      if (sortKey === "domain_name") cmp = a.domain_name.localeCompare(b.domain_name);
      else cmp = (a[sortKey] ?? 0) - (b[sortKey] ?? 0);
      return sortDir === "asc" ? cmp : -cmp;
    });

  const topPicks = results.filter(r => r.ai_score >= 75).length;
  const avgScore = results.length ? Math.round(results.reduce((s, r) => s + r.ai_score, 0) / results.length) : 0;

  const exportCsv = () => {
    if (!filteredResults.length) return;
    const headers = "Domain,Score,Category,Est. Value,Brandability,Keyword Strength,Summary\n";
    const rows = filteredResults.map(r =>
      `"${r.domain_name}",${r.ai_score},"${r.category}",${r.estimated_value},${r.brandability},${r.keyword_strength},"${r.ai_summary}"`
    ).join("\n");
    const blob = new Blob([headers + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `drop-scan-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const progress = currentScan && currentScan.filtered_domains > 0
    ? Math.round((currentScan.evaluated_domains / currentScan.filtered_domains) * 100)
    : 0;

  return (
    <>
      <Helmet>
        <title>Daily Drop Scanner | ExpiredHawk</title>
        <meta name="description" content="Upload expiring domain lists and let AI evaluate the best investment picks." />
      </Helmet>
      <Navbar />
      <main className="min-h-screen bg-background pt-20 pb-16">
        <div className="container max-w-6xl mx-auto px-4">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
              <Zap className="w-4 h-4" />
              AI Drop Scanner
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">
              Daily Drop Scanner
            </h1>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Upload a CSV of expiring domains and let AI evaluate every single one automatically.
            </p>
          </div>

          {/* Upload Card */}
          <Card className="mb-8 border-dashed border-2">
            <CardContent className="py-8 text-center">
              <input
                ref={fileRef}
                type="file"
                accept=".csv,.txt"
                className="hidden"
                onChange={handleUpload}
                disabled={scanning}
              />
              {scanning ? (
                <div className="space-y-4">
                  <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto" />
                  <div>
                    <p className="font-medium text-foreground">
                      Evaluating {currentScan?.filtered_domains || 0} .com domains...
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {currentScan?.evaluated_domains || 0} / {currentScan?.filtered_domains || 0} processed
                    </p>
                  </div>
                  <Progress value={progress} className="max-w-sm mx-auto" />
                  <p className="text-xs text-muted-foreground">
                    ~{Math.ceil(((currentScan?.filtered_domains || 0) - (currentScan?.evaluated_domains || 0)) / BATCH_SIZE * 5)}s remaining
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <Upload className="w-10 h-10 text-muted-foreground mx-auto" />
                  <div>
                    <p className="font-medium text-foreground">Upload Expiring Domains CSV</p>
                    <p className="text-sm text-muted-foreground">
                      CSV with domain names — we'll filter .com and AI-evaluate each one
                    </p>
                  </div>
                  <Button onClick={() => fileRef.current?.click()} size="lg">
                    <Upload className="w-4 h-4 mr-2" />
                    Choose File
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Results Section */}
          {results.length > 0 && (
            <>
              {/* Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <Card>
                  <CardContent className="py-4 text-center">
                    <p className="text-2xl font-bold text-foreground">{results.length}</p>
                    <p className="text-xs text-muted-foreground">Domains Evaluated</p>
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
                <div className="overflow-x-auto">
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
                      {filteredResults.slice(0, 200).map((r) => (
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
                {filteredResults.length > 200 && (
                  <div className="text-center py-3 text-sm text-muted-foreground border-t">
                    Showing 200 of {filteredResults.length} results. Export CSV for full list.
                  </div>
                )}
              </Card>
            </>
          )}

          {/* Empty state */}
          {!scanning && results.length === 0 && (
            <Card className="mt-4">
              <CardContent className="py-12 text-center">
                <TrendingUp className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-semibold text-foreground mb-2">No scans yet</h3>
                <p className="text-sm text-muted-foreground max-w-md mx-auto">
                  Upload a CSV of expiring domains from your preferred data source. 
                  The AI will evaluate each .com domain and rank them by investment potential.
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
