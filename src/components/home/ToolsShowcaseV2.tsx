import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Award, Sparkles, Globe2, List, BrainCircuit, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

const tools = [
  {
    icon: BrainCircuit,
    title: "AI Domain Advisor",
    description: "Get AI-powered investment advice — niche analysis, flip potential, and suggested buy price.",
    badge: "New",
    featured: true,
  },
  {
    icon: Sparkles,
    title: "AI Name Generator",
    description: "Generate investor-grade names with live availability checks and trademark screening.",
    badge: "AI",
    featured: true,
  },
  {
    icon: Award,
    title: "Brandability Scorer",
    description: "Score any domain 0–100 across six dimensions: pronounceability, memorability, length, and more.",
    featured: false,
  },
  {
    icon: List,
    title: "Bulk Portfolio Analyzer",
    description: "Upload up to 50 domains. Get scores, valuations, and trademark risk in a sortable table.",
    featured: false,
  },
  {
    icon: Globe2,
    title: "TLD Comparison",
    description: "Compare 45+ extensions — liquidity grades, spam risk, and investor-grade recommendations.",
    featured: false,
  },
];

export function ToolsShowcaseV2() {
  return (
    <section className="py-24 bg-secondary/20">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Powerful <span className="gradient-text">Domain Tools</span>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Go beyond alerts. Analyze, generate, and value domains with tools built for investors.
          </p>
        </motion.div>

        {/* Bento grid */}
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 mb-10">
          {tools.map((tool, i) => {
            const Icon = tool.icon;
            const isFeatured = tool.featured;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className={`relative p-5 rounded-2xl bg-card border border-border hover:border-primary/30 transition-all group ${
                  isFeatured ? "lg:col-span-3" : "lg:col-span-2"
                }`}
              >
                {tool.badge && (
                  <span className="absolute top-3 right-3 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                    {tool.badge}
                  </span>
                )}
                <div className="w-10 h-10 rounded-lg gradient-primary flex items-center justify-center mb-3">
                  <Icon className="w-5 h-5 text-primary-foreground" />
                </div>
                <h3 className="text-lg font-semibold mb-1 text-foreground">{tool.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{tool.description}</p>
              </motion.div>
            );
          })}
        </div>

        <div className="text-center">
          <Link to="/tools">
            <Button variant="hero" size="lg">
              Try All Tools Free
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
          <p className="text-xs text-muted-foreground mt-3">No signup required</p>
        </div>
      </div>
    </section>
  );
}
