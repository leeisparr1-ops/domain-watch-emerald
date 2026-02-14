import { useState, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Search, Award, Mic, DollarSign, Shield, Globe2, Loader2,
  Clock, X, Share2, Copy, Check, ExternalLink,
} from "lucide-react";
import { Link } from "react-router-dom";
import { scoreBrandability, type BrandabilityResult } from "@/lib/brandability";
import { scorePronounceability, type PronounceabilityResult } from "@/lib/pronounceability";
import { checkTrademarkRisk, getTrademarkRiskDisplay, type TrademarkResult } from "@/lib/trademarkCheck";
import { supabase } from "@/integrations/supabase/client";
import { useDomainHistory, type DomainHistoryItem } from "@/hooks/useDomainHistory";
import { toast } from "sonner";

interface AvailabilityResult {
  status: "available" | "registered" | "unknown";
  loading: boolean;
}

interface ReportData {
  domain: string;
  brandability: BrandabilityResult;
  pronounceability: PronounceabilityResult;
  trademark: TrademarkResult;
  availability: AvailabilityResult;
}

function getScoreColor(score: number) {
  if (score >= 80) return "text-emerald-600 dark:text-emerald-400";
  if (score >= 60) return "text-blue-600 dark:text-blue-400";
  if (score >= 40) return "text-amber-600 dark:text-amber-400";
  return "text-red-600 dark:text-red-400";
}

function getScoreBg(score: number) {
  if (score >= 80) return "bg-emerald-500/10 border-emerald-500/20";
  if (score >= 60) return "bg-blue-500/10 border-blue-500/20";
  if (score >= 40) return "bg-amber-500/10 border-amber-500/20";
  return "bg-red-500/10 border-red-500/20";
}

function getProgressColor(score: number) {
  if (score >= 80) return "[&>div]:bg-emerald-500";
  if (score >= 60) return "[&>div]:bg-blue-500";
  if (score >= 40) return "[&>div]:bg-amber-500";
  return "[&>div]:bg-red-500";
}

function AvailabilityBadge({ status, loading }: AvailabilityResult) {
  if (loading) return <Badge variant="outline" className="gap-1"><Loader2 className="w-3 h-3 animate-spin" />Checking...</Badge>;
  if (status === "available") return <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 gap-1"><Globe2 className="w-3 h-3" />Available</Badge>;
  if (status === "registered") return <Badge variant="outline" className="bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30 gap-1"><Globe2 className="w-3 h-3" />Registered</Badge>;
  return <Badge variant="outline" className="bg-muted text-muted-foreground gap-1"><Globe2 className="w-3 h-3" />Unknown</Badge>;
}

export function DomainReportCard() {
  const [domain, setDomain] = useState("");
  const [report, setReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const { history, addDomain, clearHistory } = useDomainHistory();
  const inputRef = useRef<HTMLInputElement>(null);

  const runAnalysis = async (input: string) => {
    const cleaned = input.trim().replace(/\s+/g, "").toLowerCase();
    if (!cleaned) return;

    // Add TLD if missing
    const domainWithTld = cleaned.includes(".") ? cleaned : `${cleaned}.com`;

    setDomain(domainWithTld);
    setLoading(true);

    // Run client-side analyses instantly
    const brandability = scoreBrandability(domainWithTld);
    const pronounceability = scorePronounceability(domainWithTld);
    const trademark = checkTrademarkRisk(domainWithTld);

    const reportData: ReportData = {
      domain: domainWithTld,
      brandability,
      pronounceability,
      trademark,
      availability: { status: "unknown", loading: true },
    };
    setReport(reportData);
    setLoading(false);
    addDomain(domainWithTld);

    // Check RDAP availability async
    try {
      const { data, error } = await supabase.functions.invoke("check-domain-availability", {
        body: { domains: [domainWithTld] },
      });
      if (!error && data?.results?.[0]) {
        setReport((prev) =>
          prev ? { ...prev, availability: { status: data.results[0].status, loading: false } } : prev
        );
      } else {
        setReport((prev) => prev ? { ...prev, availability: { status: "unknown", loading: false } } : prev);
      }
    } catch {
      setReport((prev) => prev ? { ...prev, availability: { status: "unknown", loading: false } } : prev);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    runAnalysis(domain);
  };

  const handleHistoryClick = (d: string) => {
    setDomain(d);
    runAnalysis(d);
  };

  const handleShare = async () => {
    if (!report) return;
    const text = `🦅 ${report.domain} — Domain Report Card\n\n` +
      `📊 Brandability: ${report.brandability.overall}/100 (${report.brandability.grade})\n` +
      `🗣 Pronounceability: ${report.pronounceability.score}/100 (${report.pronounceability.grade})\n` +
      `🛡 Trademark: ${getTrademarkRiskDisplay(report.trademark.riskLevel).label}\n` +
      `🌐 Availability: ${report.availability.status}\n\n` +
      `Analyzed with ExpiredHawk`;

    if (navigator.share) {
      try {
        await navigator.share({ title: `${report.domain} Report`, text });
        return;
      } catch { /* fallback to clipboard */ }
    }
    await navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Report copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  const tmDisplay = report ? getTrademarkRiskDisplay(report.trademark.riskLevel) : null;

  return (
    <div className="space-y-6">
      {/* Search Bar */}
      <div className="relative">
        <form onSubmit={handleSubmit} className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              ref={inputRef}
              placeholder="Enter any domain (e.g. sparkflow.com)"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              className="pl-10 h-12 text-base"
            />
          </div>
          <Button type="submit" disabled={!domain.trim() || loading} size="lg" className="h-12 px-6">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Analyze"}
          </Button>
        </form>
      </div>

      {/* History Chips */}
      {history.length > 0 && !report && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Clock className="w-3 h-3" /> Recent searches
            </div>
            <button onClick={clearHistory} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
              Clear
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {history.slice(0, 10).map((h) => (
              <button
                key={h.domain}
                onClick={() => handleHistoryClick(h.domain)}
                className="px-3 py-1.5 text-xs rounded-full bg-secondary hover:bg-secondary/80 text-secondary-foreground border border-border/50 transition-colors"
              >
                {h.domain}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Report Card */}
      {report && (
        <div className="space-y-4 animate-fade-in">
          {/* Domain Header */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold font-display text-foreground">{report.domain}</h2>
              <div className="flex items-center gap-2 mt-1">
                <AvailabilityBadge {...report.availability} />
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="gap-1.5" onClick={handleShare}>
                {copied ? <Check className="w-3.5 h-3.5" /> : <Share2 className="w-3.5 h-3.5" />}
                {copied ? "Copied" : "Share"}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => { setReport(null); setDomain(""); inputRef.current?.focus(); }}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Score Cards Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {/* Brandability */}
            <Card className={`border ${getScoreBg(report.brandability.overall)}`}>
              <CardContent className="p-4 text-center space-y-1">
                <Award className="w-5 h-5 mx-auto text-muted-foreground" />
                <div className={`text-3xl font-bold ${getScoreColor(report.brandability.overall)}`}>
                  {report.brandability.overall}
                </div>
                <div className="text-xs text-muted-foreground">Brandability</div>
                <Badge variant="outline" className={`text-xs ${getScoreColor(report.brandability.overall)}`}>
                  {report.brandability.grade}
                </Badge>
                <Link to="/tools/brandability-score" className="text-[10px] text-muted-foreground hover:text-primary flex items-center justify-center gap-0.5 mt-1">
                  Details <ExternalLink className="w-2.5 h-2.5" />
                </Link>
              </CardContent>
            </Card>

            {/* Pronounceability */}
            <Card className={`border ${getScoreBg(report.pronounceability.score)}`}>
              <CardContent className="p-4 text-center space-y-1">
                <Mic className="w-5 h-5 mx-auto text-muted-foreground" />
                <div className={`text-3xl font-bold ${getScoreColor(report.pronounceability.score)}`}>
                  {report.pronounceability.score}
                </div>
                <div className="text-xs text-muted-foreground">Pronounceability</div>
                <Badge variant="outline" className={`text-xs ${getScoreColor(report.pronounceability.score)}`}>
                  {report.pronounceability.grade}
                </Badge>
                <Link to="/tools/pronounceability" className="text-[10px] text-muted-foreground hover:text-primary flex items-center justify-center gap-0.5 mt-1">
                  Details <ExternalLink className="w-2.5 h-2.5" />
                </Link>
              </CardContent>
            </Card>

            {/* Trademark Risk */}
            <Card className={`border ${
              report.trademark.riskLevel === "none" ? "bg-emerald-500/10 border-emerald-500/20" :
              report.trademark.riskLevel === "low" ? "bg-yellow-500/10 border-yellow-500/20" :
              report.trademark.riskLevel === "medium" ? "bg-orange-500/10 border-orange-500/20" :
              "bg-red-500/10 border-red-500/20"
            }`}>
              <CardContent className="p-4 text-center space-y-1">
                <Shield className="w-5 h-5 mx-auto text-muted-foreground" />
                <div className="text-2xl">{tmDisplay?.emoji}</div>
                <div className="text-xs text-muted-foreground">Trademark</div>
                <Badge variant="outline" className={`text-xs ${tmDisplay?.color}`}>
                  {tmDisplay?.label}
                </Badge>
              </CardContent>
            </Card>

            {/* Availability */}
            <Card className={`border ${
              report.availability.status === "available" ? "bg-emerald-500/10 border-emerald-500/20" :
              report.availability.status === "registered" ? "bg-red-500/10 border-red-500/20" :
              "bg-muted border-border"
            }`}>
              <CardContent className="p-4 text-center space-y-1">
                <Globe2 className="w-5 h-5 mx-auto text-muted-foreground" />
                {report.availability.loading ? (
                  <Loader2 className="w-6 h-6 mx-auto animate-spin text-muted-foreground" />
                ) : (
                  <div className="text-2xl">
                    {report.availability.status === "available" ? "🟢" : report.availability.status === "registered" ? "🔴" : "⚪"}
                  </div>
                )}
                <div className="text-xs text-muted-foreground">Availability</div>
                <Badge variant="outline" className="text-xs capitalize">
                  {report.availability.loading ? "Checking..." : report.availability.status}
                </Badge>
              </CardContent>
            </Card>
          </div>

          {/* Quick Summary Bar */}
          <Card className="border">
            <CardContent className="p-4 space-y-3">
              <h3 className="text-sm font-semibold text-foreground">Quick Summary</h3>
              <p className="text-sm text-muted-foreground">{report.brandability.summary}</p>
              {report.trademark.riskLevel !== "none" && (
                <div className={`text-xs p-2 rounded-md border ${
                  report.trademark.riskLevel === "high" ? "border-red-500/20 bg-red-500/5 text-red-600 dark:text-red-400" :
                  report.trademark.riskLevel === "medium" ? "border-orange-500/20 bg-orange-500/5 text-orange-600 dark:text-orange-400" :
                  "border-yellow-500/20 bg-yellow-500/5 text-yellow-600 dark:text-yellow-400"
                }`}>
                  ⚠️ {report.trademark.summary}
                </div>
              )}

              {/* Score breakdown bars */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                {report.brandability.dimensions.slice(0, 4).map((dim) => (
                  <div key={dim.name} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">{dim.name}</span>
                      <span className={`font-medium ${getScoreColor(dim.score)}`}>{dim.score}</span>
                    </div>
                    <Progress value={dim.score} className={`h-1.5 ${getProgressColor(dim.score)}`} />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Deep Dive Links */}
          <div className="flex flex-wrap gap-2">
            <Link to={`/tools/brandability-score?domain=${encodeURIComponent(report.domain)}`}>
              <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                <Award className="w-3.5 h-3.5" /> Full Brandability Analysis
              </Button>
            </Link>
            <Link to={`/tools/valuation?domain=${encodeURIComponent(report.domain)}`}>
              <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                <DollarSign className="w-3.5 h-3.5" /> Get Valuation
              </Button>
            </Link>
            <Link to={`/tools/pronounceability?domain=${encodeURIComponent(report.domain)}`}>
              <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                <Mic className="w-3.5 h-3.5" /> Pronounceability Details
              </Button>
            </Link>
          </div>

          {/* History chips after results */}
          {history.length > 1 && (
            <div className="space-y-2 pt-2 border-t border-border/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Clock className="w-3 h-3" /> Recent
                </div>
                <button onClick={clearHistory} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                  Clear
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {history.filter(h => h.domain !== report.domain).slice(0, 8).map((h) => (
                  <button
                    key={h.domain}
                    onClick={() => handleHistoryClick(h.domain)}
                    className="px-3 py-1.5 text-xs rounded-full bg-secondary hover:bg-secondary/80 text-secondary-foreground border border-border/50 transition-colors"
                  >
                    {h.domain}
                  </button>
                ))}
              </div>
            </div>
          )}

          <p className="text-xs text-muted-foreground italic">
            * Scores are for informational purposes only. Not financial or legal advice — always do your own due diligence.
          </p>
        </div>
      )}
    </div>
  );
}
