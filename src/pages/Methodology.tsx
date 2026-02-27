import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { 
  Database, TrendingUp, Shield, Brain, BarChart3, 
  Target, Search, Layers, ArrowRight, CheckCircle2 
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const Methodology = () => {
  return (
    <>
      <Helmet>
        <title>Our Valuation Methodology — How We Price Domains | ExpiredHawk</title>
        <meta
          name="description"
          content="Learn how ExpiredHawk values domains using thousands of verified sales, AI-powered analysis, and multi-signal scoring across brandability, keyword demand, and TLD trends."
        />
        <link rel="canonical" href="https://expiredhawk.com/methodology" />
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Article",
            headline: "How ExpiredHawk Values Domains",
            description:
              "A transparent look at our AI-powered domain valuation methodology, built on thousands of verified comparable sales.",
            author: {
              "@type": "Organization",
              name: "ExpiredHawk",
              url: "https://expiredhawk.com",
            },
            datePublished: "2026-02-23",
            dateModified: "2026-02-23",
          })}
        </script>
      </Helmet>

      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="pt-24 pb-16">
          {/* Hero */}
          <section className="container mx-auto px-4 mb-16">
            <div className="max-w-3xl mx-auto text-center">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
                <Database className="w-4 h-4" />
                Thousands of Verified Sales
              </div>
              <h1 className="text-4xl md:text-5xl font-bold mb-6">
                How We Value{" "}
                <span className="gradient-text">Domains</span>
              </h1>
              <p className="text-lg text-muted-foreground leading-relaxed">
                Every valuation on ExpiredHawk is anchored against real transaction data — not guesswork. 
                Here's a transparent look at the signals, scoring, and AI that power our estimates.
              </p>
            </div>
          </section>

          {/* The Data Foundation */}
          <section className="container mx-auto px-4 mb-20">
            <div className="max-w-4xl mx-auto">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Database className="w-5 h-5 text-primary" />
                </div>
                <h2 className="text-2xl font-bold">The Data Foundation</h2>
              </div>
              <p className="text-muted-foreground mb-6 leading-relaxed">
                At the core of every estimate is our curated <strong>comparable sales database</strong> — 
                thousands of verified domain transactions from 2020 to 2026, sourced from major auction 
                platforms and verified marketplaces. This isn't scraped wholesale data; each record 
                represents a completed sale with a confirmed price.
              </p>

              <div className="grid sm:grid-cols-3 gap-4 mb-8">
                <Card className="border-border">
                  <CardContent className="p-5 text-center">
                    <p className="text-3xl font-bold gradient-text mb-1">2,500+</p>
                    <p className="text-sm text-muted-foreground">Verified Sales</p>
                  </CardContent>
                </Card>
                <Card className="border-border">
                  <CardContent className="p-5 text-center">
                    <p className="text-3xl font-bold gradient-text mb-1">6 Years</p>
                    <p className="text-sm text-muted-foreground">Market History (2020–2026)</p>
                  </CardContent>
                </Card>
                <Card className="border-border">
                  <CardContent className="p-5 text-center">
                    <p className="text-3xl font-bold gradient-text mb-1">45+ TLDs</p>
                    <p className="text-sm text-muted-foreground">Covered Extensions</p>
                  </CardContent>
                </Card>
              </div>

              <h3 className="text-lg font-semibold mb-3">How Comparables Are Selected</h3>
              <p className="text-muted-foreground mb-4 leading-relaxed">
                When you value a domain, our engine finds the most relevant sales using a weighted 
                ranking system:
              </p>
              <div className="grid sm:grid-cols-2 gap-3">
                {[
                  { label: "TLD Match", weight: "40%", desc: "Same extension gets heaviest weight — a .ai comp matters more for .ai domains" },
                  { label: "Category & Keyword Relevance", weight: "25%", desc: "NLP-based semantic matching finds comps in the same industry niche" },
                  { label: "Length Similarity", weight: "25%", desc: "Similar character counts produce more meaningful comparisons" },
                  { label: "Recency", weight: "10%", desc: "Recent sales reflect current market conditions more accurately" },
                ].map((item) => (
                  <div key={item.label} className="flex gap-3 p-4 rounded-lg bg-muted/50 border border-border">
                    <div className="shrink-0 w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                      <span className="text-sm font-bold text-primary">{item.weight}</span>
                    </div>
                    <div>
                      <p className="font-medium text-sm">{item.label}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Multi-Signal Scoring */}
          <section className="container mx-auto px-4 mb-20">
            <div className="max-w-4xl mx-auto">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Layers className="w-5 h-5 text-primary" />
                </div>
                <h2 className="text-2xl font-bold">Multi-Signal Scoring</h2>
              </div>
              <p className="text-muted-foreground mb-8 leading-relaxed">
                A domain's value isn't determined by a single metric. We compute multiple independent 
                scores and feed them into both our algorithmic engine and AI advisor:
              </p>

              <div className="space-y-6">
                {[
                  {
                    icon: Target,
                    title: "Brandability Score",
                    desc: "Measures how memorable, pronounceable, and marketable a domain name is. Factors include syllable structure, vowel-consonant patterns, dictionary word detection, and phonetic harmony. A high brandability score signals strong end-user appeal.",
                  },
                  {
                    icon: Search,
                    title: "Keyword Demand",
                    desc: "Heuristic-based analysis of root keyword search interest. We extract meaningful keywords from domain names using a 700+ word dictionary covering verbs, nouns, adjectives, and compound-word roots, then score them against known demand tiers. This is explicitly keyword demand — not domain traffic.",
                  },
                  {
                    icon: BarChart3,
                    title: "Pronounceability",
                    desc: "Algorithmic scoring of how easily a domain can be spoken aloud. Domains that are easy to say over the phone or recommend verbally command premium pricing.",
                  },
                  {
                    icon: Shield,
                    title: "Risk Assessment",
                    desc: "Trademark screening, spam history detection, and TLD reputation analysis. High-risk domains are flagged before you invest.",
                  },
                  {
                    icon: TrendingUp,
                    title: "Domain Age & History",
                    desc: "RDAP-based registration history scoring. Veteran domains (20+ years) receive trust premiums, while newly registered domains are assessed differently.",
                  },
                ].map((signal) => (
                  <div key={signal.title} className="flex gap-4 p-5 rounded-lg border border-border">
                    <div className="shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mt-0.5">
                      <signal.icon className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold mb-1">{signal.title}</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">{signal.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* AI-Powered Valuation */}
          <section className="container mx-auto px-4 mb-20">
            <div className="max-w-4xl mx-auto">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Brain className="w-5 h-5 text-primary" />
                </div>
                <h2 className="text-2xl font-bold">AI-Powered Valuation</h2>
              </div>
              <p className="text-muted-foreground mb-6 leading-relaxed">
                Our <strong>AI Domain Advisor</strong> takes the scoring signals above and combines them 
                with our full comparable sales dataset to produce contextual, market-aware estimates. 
                Unlike simple calculators, the AI understands:
              </p>

              <div className="grid sm:grid-cols-2 gap-4 mb-8">
                {[
                  "Trending niche multipliers (AI, fintech, spatial computing)",
                  "TLD-specific demand curves (.ai, .io, .gg premiums)",
                  "Semantic category matching across industries",
                  "End-user vs. liquidation pricing models",
                  "Length-based premium tiers",
                  "Keyword synergy with TLD context",
                ].map((item) => (
                  <div key={item} className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                    <span className="text-sm text-muted-foreground">{item}</span>
                  </div>
                ))}
              </div>

              <div className="p-5 rounded-lg bg-muted/50 border border-border">
                <h3 className="font-semibold mb-2">Three-Price Model</h3>
                <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                  Every AI valuation returns three distinct price points to give you a complete picture:
                </p>
                <div className="grid sm:grid-cols-3 gap-3">
                  <div className="p-3 rounded-md bg-background border border-border">
                    <p className="text-sm font-medium text-primary">End-User Value</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      What a business buyer would pay for the perfect domain
                    </p>
                  </div>
                  <div className="p-3 rounded-md bg-background border border-border">
                    <p className="text-sm font-medium">Max Buy Price</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      The most you should pay to maintain healthy flip margins
                    </p>
                  </div>
                  <div className="p-3 rounded-md bg-background border border-border">
                    <p className="text-sm font-medium text-muted-foreground">Liquidation Value</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Fire-sale pricing if you need to exit quickly
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Algorithmic Fallback */}
          <section className="container mx-auto px-4 mb-20">
            <div className="max-w-4xl mx-auto">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <BarChart3 className="w-5 h-5 text-primary" />
                </div>
                <h2 className="text-2xl font-bold">Consistency & Fallbacks</h2>
              </div>
              <p className="text-muted-foreground mb-4 leading-relaxed">
                Our shared <code className="px-1.5 py-0.5 rounded bg-muted text-foreground text-sm">quickValuation</code> library 
                engine runs across the entire platform — dashboard, portfolio tracker, and bulk analyzer — ensuring 
                baseline consistency. The AI advisor serves as the primary source of truth for high-fidelity 
                valuations, while the algorithmic engine provides instant estimates and acts as a functional 
                fallback during API rate limits.
              </p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Scores are pre-computed on the backend and stored per domain. A periodic audit job 
                re-verifies data every 4 hours, ensuring algorithm updates are consistently applied and 
                maintaining high accuracy standards across 2.7M+ monitored auction rows.
              </p>
            </div>
          </section>

          {/* CTA */}
          <section className="container mx-auto px-4 mb-16">
            <div className="max-w-3xl mx-auto text-center">
              <h2 className="text-2xl font-bold mb-4">Try It Yourself</h2>
              <p className="text-muted-foreground mb-6">
                Run a free analysis on any domain using our tools — powered by the methodology above.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <Link to="/signup">
                  <Button variant="hero" size="lg">
                    Sign Up &amp; Try It Free
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
                <Link to="/signup">
                  <Button variant="outline" size="lg">
                    Create Free Account
                  </Button>
                </Link>
              </div>
            </div>
          </section>

          {/* Disclaimer */}
          <section className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto">
              <p className="text-xs text-muted-foreground text-center leading-relaxed">
                <strong>Disclaimer:</strong> All valuations are AI-generated estimates for informational purposes only. 
                They do not constitute financial advice. Actual market prices may vary based on buyer intent, 
                negotiation, timing, and other factors not captured by automated analysis. Comparable sales 
                data is sourced from curated, verified datasets and may not reflect every transaction in the market.
              </p>
            </div>
          </section>
        </main>
        <Footer />
      </div>
    </>
  );
};

export default Methodology;
