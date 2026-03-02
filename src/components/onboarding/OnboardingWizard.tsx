import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Bell, Search, Target, ArrowRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useUserPatterns } from "@/hooks/useUserPatterns";
import { useNavigate } from "react-router-dom";

const ONBOARDING_KEY = "eh_onboarding_completed";

const EXAMPLE_PATTERNS = [
  { pattern: "^[a-z]{4,6}$", description: "Short 4-6 letter .com names", pattern_type: "regex" as const },
  { pattern: "ai|tech|dev|app", description: "AI / Tech keywords", pattern_type: "regex" as const },
  { pattern: "^[a-z]{3}$", description: "Three-letter domains (LLL)", pattern_type: "regex" as const },
];

export function OnboardingWizard() {
  const { user } = useAuth();
  const { patterns, addPattern, hasPatterns } = useUserPatterns();
  const navigate = useNavigate();
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(0);
  const [addedPattern, setAddedPattern] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    const completed = localStorage.getItem(ONBOARDING_KEY);
    if (completed) return;
    // Show after a short delay for new users with no patterns
    const timer = setTimeout(() => {
      if (!hasPatterns) setVisible(true);
    }, 1500);
    return () => clearTimeout(timer);
  }, [user, hasPatterns]);

  const dismiss = () => {
    setVisible(false);
    localStorage.setItem(ONBOARDING_KEY, "1");
  };

  const handleAddExample = async (example: typeof EXAMPLE_PATTERNS[0]) => {
    const result = await addPattern({
      pattern: example.pattern,
      pattern_type: example.pattern_type,
      description: example.description,
    });
    if (result) {
      setAddedPattern(example.pattern);
      setTimeout(() => setStep(2), 600);
    }
  };

  if (!visible) return null;

  const steps = [
    // Step 0: Welcome
    <motion.div key="welcome" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
          <Target className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-foreground">Welcome to ExpiredHawk!</h3>
          <p className="text-sm text-muted-foreground">Let's set up your first domain alert in 30 seconds.</p>
        </div>
      </div>
      <div className="space-y-3 mb-6">
        <div className="flex items-start gap-3">
          <Search className="w-4 h-4 text-primary mt-0.5 shrink-0" />
          <p className="text-sm text-muted-foreground">Create patterns that describe the domains you're looking for</p>
        </div>
        <div className="flex items-start gap-3">
          <Bell className="w-4 h-4 text-primary mt-0.5 shrink-0" />
          <p className="text-sm text-muted-foreground">Get notified by email or push when a match appears at auction</p>
        </div>
      </div>
      <Button onClick={() => setStep(1)} className="w-full">
        Create Your First Pattern
        <ArrowRight className="w-4 h-4 ml-2" />
      </Button>
    </motion.div>,

    // Step 1: Pick an example pattern
    <motion.div key="pick-pattern" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
      <h3 className="text-lg font-bold text-foreground mb-1">Quick Start Patterns</h3>
      <p className="text-sm text-muted-foreground mb-4">Tap one to add it instantly, or create your own later.</p>
      <div className="space-y-2 mb-4">
        {EXAMPLE_PATTERNS.map((example) => (
          <button
            key={example.pattern}
            onClick={() => handleAddExample(example)}
            disabled={addedPattern === example.pattern}
            className="w-full text-left p-3 rounded-lg border border-border hover:border-primary/50 hover:bg-primary/5 transition-all disabled:opacity-50 group"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">{example.description}</p>
                <code className="text-xs text-muted-foreground font-mono">{example.pattern}</code>
              </div>
              {addedPattern === example.pattern ? (
                <CheckCircle2 className="w-5 h-5 text-primary" />
              ) : (
                <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
              )}
            </div>
          </button>
        ))}
      </div>
      <Button variant="ghost" size="sm" onClick={() => setStep(2)} className="w-full text-muted-foreground">
        Skip — I'll create my own
      </Button>
    </motion.div>,

    // Step 2: Done
    <motion.div key="done" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
      <div className="text-center">
        <CheckCircle2 className="w-12 h-12 text-primary mx-auto mb-3" />
        <h3 className="text-lg font-bold text-foreground mb-1">You're all set!</h3>
        <p className="text-sm text-muted-foreground mb-4">
          {addedPattern
            ? "Your pattern is live. We'll scan millions of domains and alert you when there's a match."
            : "Head to Settings to enable email or push alerts, and create patterns from the dashboard."}
        </p>
        <div className="flex flex-col gap-2">
          <Button onClick={() => { dismiss(); navigate("/settings"); }}>
            <Bell className="w-4 h-4 mr-2" />
            Set Up Alerts
          </Button>
          <Button variant="outline" onClick={dismiss}>
            Go to Dashboard
          </Button>
        </div>
      </div>
    </motion.div>,
  ];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative w-full max-w-md bg-card border border-border rounded-xl shadow-xl p-6"
        >
          <button
            onClick={dismiss}
            className="absolute top-3 right-3 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Progress dots */}
          <div className="flex justify-center gap-1.5 mb-5">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className={`w-2 h-2 rounded-full transition-colors ${
                  i === step ? "bg-primary" : i < step ? "bg-primary/40" : "bg-muted"
                }`}
              />
            ))}
          </div>

          <AnimatePresence mode="wait">
            {steps[step]}
          </AnimatePresence>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
