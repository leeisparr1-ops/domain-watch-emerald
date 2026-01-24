import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Bell, Smartphone, Zap, Shield, Globe, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export function Hero() {
  const [domainCount, setDomainCount] = useState<number | null>(null);

  useEffect(() => {
    const fetchCount = async () => {
      try {
        // Avoid expensive COUNT(*) on large tables (can cause statement timeouts)
        const { count, error } = await supabase
          .from("auctions")
          .select("id", { count: "planned", head: true });

        if (error) throw error;
        setDomainCount(count ?? null);
      } catch {
        setDomainCount(null);
      }
    };

    fetchCount();
  }, []);

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16">
      {/* Background Effects */}
      <div className="absolute inset-0 pattern-grid opacity-30" />
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-primary/5 rounded-full blur-3xl" />

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mb-6"
          >
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass border border-primary/30 text-sm text-primary">
              <Globe className="w-4 h-4" />
              {domainCount ? `${domainCount.toLocaleString()}+ Domains Monitored` : 'Millions of Domains Monitored'}
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-5xl md:text-7xl font-bold mb-6"
          >
            Pattern-Based{" "}
            <span className="gradient-text">Domain Alerts</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto"
          >
            Set up patterns for the Domains you want and get instant notifications 
            when matching Domains become available. Never miss a Domain again.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex flex-col sm:flex-row gap-4 justify-center mb-12"
          >
            <Link to="/signup">
              <Button variant="hero" size="xl">
                <Bell className="w-5 h-5 mr-2" />
                Start Monitoring Free
              </Button>
            </Link>
            <Link to="/pricing">
              <Button variant="glass" size="xl">
                View Pricing
              </Button>
            </Link>
          </motion.div>

          {/* Feature Pills */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="flex flex-wrap justify-center gap-4"
          >
            {[
              { icon: Bell, text: "Custom Alert Frequency" },
              { icon: Smartphone, text: "Push Notifications" },
              { icon: Mail, text: "Email Notifications" },
              { icon: Zap, text: "Smart Pattern Matching" },
              { icon: Shield, text: "TLD & Price Filters" },
            ].map((feature, index) => (
              <div
                key={index}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-secondary/50 text-secondary-foreground text-sm"
              >
                <feature.icon className="w-4 h-4 text-primary" />
                {feature.text}
              </div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
}