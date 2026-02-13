import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Mic, Sparkles, DollarSign, List, Globe2, Award } from "lucide-react";
import { PronounceabilityScorer } from "@/components/tools/PronounceabilityScorer";
import { NameGenerator } from "@/components/tools/NameGenerator";
import { DomainValuationEstimator } from "@/components/tools/DomainValuationEstimator";
import { BulkPronounceabilityChecker } from "@/components/tools/BulkPronounceabilityChecker";
import { TldComparisonTool } from "@/components/tools/TldComparisonTool";
import { BrandabilityScorer } from "@/components/tools/BrandabilityScorer";

const Tools = () => {
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
            <p className="text-muted-foreground mb-8">
              Free tools to help you find and evaluate the perfect domain name. We are actively improving these — feedback welcome!
            </p>

            <Tabs defaultValue="brandability" className="w-full">
              <TabsList className="grid w-full grid-cols-2 md:grid-cols-6 mb-6 h-auto">
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

              <TabsContent value="brandability">
                <BrandabilityScorer />
              </TabsContent>
              <TabsContent value="pronounceability">
                <PronounceabilityScorer />
              </TabsContent>
              <TabsContent value="bulk">
                <BulkPronounceabilityChecker />
              </TabsContent>
              <TabsContent value="generator">
                <NameGenerator />
              </TabsContent>
              <TabsContent value="valuation">
                <DomainValuationEstimator />
              </TabsContent>
              <TabsContent value="tld">
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
