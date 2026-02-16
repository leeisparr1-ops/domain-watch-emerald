import { Helmet } from "react-helmet-async";
import { Link, useSearchParams } from "react-router-dom";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Mic, Sparkles, DollarSign, List, Globe2, Award, ExternalLink, BrainCircuit } from "lucide-react";
import { PronounceabilityScorer } from "@/components/tools/PronounceabilityScorer";
import { NameGenerator } from "@/components/tools/NameGenerator";
import { DomainValuationEstimator } from "@/components/tools/DomainValuationEstimator";
import { BulkPronounceabilityChecker } from "@/components/tools/BulkPronounceabilityChecker";
import { TldComparisonTool } from "@/components/tools/TldComparisonTool";
import { BrandabilityScorer } from "@/components/tools/BrandabilityScorer";
import { DomainReportCard } from "@/components/tools/DomainReportCard";
import { AIDomainAdvisor } from "@/components/tools/AIDomainAdvisor";

const Tools = () => {
  const [searchParams] = useSearchParams();
  const defaultTab = searchParams.get("tab") || "advisor";
  return (
    <>
      <Helmet>
        <title>Domain Tools - ExpiredHawk</title>
        <meta name="description" content="Free domain tools: pronounceability scorer, AI name generator, domain valuation, bulk checker, and TLD comparison for domainers." />
      </Helmet>
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto px-4 pt-24 pb-16">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl md:text-4xl font-bold text-foreground">
                Domain <span className="gradient-text">Tools</span>
              </h1>
              <Badge variant="secondary" className="text-xs font-semibold uppercase tracking-wider bg-primary/10 text-primary border-primary/20">
                Beta
              </Badge>
            </div>
             <p className="text-muted-foreground mb-1">
              Analyze any domain instantly, or dive deep with individual tools below.
            </p>
            <p className="text-xs text-muted-foreground/70 mb-4">
              🚧 All tools are in beta — results are estimates and may change as we improve.
            </p>

            {/* Unified Domain Report Card */}
            <div className="mb-10">
              <DomainReportCard />
            </div>

            {/* Divider */}
            <div className="relative mb-8">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-3 text-muted-foreground font-medium tracking-wider">Deep Dive Tools</span>
              </div>
            </div>

            <Tabs defaultValue={defaultTab} className="w-full">
              <TabsList className="grid w-full grid-cols-3 md:grid-cols-7 mb-6 h-auto">
                <TabsTrigger value="advisor" className="flex items-center gap-1.5 text-xs md:text-sm">
                  <BrainCircuit className="w-4 h-4" />
                  <span className="hidden sm:inline">AI Advisor</span>
                  <span className="sm:hidden">Advisor</span>
                </TabsTrigger>
                <TabsTrigger value="brandability" className="flex items-center gap-1.5 text-xs md:text-sm">
                  <Award className="w-4 h-4" />
                  <span className="hidden sm:inline">Brandability</span>
                  <span className="sm:hidden">Brand</span>
                </TabsTrigger>
                <TabsTrigger value="pronounceability" className="flex items-center gap-1.5 text-xs md:text-sm">
                  <Mic className="w-4 h-4" />
                  <span className="hidden sm:inline">Pronounceability</span>
                  <span className="sm:hidden">Score</span>
                </TabsTrigger>
                <TabsTrigger value="bulk" className="flex items-center gap-1.5 text-xs md:text-sm">
                  <List className="w-4 h-4" />
                  <span className="hidden sm:inline">Bulk Checker</span>
                  <span className="sm:hidden">Bulk</span>
                </TabsTrigger>
                <TabsTrigger value="generator" className="flex items-center gap-1.5 text-xs md:text-sm">
                  <Sparkles className="w-4 h-4" />
                  <span className="hidden sm:inline">Name Generator</span>
                  <span className="sm:hidden">Generate</span>
                </TabsTrigger>
                <TabsTrigger value="valuation" className="flex items-center gap-1.5 text-xs md:text-sm">
                  <DollarSign className="w-4 h-4" />
                  <span className="hidden sm:inline">Valuation</span>
                  <span className="sm:hidden">Value</span>
                </TabsTrigger>
                <TabsTrigger value="tld" className="flex items-center gap-1.5 text-xs md:text-sm">
                  <Globe2 className="w-4 h-4" />
                  <span className="hidden sm:inline">TLD Compare</span>
                  <span className="sm:hidden">TLDs</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="advisor">
                <AIDomainAdvisor />
              </TabsContent>
              <TabsContent value="brandability">
                <div className="flex justify-end mb-2">
                  <Link to="/tools/brandability-score" className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1">
                    Open full page <ExternalLink className="w-3 h-3" />
                  </Link>
                </div>
                <BrandabilityScorer />
              </TabsContent>
              <TabsContent value="pronounceability">
                <div className="flex justify-end mb-2">
                  <Link to="/tools/pronounceability" className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1">
                    Open full page <ExternalLink className="w-3 h-3" />
                  </Link>
                </div>
                <PronounceabilityScorer />
              </TabsContent>
              <TabsContent value="bulk">
                <div className="flex justify-end mb-2">
                  <Link to="/tools/bulk-checker" className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1">
                    Open full page <ExternalLink className="w-3 h-3" />
                  </Link>
                </div>
                <BulkPronounceabilityChecker />
              </TabsContent>
              <TabsContent value="generator">
                <div className="flex justify-end mb-2">
                  <Link to="/tools/domain-generator" className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1">
                    Open full page <ExternalLink className="w-3 h-3" />
                  </Link>
                </div>
                <NameGenerator />
              </TabsContent>
              <TabsContent value="valuation">
                <div className="flex justify-end mb-2">
                  <Link to="/tools/valuation" className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1">
                    Open full page <ExternalLink className="w-3 h-3" />
                  </Link>
                </div>
                <DomainValuationEstimator />
              </TabsContent>
              <TabsContent value="tld">
                <div className="flex justify-end mb-2">
                  <Link to="/tools/tld-compare" className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1">
                    Open full page <ExternalLink className="w-3 h-3" />
                  </Link>
                </div>
                <TldComparisonTool />
              </TabsContent>
            </Tabs>
          </div>
        </main>
        <Footer />
      </div>
    </>
  );
};

export default Tools;
