import { Link } from "react-router-dom";
import { Bell, ArrowRight, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { useState } from "react";

export function HeroV2() {
  const [showVideo, setShowVideo] = useState(false);

  return (
    <section className="relative min-h-[50vh] lg:min-h-[60vh] flex items-center overflow-hidden pt-20 pb-12">
      {/* Subtle grid background */}
      <div className="absolute inset-0 pattern-grid opacity-[0.08]" />
      
      {/* Gradient orbs */}
      <div className="absolute top-1/3 -left-32 w-[500px] h-[500px] rounded-full bg-primary/5 blur-3xl" />
      <div className="absolute bottom-1/4 -right-32 w-[400px] h-[400px] rounded-full bg-primary/3 blur-3xl" />

      <div className="container mx-auto px-4 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col items-center text-center max-w-3xl mx-auto"
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
            Set your rules once — we'll watch millions of expiring domains and ping you when something good drops. Simple as that.
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

          <p className="text-sm text-muted-foreground mb-10">
            Free tier includes 30 patterns · No credit card required
          </p>

          {/* Tutorial Video Preview */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="w-full max-w-2xl"
          >
            <div
              className="relative rounded-xl border border-border bg-card/80 backdrop-blur-sm overflow-hidden cursor-pointer group shadow-lg hover:shadow-xl transition-shadow"
              onClick={() => setShowVideo(!showVideo)}
            >
              {showVideo ? (
                <div className="aspect-video bg-muted flex items-center justify-center">
                  <p className="text-muted-foreground text-sm">Tutorial video coming soon</p>
                </div>
              ) : (
                <div className="aspect-video bg-gradient-to-br from-muted/80 to-muted relative">
                  {/* Mock dashboard preview with blurred domains */}
                  <div className="absolute inset-0 p-4 sm:p-6 flex flex-col gap-3">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-3 h-3 rounded-full bg-destructive/60" />
                      <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
                      <div className="w-3 h-3 rounded-full bg-green-500/60" />
                      <div className="ml-2 h-5 w-48 rounded bg-muted-foreground/10" />
                    </div>
                    {/* Mock pattern row */}
                    <div className="flex items-center gap-3 p-2.5 rounded-lg bg-background/60 backdrop-blur-sm border border-border/50">
                      <div className="w-2 h-2 rounded-full bg-primary" />
                      <span className="text-xs font-mono text-foreground/70">Pattern: *cloud*.com</span>
                      <div className="ml-auto px-2 py-0.5 rounded-full bg-primary/20 text-primary text-[10px] font-medium">3 matches</div>
                    </div>
                    {/* Mock results - blurred */}
                    <div className="flex-1 space-y-2 blur-[2px]">
                      {["██████████.com", "████████.com", "██████████.net"].map((d, i) => (
                        <div key={i} className="flex items-center gap-3 p-2 rounded bg-background/40 border border-border/30 text-xs">
                          <span className="text-foreground/50 font-mono">{d}</span>
                          <span className="ml-auto text-muted-foreground">${(Math.random() * 100 + 10).toFixed(0)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  {/* Play button overlay */}
                  <div className="absolute inset-0 flex items-center justify-center bg-background/20 group-hover:bg-background/10 transition-colors">
                    <div className="w-16 h-16 rounded-full bg-primary/90 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                      <Play className="w-7 h-7 text-primary-foreground ml-1" />
                    </div>
                  </div>
                </div>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              See how easy it is to set up your first pattern in under 60 seconds
            </p>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
