import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  BrainCircuit, Loader2, TrendingUp, ShieldAlert, Target, DollarSign, Clock,
  Users, ThumbsUp, ThumbsDown, BarChart3, Sparkles, Globe2, ArrowRight,
  CheckCircle2, AlertTriangle, HelpCircle, Award, Mic,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { FlipScoreGauge } from "@/components/tools/FlipScoreGauge";

interface SharedReportData {
  id: string;
  domain_name: string;
  analysis: any;
  pre_scores: any;
  created_at: string;
}

const confidenceConfig: Record<string, { icon: typeof CheckCircle2; color: string; label: string }> = {
  High: { icon: CheckCircle2, color: "text-emerald-600 dark:text-emerald-400", label: "High Confidence" },
  Medium: { icon: AlertTriangle, color: "text-amber-600 dark:text-amber-400", label: "Medium Confidence" },
  Low: { icon: HelpCircle, color: "text-red-500 dark:text-red-400", label: "Low Confidence" },
};

const verdictColor = (v: string) => {
  if (v === "Strong Buy") return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-500/30";
  if (v === "Buy") return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-500/30";
  if (v === "Hold") return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-500/30";
  return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-500/30";
};

const SharedReport = () => {
  const { reportId } = useParams();
  const [report, setReport] = useState<SharedReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchReport = async () => {
      if (!reportId) { setError("No report ID"); setLoading(false); return; }
      const { data, error: err } = await supabase
        .from("shared_reports")
        .select("*")
        .eq("id", reportId)
        .single();
      if (err || !data) { setError("Report not found or has expired."); }
      else { setReport(data as SharedReportData); }
      setLoading(false);
    };
    fetchReport();
  }, [reportId]);

  const analysis = report?.analysis;
  const preScores = report?.pre_scores;
  const confidence = analysis?.valuation_confidence ? confidenceConfig[analysis.valuation_confidence] : null;

  return (
    <>
      <Helmet>
        <title>{report ? `${report.domain_name} AI Report - ExpiredHawk` : "Shared Report - ExpiredHawk"}</title>
        <meta name="description" content={report ? `AI domain analysis for ${report.domain_name}` : "Shared domain report"} />
      </Helmet>
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto px-4 pt-24 pb-16">
          <div className="max-w-4xl mx-auto">
            {loading && (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            )}

            {error && (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-muted-foreground mb-4">{error}</p>
                  <Link to="/tools?tab=advisor">
                    <Button>Run Your Own Analysis</Button>
                  </Link>
                </CardContent>
              </Card>
            )}

            {report && analysis && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-foreground">
                      AI Report: <span className="gradient-text">{report.domain_name}</span>
                    </h1>
                    <p className="text-xs text-muted-foreground mt-1">
                      Generated {new Date(report.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <Link to={`/tools?tab=advisor&domain=${encodeURIComponent(report.domain_name)}`}>
                    <Button size="sm" variant="outline" className="gap-1.5">
                      <BrainCircuit className="w-4 h-4" /> Re-analyze
                    </Button>
                  </Link>
                </div>

                <Card>
                  <CardContent className="pt-6 space-y-5">
                    {/* Verdict */}
                    <div className="flex items-start gap-3 p-4 rounded-lg border border-border bg-card">
                      <div className="flex flex-col gap-1.5 shrink-0">
                        <Badge variant="outline" className={`text-sm font-bold px-3 py-1 ${verdictColor(analysis.verdict)}`}>
                          {analysis.verdict}
                        </Badge>
                        {confidence && (
                          <div className={`flex items-center gap-1 text-[10px] font-medium ${confidence.color}`}>
                            <confidence.icon className="w-3 h-3" />
                            {confidence.label}
                          </div>
                        )}
                      </div>
                      <p className="text-sm text-foreground leading-relaxed">{analysis.summary}</p>
                    </div>

                    {/* Key Metrics */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="flex flex-col items-center p-4 rounded-lg border border-border bg-card">
                        <p className="text-xs text-muted-foreground mb-2 font-medium">Flip Potential</p>
                        <FlipScoreGauge score={analysis.flip_score} size={140} />
                        <p className="text-xs text-muted-foreground mt-2">
                          <Clock className="w-3 h-3 inline mr-1" />{analysis.flip_timeline}
                        </p>
                      </div>
                      <div className="p-4 rounded-lg border border-border bg-card text-center flex flex-col justify-center">
                        <Users className="w-5 h-5 mx-auto mb-2 text-primary" />
                        <p className="text-xs text-muted-foreground">End-User Value</p>
                        <p className="text-lg font-bold text-foreground mt-1">{analysis.end_user_value || analysis.value_range}</p>
                      </div>
                      <div className="p-4 rounded-lg border border-border bg-card text-center flex flex-col justify-center">
                        <DollarSign className="w-5 h-5 mx-auto mb-2 text-emerald-500" />
                        <p className="text-xs text-muted-foreground">Wholesale Value</p>
                        <p className="text-lg font-bold text-foreground mt-1">{analysis.suggested_buy_price}</p>
                      </div>
                      <div className="p-4 rounded-lg border border-border bg-card text-center flex flex-col justify-center">
                        <Target className="w-5 h-5 mx-auto mb-2 text-amber-500" />
                        <p className="text-xs text-muted-foreground">Niche</p>
                        <p className="text-lg font-bold text-foreground mt-1">{analysis.niche}</p>
                      </div>
                    </div>

                    {/* Confidence Interval */}
                    {analysis.confidence_range_low && analysis.confidence_range_high && (
                      <div className="p-4 rounded-lg border border-border bg-card space-y-2">
                        <h4 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                          <BarChart3 className="w-4 h-4 text-primary" /> Confidence Interval
                        </h4>
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-medium text-muted-foreground">{analysis.confidence_range_low}</span>
                          <div className="flex-1 h-3 rounded-full bg-secondary relative overflow-hidden">
                            <div className="absolute inset-y-0 left-[15%] right-[15%] rounded-full bg-gradient-to-r from-amber-500/60 via-emerald-500/80 to-amber-500/60" />
                            <div className="absolute inset-y-0 left-[35%] right-[35%] rounded-full bg-emerald-500" />
                          </div>
                          <span className="text-sm font-medium text-muted-foreground">{analysis.confidence_range_high}</span>
                        </div>
                      </div>
                    )}

                    {/* Value Drivers */}
                    {analysis.value_drivers && (
                      <div className="p-4 rounded-lg border border-border bg-card space-y-3">
                        <h4 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                          <BarChart3 className="w-4 h-4 text-primary" /> Value Driver Breakdown
                        </h4>
                        <div className="space-y-2">
                          {[
                            { key: "keywords", label: "Keywords", color: "bg-blue-500" },
                            { key: "tld", label: "TLD Premium", color: "bg-emerald-500" },
                            { key: "brandability", label: "Brandability", color: "bg-violet-500" },
                            { key: "niche_demand", label: "Niche Demand", color: "bg-amber-500" },
                            { key: "domain_length", label: "Domain Length", color: "bg-rose-500" },
                            { key: "comparable_sales", label: "Comparable Sales", color: "bg-cyan-500" },
                          ]
                            .sort((a, b) => (analysis.value_drivers[b.key] || 0) - (analysis.value_drivers[a.key] || 0))
                            .map(({ key, label, color }) => {
                              const pct = analysis.value_drivers[key] || 0;
                              if (pct === 0) return null;
                              return (
                                <div key={key} className="flex items-center gap-3">
                                  <span className="text-xs text-muted-foreground w-28 shrink-0 text-right">{label}</span>
                                  <div className="flex-1 h-2.5 rounded-full bg-secondary overflow-hidden">
                                    <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${pct}%` }} />
                                  </div>
                                  <span className="text-xs font-semibold text-foreground w-10">{pct}%</span>
                                </div>
                              );
                            })}
                        </div>
                      </div>
                    )}

                    {/* Pre-scores strip */}
                    {preScores && (
                      <div className="grid grid-cols-4 gap-2">
                        <div className="p-2 rounded-lg bg-secondary/50 text-center">
                          <p className="text-[10px] text-muted-foreground">Brand</p>
                          <p className="text-sm font-bold text-foreground">{preScores.brandability}</p>
                        </div>
                        <div className="p-2 rounded-lg bg-secondary/50 text-center">
                          <p className="text-[10px] text-muted-foreground">Pronounce</p>
                          <p className="text-sm font-bold text-foreground">{preScores.pronounceability}</p>
                        </div>
                        <div className="p-2 rounded-lg bg-secondary/50 text-center">
                          <p className="text-[10px] text-muted-foreground">Demand</p>
                          <p className="text-sm font-bold text-foreground">{preScores.keywordDemand}</p>
                        </div>
                        <div className="p-2 rounded-lg bg-secondary/50 text-center">
                          <p className="text-[10px] text-muted-foreground">Trademark</p>
                          <p className="text-sm font-bold text-foreground">{preScores.trademarkRisk}</p>
                        </div>
                      </div>
                    )}

                    {/* Buyer + Niche */}
                    <div className="flex flex-wrap gap-3">
                      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-secondary/50 text-sm">
                        <Users className="w-4 h-4 text-primary" />
                        <span className="text-muted-foreground">Buyer:</span>
                        <span className="text-foreground font-medium">{analysis.buyer_persona}</span>
                      </div>
                    </div>

                    {/* Key Comparables */}
                    {analysis.key_comparables?.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                          <DollarSign className="w-4 h-4 text-primary" /> Key Comparables
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                          {analysis.key_comparables.map((comp: any, i: number) => (
                            <div key={i} className="p-3 rounded-lg border border-border bg-card space-y-1">
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-semibold text-foreground">{comp.domain}</span>
                                <span className="text-sm font-bold text-primary">{comp.price}</span>
                              </div>
                              <p className="text-[11px] text-muted-foreground leading-relaxed">{comp.relevance}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Strengths / Weaknesses */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <h4 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                          <ThumbsUp className="w-4 h-4 text-emerald-500" /> Strengths
                        </h4>
                        <ul className="space-y-1.5">
                          {analysis.strengths?.map((s: string, i: number) => (
                            <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                              <span className="text-emerald-500 mt-0.5">•</span> {s}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div className="space-y-2">
                        <h4 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                          <ThumbsDown className="w-4 h-4 text-red-500" /> Risks
                        </h4>
                        <ul className="space-y-1.5">
                          {analysis.weaknesses?.map((w: string, i: number) => (
                            <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                              <span className="text-red-500 mt-0.5">•</span> {w}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    {/* CTA */}
                    <div className="p-4 rounded-lg border border-primary/30 bg-primary/5 text-center space-y-3">
                      <p className="text-sm font-medium text-foreground">Want your own AI-powered domain analysis?</p>
                      <Link to="/tools?tab=advisor">
                        <Button variant="hero" className="gap-2">
                          <BrainCircuit className="w-4 h-4" /> Try AI Domain Advisor Free
                        </Button>
                      </Link>
                    </div>

                    <p className="text-xs text-muted-foreground text-center">
                      AI-generated analysis. Not financial advice. Results are estimates.
                    </p>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </main>
        <Footer />
      </div>
    </>
  );
};

export default SharedReport;
