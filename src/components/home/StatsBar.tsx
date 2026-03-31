import { Database, Clock, Globe2, Zap } from "lucide-react";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M+`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K+`;
  return `${n}+`;
}

export function StatsBar() {
  const [domainCount, setDomainCount] = useState<string>("1.1M+");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await supabase.rpc("get_auction_count");
        if (!error && data && data > 100_000 && !cancelled) {
          setDomainCount(formatCount(data));
        }
      } catch {
        // keep default
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const stats = [
    { icon: Database, value: domainCount, label: "Domains Tracked" },
    { icon: Clock, value: "6hr", label: "Sync Frequency" },
    { icon: Globe2, value: "45+", label: "TLDs Tracked" },
    { icon: Zap, value: "<1min", label: "Match Time" },
  ];

  return (
    <section className="py-8 border-y border-border bg-card/50">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8"
        >
          {stats.map((stat, i) => {
            const Icon = stat.icon;
            return (
              <div key={i} className="flex items-center gap-3 justify-center">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Icon className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <div className="text-xl font-bold text-foreground">{stat.value}</div>
                  <div className="text-xs text-muted-foreground">{stat.label}</div>
                </div>
              </div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
