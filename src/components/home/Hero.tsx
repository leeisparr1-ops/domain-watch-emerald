import { Link } from "react-router-dom";
import { Bell, Smartphone, Zap, Mail, Check, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";

const MOCK_ALERTS = [
  { domain: "cloudpay.com", price: "$1,240", tld: ".com", age: "14yr" },
  { domain: "shipfast.io", price: "$320", tld: ".io", age: "6yr" },
  { domain: "mintdata.com", price: "$2,180", tld: ".com", age: "11yr" },
  { domain: "boxhub.co", price: "$85", tld: ".co", age: "3yr" },
];

function AlertCard() {
  const [visibleIdx, setVisibleIdx] = useState(0);
  const [entering, setEntering] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setEntering(false);
      setTimeout(() => {
        setVisibleIdx((i) => (i + 1) % MOCK_ALERTS.length);
        setEntering(true);
      }, 400);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const alert = MOCK_ALERTS[visibleIdx];

  return (
    <div className="relative w-full max-w-sm mx-auto">
      {/* Glow behind card */}
      <div className="absolute inset-0 rounded-2xl bg-primary/10 blur-2xl scale-110" />

      <div className="relative rounded-2xl border border-border bg-card p-5 shadow-lg">
        {/* Header */}
        <div className="flex items-center gap-2 mb-4">
          <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          <span className="text-xs font-medium text-primary">Live Alert Feed</span>
        </div>

        {/* Alert item */}
        <div
          className={`transition-all duration-400 ${entering ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2"}`}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-primary" />
              <span className="font-mono text-sm font-semibold text-foreground">{alert.domain}</span>
            </div>
            <span className="text-xs font-semibold text-primary">{alert.price}</span>
          </div>

          <div className="flex gap-2 mb-3">
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground font-medium">
              {alert.tld}
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground font-medium">
              Age: {alert.age}
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium flex items-center gap-0.5">
              <TrendingUp className="w-2.5 h-2.5" /> Match
            </span>
          </div>
        </div>

        {/* Pattern row */}
        <div className="border-t border-border pt-3 flex items-center justify-between">
          <div className="text-[11px] text-muted-foreground">
            Pattern: <span className="font-mono text-foreground">*pay*, *hub*, *data*</span>
          </div>
          <Check className="w-3.5 h-3.5 text-primary" />
        </div>
      </div>
    </div>
  );
}

export function Hero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16">
      {/* Background */}
      <div className="absolute inset-0 pattern-grid opacity-20" />
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full opacity-50" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-primary/3 rounded-full opacity-50" />

      <div className="container mx-auto px-4 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center max-w-6xl mx-auto">
          {/* Left — copy */}
          <div className="text-center lg:text-left">
            <h1 className="text-5xl md:text-7xl font-bold mb-6 animate-fade-in">
              Find Expiring{" "}
              <span className="gradient-text">Domains Fast</span>
            </h1>

            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto lg:mx-0 animate-fade-in">
              Set your criteria once. We scan thousands of expiring domains daily
              and alert you the moment a match appears — by email or push notification.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start mb-10 animate-fade-in">
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
            <div className="flex flex-wrap justify-center lg:justify-start gap-3 animate-fade-in">
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

          {/* Right — animated mock UI */}
          <div className="hidden lg:block animate-fade-in">
            <AlertCard />
          </div>
        </div>
      </div>
    </section>
  );
}
