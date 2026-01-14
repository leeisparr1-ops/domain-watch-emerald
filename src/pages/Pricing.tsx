import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";

const plans = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    description: "Perfect for trying out DomainPulse",
    features: ["2 search patterns", "Daily email alerts", "Basic auction data", "7-day history"],
    cta: "Get Started",
    popular: false,
  },
  {
    name: "Basic",
    price: "$4.99",
    period: "/month",
    description: "For serious domain hunters",
    features: ["10 search patterns", "Real-time alerts", "Full auction data", "30-day history", "Priority support", "Export data"],
    cta: "Subscribe Now",
    popular: true,
  },
];

export default function Pricing() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <section className="pt-32 pb-20">
        <div className="container mx-auto px-4">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-16">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">Simple, Transparent <span className="gradient-text">Pricing</span></h1>
            <p className="text-muted-foreground max-w-xl mx-auto">Start free and upgrade when you need more power.</p>
          </motion.div>
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {plans.map((plan, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
                className={`p-8 rounded-2xl glass border ${plan.popular ? "border-primary glow-primary" : "border-border"}`}>
                {plan.popular && <span className="text-xs font-semibold text-primary mb-4 block">MOST POPULAR</span>}
                <h3 className="text-2xl font-bold">{plan.name}</h3>
                <div className="mt-4 mb-2"><span className="text-4xl font-bold">{plan.price}</span><span className="text-muted-foreground">{plan.period}</span></div>
                <p className="text-muted-foreground mb-6">{plan.description}</p>
                <ul className="space-y-3 mb-8">
                  {plan.features.map((f, j) => <li key={j} className="flex items-center gap-2 text-sm"><Check className="w-4 h-4 text-primary" />{f}</li>)}
                </ul>
                <Link to="/signup"><Button variant={plan.popular ? "hero" : "outline"} className="w-full">{plan.cta}</Button></Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
      <Footer />
    </div>
  );
}
