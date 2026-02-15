import { forwardRef } from "react";
import { Search, Smartphone, Shield, Globe, Zap, Mail } from "lucide-react";

const features = [
  {
    icon: Search,
    title: "Smart Pattern Builder",
    description: "Use simple filters like 'starts with', 'ends with', or 'contains'. Add TLD and price limits to match exactly what you want.",
  },
  {
    icon: Smartphone,
    title: "Push Notifications",
    description: "Get instant alerts on your phone when a matching domain appears — even when your browser is closed.",
  },
  {
    icon: Mail,
    title: "Email Alerts",
    description: "Receive email digests on your schedule — every 2, 4, or 6 hours. Adjust the frequency in Settings.",
  },
  {
    icon: Zap,
    title: "Automatic Matching",
    description: "After every data sync, your patterns are re-checked automatically. New matches appear in your dashboard instantly.",
  },
  {
    icon: Shield,
    title: "Secure & Private",
    description: "Your patterns and preferences are private. Only you can see what you are tracking.",
  },
  {
    icon: Globe,
    title: "Fresh Auction Data",
    description: "Domain listings sync every 6 hours from auctions, closeouts, and expiring inventory sources.",
  },
];

export const Features = forwardRef<HTMLElement>(function Features(_, ref) {
  return (
    <section ref={ref} className="py-20">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Everything You Need to <span className="gradient-text">Catch Domains</span>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Set your patterns once, then let ExpiredHawk watch around the clock and alert you the moment a match drops.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <div
                key={index}
                className="p-6 rounded-2xl bg-card border border-border hover:border-primary/30 transition-colors"
              >
                <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center mb-4">
                  <Icon className="w-6 h-6 text-primary-foreground" />
              </div>
              <h3 className="text-xl font-semibold mb-2 text-foreground">
                {feature.title}
              </h3>
              <p className="text-muted-foreground">
                {feature.description}
              </p>
            </div>
            );
          })}
        </div>
      </div>
    </section>
  );
});
