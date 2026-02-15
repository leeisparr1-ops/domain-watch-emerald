import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { List, ArrowUpDown, ShieldAlert, ShieldCheck, Upload, Award, Download, BarChart3, Flame } from "lucide-react";
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
}

type SortField = "score" | "valuation" | "brand" | "demand";

export function BulkPronounceabilityChecker() {
  const [text, setText] = useState("");
  const [results, setResults] = useState<BulkResult[]>([]);
  const [sortField, setSortField] = useState<SortField>("score");
  const [sortAsc, setSortAsc] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      };
    });
    scored.sort((a, b) => b.result.score - a.result.score);
    setResults(scored);
    setSortAsc(false);
    setSortField("score");
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
      case "score": return b.result.score - a.result.score;
      case "brand": return b.brandabilityScore - a.brandabilityScore;
      case "valuation": return b.valuationScore - a.valuationScore;
      case "demand": return b.demandScore - a.demandScore;
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
    const headers = ["Domain", "Pronounceability", "Grade", "Brandability", "Demand", "Demand Label", "SEO Volume", "SEO Label", "Est. Value", "Val. Score", "Syllables", "TM Risk", "TM Summary"];
    const rows = results.map(r => [
      r.domain,
      r.result.score,
      r.result.grade,
      r.brandabilityScore,
      r.demandScore,
      r.demandLabel.replace(/[🔥📈⬆️➡️↘️⬇️⛔]/g, "").trim(),
      r.seoVolume,
      r.seoVolumeLabel,
      r.valuationBand,
      r.valuationScore,
      r.syllables,
      getTrademarkRiskDisplay(r.trademark.riskLevel).label,
      `"${r.trademark.summary.replace(/"/g, '""')}"`,
    ]);
    const csv = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `domain-analysis-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Portfolio stats
  const portfolioStats = results.length > 0 ? {
    avgBrand: Math.round(results.reduce((s, r) => s + r.brandabilityScore, 0) / results.length),
    avgPronounce: Math.round(results.reduce((s, r) => s + r.result.score, 0) / results.length),
    avgDemand: Math.round(results.reduce((s, r) => s + r.demandScore, 0) / results.length),
    totalValueMin: results.reduce((s, r) => s + r.valuationMin, 0),
    totalValueMax: results.reduce((s, r) => s + r.valuationMax, 0),
    topDomain: results.reduce((best, r) => r.valuationScore > best.valuationScore ? r : best, results[0]),
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
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
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
                <p className="text-xs text-muted-foreground">Top Domain</p>
                <p className="text-sm font-bold text-primary truncate">{portfolioStats.topDomain.domain}</p>
              </div>
            </div>
          </div>
        )}

        {results.length > 0 && (
          <div className="animate-fade-in">
            <div className="rounded-lg border border-border overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">#</TableHead>
                    <TableHead>Domain</TableHead>
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
                    <TableHead className="text-center cursor-pointer select-none" onClick={() => toggleSort("valuation")}>
                      <span className="inline-flex items-center gap-1">
                        Value <ArrowUpDown className="w-3 h-3" />
                      </span>
                    </TableHead>
                    <TableHead className="text-center">TM</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {results.map((r, i) => {
                    const tmDisplay = getTrademarkRiskDisplay(r.trademark.riskLevel);
                    return (
                      <TableRow key={i}>
                        <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                        <TableCell className="font-medium text-foreground">{r.domain}</TableCell>
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
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Sorted by {sortField === "score" ? "pronounceability" : sortField === "brand" ? "brandability" : sortField === "demand" ? "keyword demand" : "estimated value"} ({sortAsc ? "asc" : "desc"}). Click headers to re-sort.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
