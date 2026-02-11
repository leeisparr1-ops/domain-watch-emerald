import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Mic, Sparkles } from "lucide-react";
import { PronounceabilityScorer } from "@/components/tools/PronounceabilityScorer";
import { NameGenerator } from "@/components/tools/NameGenerator";

const Tools = () => {
  return (
    <>
      <Helmet>
        <title>Domain Tools - ExpiredHawk</title>
        <meta name="description" content="Free domain tools: pronounceability scorer and AI-powered brandable name generator for domainers." />
      </Helmet>
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto px-4 pt-24 pb-16">
          <div className="max-w-3xl mx-auto">
            <h1 className="text-3xl md:text-4xl font-bold mb-2 text-foreground">
              Domain <span className="gradient-text">Tools</span>
            </h1>
            <p className="text-muted-foreground mb-8">
              Free tools to help you find and evaluate the perfect domain name.
            </p>

            <Tabs defaultValue="pronounceability" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="pronounceability" className="flex items-center gap-2">
                  <Mic className="w-4 h-4" />
                  Pronounceability Scorer
                </TabsTrigger>
                <TabsTrigger value="generator" className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  Name Generator
                </TabsTrigger>
              </TabsList>

              <TabsContent value="pronounceability">
                <PronounceabilityScorer />
              </TabsContent>
              <TabsContent value="generator">
                <NameGenerator />
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
