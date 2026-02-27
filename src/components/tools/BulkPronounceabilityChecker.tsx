import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { List, ArrowUpDown, ShieldAlert, ShieldCheck, Upload, Award, Download, BarChart3, Flame, Search, AlertTriangle, Sparkles, Filter, X, Wand2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { scorePronounceability, countSyllables, type PronounceabilityResult } from "@/lib/pronounceability";
import { checkTrademarkRisk, getTrademarkRiskDisplay, type TrademarkResult } from "@/lib/trademarkCheck";
import { quickValuation } from "@/lib/domainValuation";
import { scoreBrandability } from "@/lib/brandability";
import { scoreKeywordDemand } from "@/lib/keywordDemand";
import { estimateSEOVolume } from "@/lib/seoVolume";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

/** Composite flip score: weighted blend of all signals into 1-100 */
function computeFlipScore(
  brandability: number,
  demand: number,
  valuationScore: number,
  pronounceability: number,
  tmRisk: "none" | "low" | "medium" | "high",
  seoVolume: number,
): number {
  // Weights: brand 25%, demand 25%, valuation 20%, pronounce 15%, SEO 10%, TM penalty 5%
  const tmPenalty = tmRisk === "high" ? 0 : tmRisk === "medium" ? 40 : tmRisk === "low" ? 75 : 100;
  const seoNorm = Math.min(100, Math.round(Math.log10(Math.max(seoVolume, 1) + 1) * 20));
  const raw =
    brandability * 0.25 +
    demand * 0.25 +
    valuationScore * 0.20 +
    pronounceability * 0.15 +
    seoNorm * 0.10 +
    tmPenalty * 0.05;
  return Math.max(1, Math.min(100, Math.round(raw)));
}

interface BulkResult {
  domain: string;
  result: PronounceabilityResult;
  trademark: TrademarkResult;
  valuationBand: string;
  valuationScore: number;
  valuationMin: number;
  valuationMax: number;
  syllables: number;
  brandabilityScore: number;
  demandScore: number;
  demandLabel: string;
  seoVolume: number;
  seoVolumeLabel: string;
  flipScore: number;
}

type SortField = "flip" | "score" | "valuation" | "brand" | "demand" | "seo";

export function BulkPronounceabilityChecker() {
  const navigate = useNavigate();
  const [text, setText] = useState("");
  const [results, setResults] = useState<BulkResult[]>([]);
  const [sortField, setSortField] = useState<SortField>("score");
  const [sortAsc, setSortAsc] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Inline filters
  const [minFlipScore, setMinFlipScore] = useState(0);
  const [tldFilter, setTldFilter] = useState("all");
  const [tmRiskFilter, setTmRiskFilter] = useState("all");

  const filtersActive = minFlipScore > 0 || tldFilter !== "all" || tmRiskFilter !== "all";

  // Auto-import from Name Generator / Compound Generator
  useEffect(() => {
    try {
      const imported = localStorage.getItem("eh_bulk_import");
      if (imported) {
        const domains: string[] = JSON.parse(imported);
        localStorage.removeItem("eh_bulk_import");
        if (domains.length > 0) {
          const cleaned = domains
            .map(d => d.trim().toLowerCase())
            .filter(d => d.length >= 2 && /^[a-z0-9.-]+$/.test(d))
            .slice(0, 50);
          if (cleaned.length > 0) {
            setText(cleaned.join("\n"));
            // Auto-analyze after a tick
            setTimeout(() => scoreDomains(cleaned), 100);
          }
        }
      }
    } catch {}
  }, []);

  const clearFilters = () => {
    setMinFlipScore(0);
    setTldFilter("all");
    setTmRiskFilter("all");
  };

  // Derive unique TLDs from results
  const uniqueTlds = [...new Set(results.map(r => {
    const parts = r.domain.split(".");
    return parts.length > 1 ? `.${parts[parts.length - 1]}` : ".com";
  }))].sort();

  // Apply filters
  const filteredResults = results.filter(r => {
    if (r.flipScore < minFlipScore) return false;
    if (tldFilter !== "all") {
      const tld = r.domain.split(".").length > 1 ? `.${r.domain.split(".").pop()}` : ".com";
      if (tld !== tldFilter) return false;
    }
    if (tmRiskFilter !== "all" && r.trademark.riskLevel !== tmRiskFilter) return false;
    return true;
  });

  const parseDomains = (raw: string) =>
    raw
      .split(/[\n,;]+/)
      .map((d) => d.trim().replace(/\s+/g, "").toLowerCase())
      .filter((d) => d.length >= 2 && /^[a-z0-9.-]+$/.test(d))
      .slice(0, 50);

  const scoreDomains = (domains: string[]) => {
    const scored = domains.map((domain) => {
      const result = scorePronounceability(domain);
      const trademark = checkTrademarkRisk(domain);
      const val = quickValuation(domain, result.score);
      const syllables = countSyllables(domain.split(".")[0]);
      const brandabilityScore = scoreBrandability(domain).overall;
      const demand = scoreKeywordDemand(domain);
      const seo = estimateSEOVolume(domain);
      const flipScore = computeFlipScore(
        brandabilityScore, demand.score, val.score, result.score,
        trademark.riskLevel, seo.estimatedMonthlySearches,
      );
      return {
        domain,
        result,
        trademark,
        valuationBand: val.band,
        valuationScore: val.score,
        valuationMin: val.valueMin,
        valuationMax: val.valueMax,
        syllables,
        brandabilityScore,
        demandScore: demand.score,
        demandLabel: demand.label,
        seoVolume: seo.estimatedMonthlySearches,
        seoVolumeLabel: seo.volumeLabel,
        flipScore,
      };
    });
    scored.sort((a, b) => b.flipScore - a.flipScore);
    setResults(scored);
    setSortAsc(false);
    setSortField("flip");
  };

  const handleCheck = () => {
    const domains = parseDomains(text);
    if (!domains.length) return;
    scoreDomains(domains);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const content = ev.target?.result as string;
      const domains = parseDomains(content);
      if (domains.length) {
        setText(domains.join("\n"));
        scoreDomains(domains);
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const sortFn = (field: SortField) => (a: BulkResult, b: BulkResult) => {
    switch (field) {
      case "flip": return b.flipScore - a.flipScore;
      case "score": return b.result.score - a.result.score;
      case "brand": return b.brandabilityScore - a.brandabilityScore;
      case "valuation": return b.valuationScore - a.valuationScore;
      case "demand": return b.demandScore - a.demandScore;
      case "seo": return b.seoVolume - a.seoVolume;
    }
  };

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setResults((prev) => [...prev].reverse());
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      const sorted = [...results].sort(sortFn(field));
      setResults(sorted);
      setSortAsc(false);
    }
  };

  const handleExportCSV = () => {
    if (!results.length) return;
    const headers = ["Domain", "Flip Score", "Pronounceability", "Grade", "Brandability", "Demand", "Demand Label", "Keyword Volume", "Keyword Volume Label", "Algo Est. Value", "Val. Score", "Syllables", "TM Risk", "TM Summary"];
    const rows = results.map(r => {
      const escapeCsv = (v: string | number) => {
        const s = String(v);
        return s.includes(",") || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s;
      };
      return [
        escapeCsv(r.domain),
        r.flipScore,
        r.result.score,
        r.result.grade,
        r.brandabilityScore,
        r.demandScore,
        escapeCsv(r.demandLabel.replace(/[🔥📈⬆️➡️↘️⬇️⛔]/g, "").trim()),
        r.seoVolume,
        escapeCsv(r.seoVolumeLabel),
        escapeCsv(r.valuationBand),
        r.valuationScore,
        r.syllables,
        escapeCsv(getTrademarkRiskDisplay(r.trademark.riskLevel).label),
        escapeCsv(r.trademark.summary),
      ];
    });
    const csv = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `domain-analysis-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Portfolio stats (based on filtered results)
  const statsSource = filteredResults;
  const portfolioStats = statsSource.length > 0 ? {
    avgFlip: Math.round(statsSource.reduce((s, r) => s + r.flipScore, 0) / statsSource.length),
    avgBrand: Math.round(statsSource.reduce((s, r) => s + r.brandabilityScore, 0) / statsSource.length),
    avgPronounce: Math.round(statsSource.reduce((s, r) => s + r.result.score, 0) / statsSource.length),
    avgDemand: Math.round(statsSource.reduce((s, r) => s + r.demandScore, 0) / statsSource.length),
    totalValueMin: statsSource.reduce((s, r) => s + r.valuationMin, 0),
    totalValueMax: statsSource.reduce((s, r) => s + r.valuationMax, 0),
    topDomain: statsSource.reduce((best, r) => r.flipScore > best.flipScore ? r : best, statsSource[0]),
  } : null;

  const gradeColor = (grade: string) => {
    switch (grade) {
      case "Excellent": return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400";
      case "Good": return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
      case "Fair": return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400";
      default: return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
    }
  };

  const demandColor = (score: number) => {
    if (score >= 70) return "text-emerald-600 dark:text-emerald-400";
    if (score >= 40) return "text-blue-600 dark:text-blue-400";
    if (score >= 25) return "text-amber-600 dark:text-amber-400";
    return "text-red-600 dark:text-red-400";
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <List className="w-5 h-5 text-primary" />
          Bulk Domain Analyzer
        </CardTitle>
        <CardDescription>
          Paste up to 50 domains or upload a CSV/TXT file. Get pronounceability, brandability, keyword demand, estimated value, and trademark risk — with portfolio stats and CSV export.
        </CardDescription>
        <p className="text-xs text-amber-600 dark:text-amber-400 mt-1.5 flex items-center gap-1">
          <AlertTriangle className="w-3 h-3 shrink-0" />
          Valuations shown here are fast algorithmic estimates. For AI-powered appraisals, use the AI Advisor tab — those results will differ.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        <Textarea
          placeholder={"shopify.com\ncloudflare.com\nxyzqwk.com\ngetmybestdeal.com\nnikedeals.com"}
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={5}
        />
        <div className="flex gap-3">
          <Button onClick={handleCheck} disabled={!text.trim()} className="flex-1">
            <List className="w-4 h-4 mr-2" />
            Analyze All ({Math.min(50, text.split(/[\n,;]+/).filter(s => s.trim().replace(/\s+/g, "")).length)} domains)
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.txt,.text"
            className="hidden"
            onChange={handleFileUpload}
          />
          <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
            <Upload className="w-4 h-4 mr-1" />
            <span className="hidden sm:inline">Upload</span>
          </Button>
        </div>

        {/* Portfolio Summary Stats */}
        {portfolioStats && (
          <div className="animate-fade-in space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-primary" />
                Portfolio Summary ({results.length} domains)
              </h3>
              <Button variant="outline" size="sm" onClick={handleExportCSV} className="gap-1.5">
                <Download className="w-3.5 h-3.5" />
                Export CSV
              </Button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
              <div className="p-3 rounded-lg bg-secondary/50 border border-border/50 text-center">
                <p className="text-xs text-muted-foreground">Avg Flip Score</p>
                <p className={`text-lg font-bold ${portfolioStats.avgFlip >= 65 ? "text-emerald-600 dark:text-emerald-400" : portfolioStats.avgFlip >= 40 ? "text-blue-600 dark:text-blue-400" : "text-amber-600 dark:text-amber-400"}`}>
                  {portfolioStats.avgFlip}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-secondary/50 border border-border/50 text-center">
                <p className="text-xs text-muted-foreground">Total Est. Value</p>
                <p className="text-sm font-bold text-foreground">
                  ${portfolioStats.totalValueMin.toLocaleString()} – ${portfolioStats.totalValueMax.toLocaleString()}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-secondary/50 border border-border/50 text-center">
                <p className="text-xs text-muted-foreground">Avg Brandability</p>
                <p className={`text-lg font-bold ${portfolioStats.avgBrand >= 70 ? "text-emerald-600 dark:text-emerald-400" : portfolioStats.avgBrand >= 50 ? "text-blue-600 dark:text-blue-400" : "text-amber-600 dark:text-amber-400"}`}>
                  {portfolioStats.avgBrand}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-secondary/50 border border-border/50 text-center">
                <p className="text-xs text-muted-foreground">Avg Pronounce</p>
                <p className={`text-lg font-bold ${portfolioStats.avgPronounce >= 70 ? "text-emerald-600 dark:text-emerald-400" : portfolioStats.avgPronounce >= 50 ? "text-blue-600 dark:text-blue-400" : "text-amber-600 dark:text-amber-400"}`}>
                  {portfolioStats.avgPronounce}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-secondary/50 border border-border/50 text-center">
                <p className="text-xs text-muted-foreground">Avg Demand</p>
                <p className={`text-lg font-bold ${demandColor(portfolioStats.avgDemand)}`}>
                  {portfolioStats.avgDemand}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-secondary/50 border border-border/50 text-center">
                <p className="text-xs text-muted-foreground">Best Flip</p>
                <p className="text-sm font-bold text-primary truncate">{portfolioStats.topDomain.domain}</p>
              </div>
            </div>
          </div>
        )}

        {results.length > 0 && (
          <div className="animate-fade-in space-y-3">
            {/* Inline Filters */}
            <div className="flex flex-wrap items-end gap-3 p-3 rounded-lg bg-secondary/30 border border-border/50">
              <div className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
                <Filter className="w-3.5 h-3.5" />
                Filters
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-muted-foreground">Min Flip Score: {minFlipScore}</label>
                <Slider
                  value={[minFlipScore]}
                  onValueChange={([v]) => setMinFlipScore(v)}
                  max={100}
                  step={5}
                  className="w-32"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-muted-foreground">TLD</label>
                <Select value={tldFilter} onValueChange={setTldFilter}>
                  <SelectTrigger className="h-8 w-28 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All TLDs</SelectItem>
                    {uniqueTlds.map(tld => (
                      <SelectItem key={tld} value={tld}>{tld}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-muted-foreground">TM Risk</label>
                <Select value={tmRiskFilter} onValueChange={setTmRiskFilter}>
                  <SelectTrigger className="h-8 w-28 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Any</SelectItem>
                    <SelectItem value="none">Safe</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {filtersActive && (
                <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8 text-xs gap-1">
                  <X className="w-3 h-3" /> Clear
                </Button>
              )}
              <span className="text-xs text-muted-foreground ml-auto">
                {filteredResults.length}/{results.length} shown
              </span>
            </div>

            <div className="rounded-lg border border-border overflow-x-auto touch-pan-x overscroll-x-contain -mx-4 px-4 sm:mx-0 sm:px-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">#</TableHead>
                    <TableHead>Domain</TableHead>
                    <TableHead className="text-center cursor-pointer select-none" onClick={() => toggleSort("flip")}>
                      <span className="inline-flex items-center gap-1">
                        <Award className="w-3 h-3" /> Flip <ArrowUpDown className="w-3 h-3" />
                      </span>
                    </TableHead>
                    <TableHead className="text-center">Syl</TableHead>
                    <TableHead className="text-center cursor-pointer select-none" onClick={() => toggleSort("score")}>
                      <span className="inline-flex items-center gap-1">
                        Score <ArrowUpDown className="w-3 h-3" />
                      </span>
                    </TableHead>
                    <TableHead className="text-center">Grade</TableHead>
                    <TableHead className="text-center cursor-pointer select-none" onClick={() => toggleSort("brand")}>
                      <span className="inline-flex items-center gap-1">
                        Brand <ArrowUpDown className="w-3 h-3" />
                      </span>
                    </TableHead>
                    <TableHead className="text-center cursor-pointer select-none" onClick={() => toggleSort("demand")}>
                      <span className="inline-flex items-center gap-1">
                        <Flame className="w-3 h-3" /> Demand <ArrowUpDown className="w-3 h-3" />
                      </span>
                    </TableHead>
                    <TableHead className="text-center cursor-pointer select-none" onClick={() => toggleSort("seo")}>
                      <span className="inline-flex items-center gap-1">
                        <Search className="w-3 h-3" /> SEO Vol <ArrowUpDown className="w-3 h-3" />
                      </span>
                    </TableHead>
                    <TableHead className="text-center cursor-pointer select-none" onClick={() => toggleSort("valuation")}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="inline-flex items-center gap-1 cursor-help">
                            Algo Est. <ArrowUpDown className="w-3 h-3" />
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-xs max-w-[200px]">Fast algorithmic estimate. Use AI Advisor for more accurate appraisals.</p>
                        </TooltipContent>
                      </Tooltip>
                    </TableHead>
                    <TableHead className="text-center">TM</TableHead>
                    <TableHead className="text-center w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredResults.map((r, i) => {
                    const tmDisplay = getTrademarkRiskDisplay(r.trademark.riskLevel);
                    // Arbitrage detection: high quality signals but low algo valuation = potential undervalued gem
                    const qualitySignal = (r.brandabilityScore + r.demandScore + r.result.score) / 3;
                    const valuationTier = r.valuationMin <= 500 ? "low" : r.valuationMin <= 5000 ? "mid" : "high";
                    const isArbitrage = qualitySignal >= 55 && valuationTier === "low" && r.trademark.riskLevel !== "high";
                    const isStrongArbitrage = qualitySignal >= 65 && r.flipScore >= 55 && valuationTier !== "high" && r.trademark.riskLevel !== "high";
                    return (
                      <TableRow key={i} className={isStrongArbitrage ? "bg-emerald-50/50 dark:bg-emerald-950/20" : ""}>
                        <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                        <TableCell className="font-medium text-foreground">
                          <span className="inline-flex items-center gap-1.5">
                            {r.domain}
                            {isStrongArbitrage && (
                              <Tooltip>
                                <TooltipTrigger>
                                  <Badge className="text-[10px] px-1.5 py-0 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400 border-0 cursor-help">
                                    💎 Undervalued
                                  </Badge>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p className="text-xs max-w-[200px]">Strong quality signals (brand, demand, pronounceability) relative to current algo estimate — potential arbitrage opportunity.</p>
                                </TooltipContent>
                              </Tooltip>
                            )}
                            {!isStrongArbitrage && isArbitrage && (
                              <Tooltip>
                                <TooltipTrigger>
                                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-amber-600 dark:text-amber-400 border-amber-300 dark:border-amber-700 cursor-help">
                                    📈 Watch
                                  </Badge>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p className="text-xs max-w-[200px]">Quality signals outpace current valuation — worth monitoring for flip potential.</p>
                                </TooltipContent>
                              </Tooltip>
                            )}
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className={`text-sm font-bold ${r.flipScore >= 75 ? "text-emerald-600 dark:text-emerald-400" : r.flipScore >= 50 ? "text-blue-600 dark:text-blue-400" : r.flipScore >= 30 ? "text-amber-600 dark:text-amber-400" : "text-red-600 dark:text-red-400"}`}>
                            {r.flipScore}
                          </span>
                        </TableCell>
                        <TableCell className="text-center text-muted-foreground">{r.syllables}</TableCell>
                        <TableCell className="text-center font-semibold text-foreground">{r.result.score}</TableCell>
                        <TableCell className="text-center">
                          <Badge className={`text-xs ${gradeColor(r.result.grade)}`}>
                            {r.result.grade}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className={`text-sm font-semibold ${r.brandabilityScore >= 70 ? "text-emerald-600 dark:text-emerald-400" : r.brandabilityScore >= 50 ? "text-blue-600 dark:text-blue-400" : r.brandabilityScore >= 30 ? "text-amber-600 dark:text-amber-400" : "text-red-600 dark:text-red-400"}`}>
                            {r.brandabilityScore}
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          <Tooltip>
                            <TooltipTrigger>
                              <span className={`text-sm font-semibold cursor-help ${demandColor(r.demandScore)}`}>
                                {r.demandScore}
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="text-xs">{r.demandLabel}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TableCell>
                        <TableCell className="text-center">
                          <Tooltip>
                            <TooltipTrigger>
                              <span className={`text-xs font-medium cursor-help ${r.seoVolume >= 10000 ? "text-emerald-600 dark:text-emerald-400" : r.seoVolume >= 1000 ? "text-blue-600 dark:text-blue-400" : r.seoVolume >= 100 ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground"}`}>
                                {r.seoVolumeLabel}
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="text-xs">~{r.seoVolume.toLocaleString()} est. monthly searches</p>
                            </TooltipContent>
                          </Tooltip>
                        </TableCell>
                        <TableCell className="text-center text-sm text-muted-foreground whitespace-nowrap">
                          {r.valuationBand}
                        </TableCell>
                        <TableCell className="text-center">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Badge variant="outline" className={`text-xs cursor-help ${tmDisplay.color}`}>
                                {r.trademark.riskLevel === "none" ? (
                                  <ShieldCheck className="w-3 h-3 mr-0.5" />
                                ) : (
                                  <ShieldAlert className="w-3 h-3 mr-0.5" />
                                )}
                                {tmDisplay.label}
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs">
                              <p>{r.trademark.summary}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TableCell>
                        <TableCell className="text-center">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-primary hover:text-primary/80"
                                onClick={() => navigate(`/tools?domain=${encodeURIComponent(r.domain)}`)}
                              >
                                <Sparkles className="w-3.5 h-3.5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="text-xs">Get full AI appraisal</p>
                            </TooltipContent>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Sorted by {sortField === "flip" ? "flip score" : sortField === "score" ? "pronounceability" : sortField === "brand" ? "brandability" : sortField === "demand" ? "keyword demand" : sortField === "seo" ? "SEO volume" : "algo estimate"} ({sortAsc ? "asc" : "desc"}). Click headers to re-sort. Values are algorithmic estimates — use AI Advisor for precise appraisals.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
