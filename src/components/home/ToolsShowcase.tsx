import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Award,
  Mic,
  Sparkles,
  DollarSign,
  Globe2,
  List,
  BrainCircuit,
  ArrowRight,
} from "lucide-react";

const tools = [
  {
    icon: BrainCircuit,
    title: "AI Domain Advisor",
    description:
      "Get AI-powered investment advice on any domain — niche analysis, flip potential, and suggested buy price.",
    badge: "New",
  },
  {
    icon: Sparkles,
    title: "AI Name Generator",
    description:
      "Generate investor-grade names tuned to 2026 trends, with live availability checks and trademark screening.",
    badge: "AI",
  },
  {
    icon: Award,
    title: "Brandability Scorer",
    description:
      "Score any domain 0–100 across six dimensions: pronounceability, memorability, length, and more.",
  },
  {
    icon: DollarSign,
    title: "Valuation Estimator",
    description:
      "Instant aftermarket value estimates powered by niche detection, word quality, and TLD demand signals.",
  },
  {
    icon: List,
    title: "Bulk Portfolio Analyzer",
    description:
      "Paste or upload up to 50 domains. Get scores, valuations, and trademark risk in a sortable table.",
  },
  {
    icon: Globe2,
    title: "TLD Comparison",
    description:
      "Compare 45+ extensions side by side — liquidity grades, spam risk, and investor-grade recommendations.",
  },
];

export function ToolsShowcase() {
  return (
    <section className="py-20 bg-secondary/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Powerful <span className="gradient-text">Domain Tools</span>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Go beyond alerts. Analyze, generate, and value domains with tools built specifically for investors and flippers.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 max-w-5xl mx-auto mb-10">
          {tools.map((tool, i) => {
            const Icon = tool.icon;
            return (
              <div
                key={i}
                className="relative p-5 rounded-2xl bg-card border border-border hover:border-primary/30 transition-colors group"
              >
                {tool.badge && (
                  <span className="absolute top-3 right-3 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                    {tool.badge}
                  </span>
                )}
                <div className="w-10 h-10 rounded-lg gradient-primary flex items-center justify-center mb-3">
                  <Icon className="w-5 h-5 text-primary-foreground" />
                </div>
                <h3 className="text-lg font-semibold mb-1 text-foreground">
                  {tool.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {tool.description}
                </p>
              </div>
            );
          })}
        </div>

        <div className="text-center">
          <Link to="/signup">
            <Button variant="hero" size="lg">
              Try All Tools Free
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
