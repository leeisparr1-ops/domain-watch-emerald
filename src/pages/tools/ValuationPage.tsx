import { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { useSearchParams, useParams, Link } from "react-router-dom";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { useAuth } from "@/hooks/useAuth";
import { DomainValuationEstimator } from "@/components/tools/DomainValuationEstimator";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  DollarSign, TrendingUp, TrendingDown, Minus, Flame, Target, Lock, Loader2,
  BarChart3, Search, ShieldCheck, ArrowRight, Sparkles
} from "lucide-react";
import {
  quickValuation,
  splitIntoWords,
  NICHE_CATEGORIES,
  computeTrendScore,
  PREMIUM_KEYWORDS,
  DICTIONARY_WORDS,
  getTrendingMultiplier,
  isSingleDictionaryWord,
  isFullyCoveredByWords,
} from "@/lib/domainValuation";
import { checkTrademarkRisk } from "@/lib/trademarkCheck";

// ─── Teaser-only analysis (no auth, no API calls) ───

interface TeaserResult {
  estimatedValue: string;
  confidence: "High" | "Medium" | "Low";
  overallScore: number;
  trendScore: number;
  trendLabel: string;
  nicheLabel: string;
  nicheHeat: string;
  nicheMultiplier: number;
  nicheConfidence: string;
  nicheKeywords: string[];
  trademarkRisk: string;
  factorCount: number;
}

function runTeaserAnalysis(domain: string): TeaserResult {
  const domainWithTld = domain.includes(".") ? domain : `${domain}.com`;
  const val = quickValuation(domainWithTld);
  const parts = domainWithTld.toLowerCase().replace(/^www\./, "").split(".");
  const name = parts[0].replace(/[^a-z0-9]/g, "");
  const tld = parts[1] || "com";
  const wordParts = splitIntoWords(name);
  const meaningfulWords = wordParts.filter((w: string) => w.length >= 2 && (DICTIONARY_WORDS.has(w) || PREMIUM_KEYWORDS.has(w)));

  const { score: trendScore, label: trendLabel, niche } = computeTrendScore(meaningfulWords, tld);
  const trademark = checkTrademarkRisk(domainWithTld);

  const confidence: TeaserResult["confidence"] = val.score >= 75 ? "High" : val.score >= 50 ? "Medium" : "Low";

  return {
    estimatedValue: val.band,
    confidence,
    overallScore: val.score,
    trendScore,
    trendLabel,
    nicheLabel: niche.label,
    nicheHeat: niche.niche !== "general" && NICHE_CATEGORIES[niche.niche] ? NICHE_CATEGORIES[niche.niche].heat : "stable",
    nicheMultiplier: niche.multiplier,
    nicheConfidence: niche.confidence,
    nicheKeywords: niche.matchedKeywords,
    trademarkRisk: trademark.riskLevel,
    factorCount: 8,
  };
}

function getTrendScoreColor(score: number): string {
  if (score >= 85) return "text-red-500";
  if (score >= 70) return "text-orange-500";
  if (score >= 50) return "text-amber-500";
  if (score >= 30) return "text-blue-500";
  return "text-muted-foreground";
}

function getTrendScoreBg(score: number): string {
  if (score >= 85) return "bg-red-500/10 border-red-500/30";
  if (score >= 70) return "bg-orange-500/10 border-orange-500/30";
  if (score >= 50) return "bg-amber-500/10 border-amber-500/30";
  if (score >= 30) return "bg-blue-500/10 border-blue-500/30";
  return "bg-muted/50 border-border";
}

function getNicheHeatColor(heat: string): string {
  switch (heat) {
    case "hot": return "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20";
    case "warm": return "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20";
    case "stable": return "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20";
    case "cooling": return "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20";
    default: return "bg-muted/50 border-border";
  }
}

function getConfidenceColor(c: string): string {
  if (c === "High") return "text-emerald-600 dark:text-emerald-400 border-emerald-300";
  if (c === "Medium") return "text-amber-600 dark:text-amber-400 border-amber-300";
  return "text-red-600 dark:text-red-400 border-red-300";
}

// ─── Blurred Gate Overlay ───

function AuthGate() {
  return (
    <div className="relative mt-6">
      {/* Blurred placeholder content */}
      <div className="space-y-4 filter blur-[6px] select-none pointer-events-none" aria-hidden>
        <div className="p-4 rounded-xl bg-secondary/30 border border-border/50">
          <div className="flex items-center gap-2 mb-3">
            <Search className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold text-foreground">SEO Volume Analysis</span>
          </div>
          <div className="h-32 bg-muted/30 rounded-lg" />
        </div>
        <div className="space-y-3">
          <h4 className="text-sm font-semibold flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-primary" />
            Detailed Factor Breakdown
          </h4>
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="p-3 rounded-lg bg-secondary/50">
              <div className="h-3 bg-muted/50 rounded w-1/3 mb-2" />
              <div className="h-1.5 bg-muted/50 rounded w-full mb-1" />
              <div className="h-3 bg-muted/50 rounded w-2/3" />
            </div>
          ))}
        </div>
        <div className="space-y-3">
          <h4 className="text-sm font-semibold flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            Comparable Sales
          </h4>
          <div className="grid grid-cols-2 gap-2">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="p-2.5 rounded-lg bg-secondary/50 border border-border/50">
                <div className="h-4 bg-muted/50 rounded w-2/3 mb-1" />
                <div className="h-3 bg-muted/50 rounded w-1/2" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Overlay CTA */}
      <div className="absolute inset-0 flex items-center justify-center z-10 bg-gradient-to-b from-background/60 via-background/90 to-background/60 rounded-xl">
        <div className="text-center space-y-4 max-w-md px-6">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-2">
            <Lock className="w-7 h-7 text-primary" />
          </div>
          <h3 className="text-xl font-bold text-foreground">
            Unlock Full Report
          </h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Sign up free to access detailed factor breakdown, comparable sales data,
            SEO volume analysis, AI-powered valuations, and trademark risk checks.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button asChild size="lg" className="gap-2">
              <Link to="/signup">
                <Sparkles className="w-4 h-4" />
                Sign Up Free
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link to="/login">
                Already have an account? Log in
              </Link>
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            No credit card required · Instant access
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ───

const ValuationPage = () => {
  const [searchParams] = useSearchParams();
  const { domain: routeDomain } = useParams<{ domain: string }>();
  const domainParam = routeDomain || searchParams.get("domain") || "";
  const { user, loading: authLoading } = useAuth();

  const [domain, setDomain] = useState(domainParam);
  const [teaser, setTeaser] = useState<TeaserResult | null>(null);
  const [analyzing, setAnalyzing] = useState(false);

  const handleAnalyze = () => {
    if (!domain.trim()) return;
    setAnalyzing(true);
    setTeaser(null);
    // Small delay for perceived analysis UX
    setTimeout(() => {
      setTeaser(runTeaserAnalysis(domain.trim().toLowerCase()));
      setAnalyzing(false);
    }, 600);
  };

  // Auto-run if domain param provided
  useEffect(() => {
    if (domainParam && !user) {
      setDomain(domainParam);
      setTimeout(() => {
        setTeaser(runTeaserAnalysis(domainParam.trim().toLowerCase()));
      }, 300);
    }
  }, [domainParam]);

  const canonicalUrl = routeDomain
    ? `https://expiredhawk.com/value/${routeDomain}`
    : "https://expiredhawk.com/tools/valuation";
  const seoTitle = domainParam
    ? `${domainParam} Valuation — What's It Worth? | ExpiredHawk`
    : "Domain Valuation Estimator — What's Your Domain Worth? | ExpiredHawk";
  const seoDesc = domainParam
    ? `Free instant valuation for ${domainParam}. Get estimated value, quality score, trend analysis, and comparable sales data.`
    : "Free domain valuation tool with 2026 market data. Get instant price estimates based on comparable sales, TLD demand, and trending niches like AI and fintech.";

  // Authenticated users get the full tool
  if (!authLoading && user) {
    return (
      <>
        <Helmet>
          <title>{seoTitle}</title>
          <meta name="description" content={seoDesc} />
          <link rel="canonical" href={canonicalUrl} />
        </Helmet>
        <div className="min-h-screen bg-background">
          <Navbar />
          <main className="container mx-auto px-4 pt-24 pb-16">
            <div className="max-w-4xl mx-auto">
              <DomainValuationEstimator initialDomain={domainParam || undefined} />
            </div>
          </main>
          <Footer />
        </div>
      </>
    );
  }

  // Public teaser view
  return (
    <>
      <Helmet>
        <title>{seoTitle}</title>
        <meta name="description" content={seoDesc} />
        <link rel="canonical" href="https://expiredhawk.com/tools/valuation" />
        {/* JSON-LD for SEO */}
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebApplication",
          "name": "Domain Valuation Estimator",
          "description": "Free domain valuation tool with 2026 market data and 3,100+ verified sales.",
          "url": "https://expiredhawk.com/tools/valuation",
          "applicationCategory": "BusinessApplication",
          "operatingSystem": "Web",
          "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" },
        })}</script>
      </Helmet>
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto px-4 pt-24 pb-16">
          <div className="max-w-4xl mx-auto">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-primary" />
                  Domain Valuation Estimator
                </CardTitle>
                <CardDescription>
                  Get an instant estimated value based on length, TLD, keywords, brandability, trending niches, and 3,100+ verified comparable sales.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Input */}
                <div className="flex gap-3">
                  <Input
                    placeholder="Enter a domain (e.g. cloudpay.com)"
                    value={domain}
                    onChange={(e) => setDomain(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAnalyze()}
                    className="flex-1"
                  />
                  <Button onClick={handleAnalyze} disabled={!domain.trim() || analyzing}>
                    {analyzing ? (
                      <><Loader2 className="w-4 h-4 animate-spin mr-1" /> Analyzing…</>
                    ) : "Estimate"}
                  </Button>
                </div>

                {/* Loading */}
                {analyzing && (
                  <div className="rounded-xl border border-border bg-card p-6 space-y-3 animate-fade-in">
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-5 h-5 animate-spin text-primary" />
                      <span className="font-semibold text-foreground">Analyzing domain…</span>
                    </div>
                    {["Analyzing domain structure & TLD", "Scoring brandability & keywords"].map((step, i) => (
                      <div key={i} className="flex items-center gap-3 text-sm">
                        <ShieldCheck className="w-4 h-4 text-primary shrink-0" />
                        <span className="text-foreground">{step}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Teaser Results */}
                {teaser && (
                  <div className="space-y-5 animate-fade-in">
                    {/* Top-line metrics (PUBLIC) */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {/* Value Range */}
                      <div className="p-4 rounded-xl bg-secondary/50 border border-border/50">
                        <span className="text-xs text-muted-foreground block mb-1">Estimated Value</span>
                        <p className="text-2xl font-bold text-foreground">{teaser.estimatedValue}</p>
                        <Badge variant="outline" className={`text-xs mt-2 ${getConfidenceColor(teaser.confidence)}`}>
                          {teaser.confidence} Confidence
                        </Badge>
                      </div>

                      {/* Quality Score */}
                      <div className="p-4 rounded-xl bg-secondary/50 border border-border/50">
                        <span className="text-xs text-muted-foreground block mb-1">Quality Score</span>
                        <div className="flex items-baseline gap-1">
                          <span className="text-2xl font-bold text-foreground">{teaser.overallScore}</span>
                          <span className="text-sm text-muted-foreground">/ 100</span>
                        </div>
                        <Progress value={teaser.overallScore} className="h-2 mt-2" />
                      </div>

                      {/* Trend Score */}
                      <div className={`p-4 rounded-xl border ${getTrendScoreBg(teaser.trendScore)}`}>
                        <span className="text-xs text-muted-foreground block mb-1 flex items-center gap-1.5">
                          <Flame className="w-3.5 h-3.5" />
                          Trend Score
                        </span>
                        <div className="flex items-baseline gap-2">
                          <span className={`text-2xl font-bold ${getTrendScoreColor(teaser.trendScore)}`}>{teaser.trendScore}</span>
                          <span className="text-sm text-muted-foreground">/ 100</span>
                        </div>
                        <span className={`text-xs font-medium mt-1 block ${getTrendScoreColor(teaser.trendScore)}`}>
                          {teaser.trendLabel}
                        </span>
                      </div>

                      {/* Niche */}
                      <div className="p-4 rounded-xl bg-secondary/50 border border-border/50">
                        <span className="text-xs text-muted-foreground block mb-1 flex items-center gap-1.5">
                          <Target className="w-3.5 h-3.5" />
                          Niche
                        </span>
                        <Badge variant="outline" className={`text-xs ${getNicheHeatColor(teaser.nicheHeat)}`}>
                          {teaser.nicheLabel}
                        </Badge>
                        {teaser.nicheMultiplier > 1 && (
                          <Badge variant="outline" className="text-xs mt-1.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">
                            +{Math.round((teaser.nicheMultiplier - 1) * 100)}% boost
                          </Badge>
                        )}
                        {teaser.trademarkRisk !== "none" && (
                          <Badge variant="outline" className="text-xs mt-1.5 bg-red-500/10 text-red-600 border-red-500/20">
                            ⚠️ TM Risk
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Teaser CTA banner */}
                    <div className="p-4 rounded-xl bg-primary/5 border border-primary/20">
                      <div className="flex items-center gap-3">
                        <Sparkles className="w-5 h-5 text-primary shrink-0" />
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-foreground">Want the full analysis?</p>
                          <p className="text-xs text-muted-foreground">
                            Sign up free to unlock AI-powered end-user valuations, detailed factor breakdown,
                            comparable sales from 3,100+ verified transactions, SEO volume data, and trademark risk analysis.
                          </p>
                        </div>
                        <Button asChild size="sm" className="shrink-0 gap-1.5">
                          <Link to="/signup">
                            Get Full Report <ArrowRight className="w-3.5 h-3.5" />
                          </Link>
                        </Button>
                      </div>
                    </div>

                    {/* Gated content */}
                    <AuthGate />

                    <p className="text-xs text-muted-foreground italic">
                      * Algorithmic estimate based on domain structure, TLD demand, keyword trends, and 3,100+ verified aftermarket sales.
                      Sign up for AI-powered deep analysis, comparable sales, and trademark checks.
                    </p>
                  </div>
                )}

                {/* Trust signals for SEO */}
                {!teaser && !analyzing && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4">
                    {[
                      { label: "Verified Sales", value: "3,100+" },
                      { label: "TLDs Supported", value: "45+" },
                      { label: "Dictionary Words", value: "700+" },
                      { label: "Updated", value: "2026" },
                    ].map((stat, i) => (
                      <div key={i} className="text-center p-3 rounded-lg bg-secondary/30 border border-border/50">
                        <p className="text-lg font-bold text-foreground">{stat.value}</p>
                        <p className="text-xs text-muted-foreground">{stat.label}</p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </main>
        <Footer />
      </div>
    </>
  );
};

export default ValuationPage;
