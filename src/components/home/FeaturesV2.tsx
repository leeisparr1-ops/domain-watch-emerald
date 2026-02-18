import { forwardRef } from "react";
import { Search, Smartphone, Shield, Globe, Zap, Mail } from "lucide-react";
import { motion } from "framer-motion";

const features = [
  { icon: Search, title: "Smart Pattern Builder", description: "Simple filters — 'starts with', 'ends with', 'contains'. Add TLD and price limits." },
  { icon: Smartphone, title: "Push Notifications", description: "Instant alerts on your phone when a match appears — even with browser closed." },
  { icon: Mail, title: "Email Alerts", description: "Digest emails on your schedule — every 2, 4, or 6 hours. Adjust in Settings." },
  { icon: Zap, title: "Automatic Matching", description: "Patterns re-checked after every sync. New matches appear instantly." },
  { icon: Shield, title: "Secure & Private", description: "Your patterns and preferences are private. Only you see what you track." },
  { icon: Globe, title: "Fresh Auction Data", description: "Listings sync every 6 hours from auctions, closeouts, and expiring inventory." },
];

export const FeaturesV2 = forwardRef<HTMLElement>(function FeaturesV2(_, ref) {
  return (
    <section ref={ref} className="py-24">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Everything You Need to <span className="gradient-text">Catch Domains</span>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Set your patterns once, then let ExpiredHawk watch around the clock.
          </p>
        </motion.div>

        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.06 }}
                className="flex gap-4 items-start"
              >
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Icon className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-foreground mb-0.5">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
});
