import { Check, Smartphone, Bell, Zap, Loader2 } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { useSubscription } from "@/hooks/useSubscription";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { useState, useEffect } from "react";

const plans = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    description: "Get started with basic monitoring",
    features: [
      "30 monitoring patterns",
      "Email & push alerts",
      "Full auction data access",
      "All analysis tools included",
    ],
    cta: "Get Started",
    planKey: "free" as const,
    popular: false,
  },
  {
    name: "Basic",
    price: "$4.99",
    period: "/month",
    description: "For serious domain hunters",
    features: [
      "60 monitoring patterns",
      "Priority email & push alerts",
      "Full auction data access",
      "All analysis tools included",
    ],
    cta: "Subscribe Now",
    planKey: "basic" as const,
    popular: true,
  },
  {
    name: "Advanced",
    price: "$9.99",
    period: "/month",
    description: "Maximum monitoring power",
    features: [
      "120 monitoring patterns",
      "Priority email & push alerts",
      "Full auction data access",
      "All analysis tools included",
    ],
    cta: "Go Advanced",
    planKey: "advanced" as const,
    popular: false,
  },
];

export default function Pricing() {
  const { user } = useAuth();
  const { plan: currentPlan, subscribed, loading, createCheckout, openCustomerPortal } = useSubscription();
  const [processingPlan, setProcessingPlan] = useState<string | null>(null);
  const [searchParams] = useSearchParams();

  useEffect(() => {
    if (searchParams.get("canceled") === "true") {
      toast.info("Checkout was canceled");
    }
  }, [searchParams]);

  const handleSubscribe = async (planKey: "basic" | "advanced") => {
    if (!user) {
      toast.error("Please sign up or log in first");
      return;
    }

    setProcessingPlan(planKey);
    try {
      await createCheckout(planKey);
    } catch (error) {
      console.error("Checkout error:", error);
      toast.error("Failed to start checkout. Please try again.");
    } finally {
      setProcessingPlan(null);
    }
  };

  const handleManageSubscription = async () => {
    setProcessingPlan("manage");
    try {
      await openCustomerPortal();
    } catch (error) {
      console.error("Portal error:", error);
      toast.error("Failed to open subscription portal");
    } finally {
      setProcessingPlan(null);
    }
  };

  const renderButton = (plan: typeof plans[0]) => {
    const isCurrentPlan = currentPlan === plan.planKey;
    const isProcessing = processingPlan === plan.planKey;

    // Free plan
    if (plan.planKey === "free") {
      if (isCurrentPlan && user) {
        return (
          <Button variant="outline" className="w-full" disabled>
            Current Plan
          </Button>
        );
      }
      return (
        <Link to="/signup" className="w-full">
          <Button variant="outline" className="w-full">
            {plan.cta}
          </Button>
        </Link>
      );
    }

    // Paid plans
    if (!user) {
      return (
        <Link to="/signup" className="w-full">
          <Button variant={plan.popular ? "hero" : "outline"} className="w-full">
            {plan.cta}
          </Button>
        </Link>
      );
    }

    if (isCurrentPlan) {
      return (
        <Button 
          variant="outline" 
          className="w-full" 
          onClick={handleManageSubscription}
          disabled={processingPlan === "manage"}
        >
          {processingPlan === "manage" ? (
            <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Loading...</>
          ) : (
            "Manage Subscription"
          )}
        </Button>
      );
    }

    return (
      <Button
        variant={plan.popular ? "hero" : "outline"}
        className="w-full"
        onClick={() => handleSubscribe(plan.planKey as "basic" | "advanced")}
        disabled={isProcessing || loading}
      >
        {isProcessing ? (
          <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Processing...</>
        ) : subscribed ? (
          "Switch Plan"
        ) : (
          plan.cta
        )}
      </Button>
    );
  };

  return (
    <>
      <Helmet>
        <title>Pricing - ExpiredHawk Domain Monitoring Plans</title>
        <meta name="description" content="Start free with 30 patterns. Upgrade to Basic ($4.99/mo, 60 patterns) or Advanced ($9.99/mo, 120 patterns) for more monitoring power." />
        <link rel="canonical" href="https://expiredhawk.com/pricing" />
      </Helmet>
    <div className="min-h-screen bg-background">
      <Navbar />
      <section className="pt-32 pb-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">Simple, Transparent <span className="gradient-text">Pricing</span></h1>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Start free and upgrade for more patterns and instant mobile alerts.
            </p>
          </div>

          {/* Key selling point banner */}
          <div className="flex flex-wrap justify-center gap-6 mb-12 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100">
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
          </div>

          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {plans.map((plan, i) => {
              const isCurrentPlan = currentPlan === plan.planKey && user;
              
              return (
                <div 
                  key={i} 
                  className={`p-8 rounded-2xl glass border ${
                    isCurrentPlan 
                      ? "border-primary ring-2 ring-primary/30" 
                      : plan.popular 
                        ? "border-primary glow-primary" 
                        : "border-border"
                  } flex flex-col relative animate-in fade-in slide-in-from-bottom-4 duration-500`}
                  style={{ animationDelay: `${i * 100}ms` }}
                >
                  {isCurrentPlan && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs font-semibold px-3 py-1 rounded-full">
                      YOUR PLAN
                    </span>
                  )}
                  {plan.popular && !isCurrentPlan && (
                    <span className="text-xs font-semibold text-primary mb-4 block">MOST POPULAR</span>
                  )}
                  {isCurrentPlan && <div className="h-4" />}
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
                  {renderButton(plan)}
                </div>
              );
            })}
          </div>

          {/* Install CTA */}
          <div className="mt-16 text-center p-8 rounded-2xl glass border border-primary/30 max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 delay-300">
            <Smartphone className="w-12 h-12 text-primary mx-auto mb-4" />
            <h3 className="text-xl font-bold mb-2">Get Alerts on Your Phone</h3>
            <p className="text-muted-foreground mb-4">
              Install ExpiredHawk on your home screen for instant push notifications when domains matching your patterns become available.
            </p>
            <p className="text-sm text-muted-foreground">
              Tap the share button in your browser and select "Add to Home Screen"
            </p>
          </div>
        </div>
      </section>
      <Footer />
    </div>
    </>
  );
}
