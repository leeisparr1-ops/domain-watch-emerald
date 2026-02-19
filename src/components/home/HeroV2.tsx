import { Link } from "react-router-dom";
import { Bell, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

export function HeroV2() {
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
      </div>
    </section>
  );
}
