import { Link } from "react-router-dom";
import { Bell, Smartphone, Zap, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Hero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16">
      {/* Lightweight Background - removed expensive blur-3xl effects */}
      <div className="absolute inset-0 pattern-grid opacity-20" />
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full opacity-50" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-primary/3 rounded-full opacity-50" />

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-4xl mx-auto text-center">

          <h1 className="text-5xl md:text-7xl font-bold mb-6 animate-fade-in">
            Find Expiring{" "}
            <span className="gradient-text">Domains Fast</span>
          </h1>

          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto animate-fade-in">
            Set your criteria once. We scan millions of expiring domains daily
            and alert you the moment a match appears — by email or push notification.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12 animate-fade-in">
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
          <div className="flex flex-wrap justify-center gap-4 animate-fade-in">
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
