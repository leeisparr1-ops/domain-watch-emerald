import { Link } from "react-router-dom";
import { Bell, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";

const sampleDomains = [
  { name: "cloudbank.com", price: "$12", tld: ".com", age: "14yr" },
  { name: "fastpay.io", price: "$8", tld: ".io", age: "6yr" },
  { name: "greenlogic.net", price: "$5", tld: ".net", age: "9yr" },
  { name: "dataforge.com", price: "$22", tld: ".com", age: "18yr" },
  { name: "snaptravel.co", price: "$15", tld: ".co", age: "7yr" },
  { name: "vaultkey.com", price: "$31", tld: ".com", age: "11yr" },
  { name: "aibridge.io", price: "$19", tld: ".io", age: "3yr" },
  { name: "pixelcraft.dev", price: "$6", tld: ".dev", age: "4yr" },
  { name: "solarpeak.com", price: "$9", tld: ".com", age: "12yr" },
  { name: "mintlayer.net", price: "$4", tld: ".net", age: "8yr" },
];

export function HeroV2() {
  const [visibleDomains, setVisibleDomains] = useState(sampleDomains.slice(0, 5));
  const [currentIndex, setCurrentIndex] = useState(5);

  useEffect(() => {
    const interval = setInterval(() => {
      setVisibleDomains((prev) => {
        const next = [...prev.slice(1), sampleDomains[currentIndex % sampleDomains.length]];
        return next;
      });
      setCurrentIndex((i) => i + 1);
    }, 2500);
    return () => clearInterval(interval);
  }, [currentIndex]);

  return (
    <section className="relative min-h-[90vh] flex items-center overflow-hidden pt-20 pb-12">
      {/* Subtle grid background */}
      <div className="absolute inset-0 pattern-grid opacity-[0.08]" />
      
      {/* Gradient orbs */}
      <div className="absolute top-1/3 -left-32 w-[500px] h-[500px] rounded-full bg-primary/5 blur-3xl" />
      <div className="absolute bottom-1/4 -right-32 w-[400px] h-[400px] rounded-full bg-primary/3 blur-3xl" />

      <div className="container mx-auto px-4 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left — Copy */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium mb-6">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              Scanning 2.7M+ domains daily
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-[1.1] mb-6 tracking-tight">
              Never Miss an{" "}
              <span className="gradient-text">Expiring Domain</span>{" "}
              Again
            </h1>

            <p className="text-lg text-muted-foreground mb-8 max-w-lg leading-relaxed">
              Set your criteria once. We scan millions of expiring domains daily 
              and alert you the moment a match appears — by email or push notification.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 mb-8">
              <Link to="/signup">
                <Button variant="hero" size="xl" className="w-full sm:w-auto">
                  <Bell className="w-5 h-5 mr-2" />
                  Start Monitoring Free
                </Button>
              </Link>
              <Link to="/pricing">
                <Button variant="outline" size="xl" className="w-full sm:w-auto">
                  View Pricing
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </div>

            <p className="text-sm text-muted-foreground">
              Free tier includes 30 patterns · No credit card required
            </p>
          </motion.div>

          {/* Right — Domain Ticker */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="hidden lg:block"
          >
            <div className="relative">
              {/* Card frame */}
              <div className="rounded-2xl border border-border bg-card/80 shadow-xl overflow-hidden">
                {/* Header bar */}
                <div className="px-5 py-3 border-b border-border bg-card flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-primary/60" />
                    <span className="text-sm font-medium text-foreground">Live Domain Matches</span>
                  </div>
                  <span className="text-xs text-muted-foreground font-mono">Pattern: *bank*, *pay*</span>
                </div>

                {/* Domain list */}
                <div className="divide-y divide-border">
                  {visibleDomains.map((domain, i) => (
                    <motion.div
                      key={`${domain.name}-${currentIndex}-${i}`}
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: i * 0.05 }}
                      className="px-5 py-3.5 flex items-center justify-between hover:bg-secondary/30 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-2 h-2 rounded-full bg-primary" />
                        <span className="font-mono text-sm font-medium text-foreground">{domain.name}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-xs text-muted-foreground">{domain.age}</span>
                        <span className="text-xs px-2 py-0.5 rounded bg-secondary text-secondary-foreground font-mono">{domain.tld}</span>
                        <span className="text-sm font-semibold text-primary">{domain.price}</span>
                      </div>
                    </motion.div>
                  ))}
                </div>

                {/* Footer */}
                <div className="px-5 py-2.5 border-t border-border bg-card/50 flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Updated 2 min ago</span>
                  <span className="text-xs text-primary font-medium">View all matches →</span>
                </div>
              </div>

              {/* Decorative glow */}
              <div className="absolute -inset-4 rounded-3xl bg-primary/5 -z-10 blur-xl" />
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
