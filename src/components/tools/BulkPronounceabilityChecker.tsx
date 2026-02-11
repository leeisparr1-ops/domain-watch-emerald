import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { List, ArrowUpDown, ShieldAlert, ShieldCheck } from "lucide-react";
import { scorePronounceability, type PronounceabilityResult } from "@/lib/pronounceability";
import { checkTrademarkRisk, getTrademarkRiskDisplay, type TrademarkResult } from "@/lib/trademarkCheck";
import { quickValuation } from "@/lib/domainValuation";
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
}

export function BulkPronounceabilityChecker() {
  const [text, setText] = useState("");
  const [results, setResults] = useState<BulkResult[]>([]);
  const [sortField, setSortField] = useState<"score" | "valuation">("score");
  const [sortAsc, setSortAsc] = useState(false);

  const handleCheck = () => {
    const domains = text
      .split(/[\n,;\s]+/)
      .map((d) => d.trim().toLowerCase())
      .filter((d) => d.length >= 2 && /^[a-z0-9.-]+$/.test(d))
      .slice(0, 50);

    if (!domains.length) return;

    const scored = domains.map((domain) => {
      const result = scorePronounceability(domain);
      const trademark = checkTrademarkRisk(domain);
      const val = quickValuation(domain, result.score);
      return { domain, result, trademark, valuationBand: val.band, valuationScore: val.score };
    });

    scored.sort((a, b) => b.result.score - a.result.score);
    setResults(scored);
    setSortAsc(false);
    setSortField("score");
  };

  const toggleSort = (field: "score" | "valuation") => {
    if (sortField === field) {
      setResults((prev) => [...prev].reverse());
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      const sorted = [...results].sort((a, b) => 
        field === "score" ? b.result.score - a.result.score : b.valuationScore - a.valuationScore
      );
      setResults(sorted);
      setSortAsc(false);
    }
  };

  const gradeColor = (grade: string) => {
    switch (grade) {
      case "Excellent": return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400";
      case "Good": return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
      case "Fair": return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400";
      default: return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <List className="w-5 h-5 text-primary" />
          Bulk Domain Analyzer
        </CardTitle>
        <CardDescription>
          Paste up to 50 domain names and get pronounceability, estimated value, and trademark risk for each — perfect for portfolio analysis.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Textarea
          placeholder={"shopify.com\ncloudflare.com\nxyzqwk.com\ngetmybestdeal.com\nnikedeals.com"}
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={5}
        />
        <Button onClick={handleCheck} disabled={!text.trim()} className="w-full">
          <List className="w-4 h-4 mr-2" />
          Analyze All ({Math.min(50, text.split(/[\n,;\s]+/).filter(Boolean).length)} domains)
        </Button>

        {results.length > 0 && (
          <div className="animate-fade-in">
            <div className="rounded-lg border border-border overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">#</TableHead>
                    <TableHead>Domain</TableHead>
                    <TableHead className="text-center">Words</TableHead>
                    <TableHead className="text-center cursor-pointer select-none" onClick={() => toggleSort("score")}>
                      <span className="inline-flex items-center gap-1">
                        Score <ArrowUpDown className="w-3 h-3" />
                      </span>
                    </TableHead>
                    <TableHead className="text-center">Grade</TableHead>
                    <TableHead className="text-center cursor-pointer select-none" onClick={() => toggleSort("valuation")}>
                      <span className="inline-flex items-center gap-1">
                        Est. Value <ArrowUpDown className="w-3 h-3" />
                      </span>
                    </TableHead>
                    <TableHead className="text-center">TM Risk</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {results.map((r, i) => {
                    const tmDisplay = getTrademarkRiskDisplay(r.trademark.riskLevel);
                    return (
                      <TableRow key={i}>
                        <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                        <TableCell className="font-medium text-foreground">{r.domain}</TableCell>
                        <TableCell className="text-center text-muted-foreground">{r.result.wordCount}</TableCell>
                        <TableCell className="text-center font-semibold text-foreground">{r.result.score}</TableCell>
                        <TableCell className="text-center">
                          <Badge className={`text-xs ${gradeColor(r.result.grade)}`}>
                            {r.result.grade}
                          </Badge>
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
              Sorted by {sortField === "score" ? "pronounceability" : "estimated value"} ({sortAsc ? "ascending" : "descending"}). Click headers to sort.
              Trademark check covers ~200 major brands — not legal advice.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
