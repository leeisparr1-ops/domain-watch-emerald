import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { List, ArrowUpDown } from "lucide-react";
import { scorePronounceability, type PronounceabilityResult } from "@/lib/pronounceability";

interface BulkResult {
  domain: string;
  result: PronounceabilityResult;
}

export function BulkPronounceabilityChecker() {
  const [text, setText] = useState("");
  const [results, setResults] = useState<BulkResult[]>([]);
  const [sortAsc, setSortAsc] = useState(false);

  const handleCheck = () => {
    const domains = text
      .split(/[\n,;\s]+/)
      .map((d) => d.trim().toLowerCase())
      .filter((d) => d.length >= 2 && /^[a-z0-9.-]+$/.test(d))
      .slice(0, 50);

    if (!domains.length) return;

    const scored = domains.map((domain) => ({
      domain,
      result: scorePronounceability(domain),
    }));

    scored.sort((a, b) => b.result.score - a.result.score);
    setResults(scored);
    setSortAsc(false);
  };

  const toggleSort = () => {
    setResults((prev) => [...prev].sort((a, b) => sortAsc ? b.result.score - a.result.score : a.result.score - b.result.score));
    setSortAsc(!sortAsc);
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
          Bulk Pronounceability Checker
        </CardTitle>
        <CardDescription>
          Paste up to 50 domain names (one per line, or comma-separated) and get a ranked comparison.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Textarea
          placeholder={"shopify.com\ncloudflare.com\nxyzqwk.com\ngetmybestdeal.com"}
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={5}
        />
        <Button onClick={handleCheck} disabled={!text.trim()} className="w-full">
          <List className="w-4 h-4 mr-2" />
          Score All ({Math.min(50, text.split(/[\n,;\s]+/).filter(Boolean).length)} domains)
        </Button>

        {results.length > 0 && (
          <div className="animate-fade-in">
            <div className="rounded-lg border border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">#</TableHead>
                    <TableHead>Domain</TableHead>
                    <TableHead className="text-center">Words</TableHead>
                    <TableHead className="text-center cursor-pointer select-none" onClick={toggleSort}>
                      <span className="inline-flex items-center gap-1">
                        Score <ArrowUpDown className="w-3 h-3" />
                      </span>
                    </TableHead>
                    <TableHead className="text-center">Grade</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {results.map((r, i) => (
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
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Sorted by {sortAsc ? "lowest" : "highest"} score first. Click the Score header to reverse.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
