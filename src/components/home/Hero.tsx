import { Link } from "react-router-dom";
import { Bell, Smartphone, Zap, Globe, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export function Hero() {
  const [domainCount, setDomainCount] = useState<number | null>(null);

  useEffect(() => {
    const fetchCount = async () => {
      try {
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
          <div className="mb-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass border border-primary/30 text-sm text-primary">
              <Globe className="w-4 h-4" />
              {domainCount ? `${domainCount.toLocaleString()}+ Domains Monitored` : 'Thousands of Domains Monitored'}
            </span>
          </div>

          <h1 className="text-5xl md:text-7xl font-bold mb-6 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100">
            Pattern-Based{" "}
            <span className="gradient-text">Domain Alerts</span>
          </h1>

          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 delay-200">
            Get alerted when expiring domain names matching your criteria become 
            available at auction or closeout.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-300">
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
          </div>

          {/* Feature Pills */}
          <div className="flex flex-wrap justify-center gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-[400ms]">
            {[
              { icon: Bell, text: "Custom Alert Frequency" },
              { icon: Smartphone, text: "Push Notifications" },
              { icon: Mail, text: "Email Notifications" },
              { icon: Zap, text: "Smart Pattern Matching" },
            ].map((feature, index) => (
              <div
                key={index}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-secondary/50 text-secondary-foreground text-sm"
              >
                <feature.icon className="w-4 h-4 text-primary" />
                {feature.text}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
