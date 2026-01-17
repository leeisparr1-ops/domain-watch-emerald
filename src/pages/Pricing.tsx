import { motion } from "framer-motion";
import { Check, Smartphone, Bell, Zap } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";

const plans = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    description: "Get started with basic monitoring",
    features: [
      "2 monitoring patterns",
      "Daily email alerts",
      "Basic auction data",
      "7-day history",
    ],
    cta: "Get Started",
    popular: false,
  },
  {
    name: "Pro",
    price: "$9.99",
    period: "/month",
    description: "For serious domain hunters",
    features: [
      "5 monitoring patterns",
      "Instant mobile push alerts",
      "Full auction data",
      "30-day history",
      "Price change notifications",
      "Favorite domain alerts",
    ],
    cta: "Subscribe Now",
    popular: true,
  },
  {
    name: "Business",
    price: "$24.99",
    period: "/month",
    description: "Maximum monitoring power",
    features: [
      "Unlimited patterns",
      "Priority mobile alerts",
      "Full auction data",
      "90-day history",
      "API access",
      "Custom alert rules",
      "Priority support",
      "Export data (CSV/JSON)",
    ],
    cta: "Go Business",
    popular: false,
  },
];

export default function Pricing() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <section className="pt-32 pb-20">
        <div className="container mx-auto px-4">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">Simple, Transparent <span className="gradient-text">Pricing</span></h1>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Start free and upgrade for more patterns and instant mobile alerts.
            </p>
          </motion.div>

          {/* Key selling point banner */}
          <motion.div 
            initial={{ opacity: 0, y: 10 }} 
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="flex flex-wrap justify-center gap-6 mb-12"
          >
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Bell className="w-5 h-5 text-primary" />
              <span>Pattern-based monitoring</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Smartphone className="w-5 h-5 text-primary" />
              <span>Mobile push notifications</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Zap className="w-5 h-5 text-primary" />
              <span>Instant alerts to your phone</span>
            </div>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {plans.map((plan, i) => (
              <motion.div 
                key={i} 
                initial={{ opacity: 0, y: 20 }} 
                animate={{ opacity: 1, y: 0 }} 
                transition={{ delay: i * 0.1 }}
                className={`p-8 rounded-2xl glass border ${plan.popular ? "border-primary glow-primary" : "border-border"} flex flex-col`}
              >
                {plan.popular && <span className="text-xs font-semibold text-primary mb-4 block">MOST POPULAR</span>}
                <h3 className="text-2xl font-bold">{plan.name}</h3>
                <div className="mt-4 mb-2">
                  <span className="text-4xl font-bold">{plan.price}</span>
                  <span className="text-muted-foreground">{plan.period}</span>
                </div>
                <p className="text-muted-foreground mb-6">{plan.description}</p>
                <ul className="space-y-3 mb-8 flex-1">
                  {plan.features.map((f, j) => (
                    <li key={j} className="flex items-center gap-2 text-sm">
                      <Check className="w-4 h-4 text-primary flex-shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link to="/signup">
                  <Button variant={plan.popular ? "hero" : "outline"} className="w-full">
                    {plan.cta}
                  </Button>
                </Link>
              </motion.div>
            ))}
          </div>

          {/* Install CTA */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mt-16 text-center p-8 rounded-2xl glass border border-primary/30 max-w-2xl mx-auto"
          >
            <Smartphone className="w-12 h-12 text-primary mx-auto mb-4" />
            <h3 className="text-xl font-bold mb-2">Get Alerts on Your Phone</h3>
            <p className="text-muted-foreground mb-4">
              Install ExpiredHawk on your home screen for instant push notifications when domains matching your patterns become available.
            </p>
            <p className="text-sm text-muted-foreground">
              Tap the share button in your browser and select "Add to Home Screen"
            </p>
          </motion.div>
        </div>
      </section>
      <Footer />
    </div>
  );
}