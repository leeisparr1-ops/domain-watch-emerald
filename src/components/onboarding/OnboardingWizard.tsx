import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Bell, Search, Target, ArrowRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useUserPatterns } from "@/hooks/useUserPatterns";
import { useNavigate } from "react-router-dom";

const ONBOARDING_KEY = "eh_onboarding_completed";

interface PatternPreset {
  label: string;
  pattern: string;
  pattern_type: "regex" | "structure" | "pronounceable";
  description: string;
  category: "structure" | "pronounceable" | "tech_ai" | "business" | "lifestyle" | "finance" | "modifiers";
}

const PRESET_PATTERNS: PatternPreset[] = [
  // Structure
  { label: "LLL", pattern: "^[a-z]{3}$", pattern_type: "structure", description: "3-letter domains", category: "structure" },
  { label: "LLLL", pattern: "^[a-z]{4}$", pattern_type: "structure", description: "4-letter domains", category: "structure" },
  { label: "LLLLL", pattern: "^[a-z]{5}$", pattern_type: "structure", description: "5-letter domains", category: "structure" },
  { label: "6-Letter", pattern: "^[a-z]{6}$", pattern_type: "structure", description: "6-letter domains", category: "structure" },
  // Pronounceable
  { label: "CVCV", pattern: "^[bcdfghjklmnpqrstvwxyz][aeiou][bcdfghjklmnpqrstvwxyz][aeiou]$", pattern_type: "pronounceable", description: "4-letter pronounceable (e.g. rare, core)", category: "pronounceable" },
  { label: "CVVC", pattern: "^[bcdfghjklmnpqrstvwxyz][aeiou]{2}[bcdfghjklmnpqrstvwxyz]$", pattern_type: "pronounceable", description: "4-letter with vowel pair (e.g. been, cool)", category: "pronounceable" },
  { label: "CVCVC", pattern: "^[bcdfghjklmnpqrstvwxyz][aeiou][bcdfghjklmnpqrstvwxyz][aeiou][bcdfghjklmnpqrstvwxyz]$", pattern_type: "pronounceable", description: "5-letter pronounceable (e.g. pixel)", category: "pronounceable" },
  { label: "VCV", pattern: "^[aeiou][bcdfghjklmnpqrstvwxyz][aeiou]$", pattern_type: "pronounceable", description: "3-letter vowel-led (e.g. ado, ace)", category: "pronounceable" },
  // Tech & AI
  { label: "AI", pattern: "^ai", pattern_type: "regex", description: "Starts with 'ai'", category: "tech_ai" },
  { label: "Tech", pattern: "tech", pattern_type: "regex", description: "Contains 'tech'", category: "tech_ai" },
  { label: "Data", pattern: "data", pattern_type: "regex", description: "Contains 'data'", category: "tech_ai" },
  { label: "Cloud", pattern: "cloud", pattern_type: "regex", description: "Contains 'cloud'", category: "tech_ai" },
  { label: "App", pattern: "app", pattern_type: "regex", description: "Contains 'app'", category: "tech_ai" },
  { label: "Crypto", pattern: "crypto", pattern_type: "regex", description: "Contains 'crypto'", category: "tech_ai" },
  { label: "Agent", pattern: "agent", pattern_type: "regex", description: "Contains 'agent'", category: "tech_ai" },
  { label: "IT", pattern: "^it|it$", pattern_type: "regex", description: "Starts or ends with 'it'", category: "tech_ai" },
  // Business
  { label: "Group", pattern: "group", pattern_type: "regex", description: "Contains 'group'", category: "business" },
  { label: "Capital", pattern: "capital", pattern_type: "regex", description: "Contains 'capital'", category: "business" },
  { label: "Club", pattern: "club", pattern_type: "regex", description: "Contains 'club'", category: "business" },
  { label: "Studio", pattern: "studio", pattern_type: "regex", description: "Contains 'studio'", category: "business" },
  { label: "Solutions", pattern: "solutions", pattern_type: "regex", description: "Contains 'solutions'", category: "business" },
  { label: "Services", pattern: "services", pattern_type: "regex", description: "Contains 'services'", category: "business" },
  // Lifestyle
  { label: "Home", pattern: "home", pattern_type: "regex", description: "Contains 'home'", category: "lifestyle" },
  { label: "House", pattern: "house", pattern_type: "regex", description: "Contains 'house'", category: "lifestyle" },
  { label: "Health", pattern: "health", pattern_type: "regex", description: "Contains 'health'", category: "lifestyle" },
  { label: "Life", pattern: "life", pattern_type: "regex", description: "Contains 'life'", category: "lifestyle" },
  { label: "Shop", pattern: "shop", pattern_type: "regex", description: "Contains 'shop'", category: "lifestyle" },
  { label: "Pay", pattern: "pay", pattern_type: "regex", description: "Contains 'pay'", category: "lifestyle" },
  // Modifiers
  { label: "My", pattern: "^my", pattern_type: "regex", description: "Starts with 'my'", category: "modifiers" },
  { label: "New", pattern: "^new", pattern_type: "regex", description: "Starts with 'new'", category: "modifiers" },
  { label: "Your", pattern: "^your", pattern_type: "regex", description: "Starts with 'your'", category: "modifiers" },
  { label: "Us", pattern: "us$", pattern_type: "regex", description: "Ends with 'us'", category: "modifiers" },
];

const CATEGORY_META: Record<string, { title: string; color: string; activeColor: string }> = {
  structure: {
    title: "Structure",
    color: "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/30 dark:hover:bg-emerald-500/20",
    activeColor: "bg-emerald-500/20 text-emerald-600 border-emerald-500/50 ring-1 ring-emerald-500/20 dark:bg-emerald-500/30 dark:text-emerald-300 dark:border-emerald-400/50",
  },
  pronounceable: {
    title: "Pronounceable",
    color: "bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100 dark:bg-purple-500/10 dark:text-purple-400 dark:border-purple-500/30 dark:hover:bg-purple-500/20",
    activeColor: "bg-purple-500/20 text-purple-600 border-purple-500/50 ring-1 ring-purple-500/20 dark:bg-purple-500/30 dark:text-purple-300 dark:border-purple-400/50",
  },
  tech_ai: {
    title: "Tech & AI",
    color: "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/30 dark:hover:bg-amber-500/20",
    activeColor: "bg-amber-500/20 text-amber-600 border-amber-500/50 ring-1 ring-amber-500/20 dark:bg-amber-500/30 dark:text-amber-300 dark:border-amber-400/50",
  },
  business: {
    title: "Business",
    color: "bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/30 dark:hover:bg-rose-500/20",
    activeColor: "bg-rose-500/20 text-rose-600 border-rose-500/50 ring-1 ring-rose-500/20 dark:bg-rose-500/30 dark:text-rose-300 dark:border-rose-400/50",
  },
  lifestyle: {
    title: "Lifestyle",
    color: "bg-teal-50 text-teal-700 border-teal-200 hover:bg-teal-100 dark:bg-teal-500/10 dark:text-teal-400 dark:border-teal-500/30 dark:hover:bg-teal-500/20",
    activeColor: "bg-teal-500/20 text-teal-600 border-teal-500/50 ring-1 ring-teal-500/20 dark:bg-teal-500/30 dark:text-teal-300 dark:border-teal-400/50",
  },
  modifiers: {
    title: "Modifiers",
    color: "bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100 dark:bg-indigo-500/10 dark:text-indigo-400 dark:border-indigo-500/30 dark:hover:bg-indigo-500/20",
    activeColor: "bg-indigo-500/20 text-indigo-600 border-indigo-500/50 ring-1 ring-indigo-500/20 dark:bg-indigo-500/30 dark:text-indigo-300 dark:border-indigo-400/50",
  },
};

export function OnboardingWizard() {
  const { user } = useAuth();
  const { patterns, addPattern, hasPatterns } = useUserPatterns();
  const navigate = useNavigate();
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(0);
  const [addedPatterns, setAddedPatterns] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!user) return;
    const completed = localStorage.getItem(ONBOARDING_KEY);
    if (completed) return;
    const timer = setTimeout(() => {
      if (!hasPatterns) setVisible(true);
    }, 1500);
    return () => clearTimeout(timer);
  }, [user, hasPatterns]);

  const dismiss = () => {
    setVisible(false);
    localStorage.setItem(ONBOARDING_KEY, "1");
  };

  const handleAddPreset = async (preset: PatternPreset) => {
    if (addedPatterns.has(preset.pattern)) return;
    const result = await addPattern({
      pattern: preset.pattern,
      pattern_type: preset.pattern_type,
      description: preset.description,
    });
    if (result) {
      setAddedPatterns((prev) => new Set(prev).add(preset.pattern));
    }
  };

  const handleFinish = () => {
    if (addedPatterns.size > 0) {
      setStep(2);
    } else {
      setStep(2);
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

    // Step 1: Chip-style pattern picker
    <motion.div key="pick-pattern" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
      <h3 className="text-lg font-bold text-foreground mb-1">Quick Add Patterns</h3>
      <p className="text-sm text-muted-foreground mb-4">Tap chips to add patterns. Pick as many as you like.</p>

      <div className="space-y-3 mb-4 max-h-[280px] overflow-y-auto pr-1">
        {(["structure", "pronounceable", "tech_ai", "business", "lifestyle", "modifiers"] as const).map((cat) => {
          const meta = CATEGORY_META[cat];
          const presets = PRESET_PATTERNS.filter((p) => p.category === cat);
          return (
            <div key={cat}>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">{meta.title}</p>
              <div className="flex flex-wrap gap-1.5">
                {presets.map((preset) => {
                  const added = addedPatterns.has(preset.pattern) || patterns.some((p) => p.pattern === preset.pattern);
                  return (
                    <button
                      key={preset.pattern}
                      onClick={() => handleAddPreset(preset)}
                      disabled={added}
                      title={preset.description}
                      className={`px-3 py-1.5 rounded-full text-[13px] font-medium border transition-all ${
                        added ? meta.activeColor + " cursor-default opacity-80" : meta.color + " cursor-pointer"
                      }`}
                    >
                      {added && <CheckCircle2 className="w-3 h-3 inline mr-1 -mt-0.5" />}
                      {preset.label}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex gap-2">
        <Button onClick={handleFinish} className="flex-1">
          {addedPatterns.size > 0 ? `Continue (${addedPatterns.size} added)` : "Continue"}
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
      <Button variant="ghost" size="sm" onClick={() => setStep(2)} className="w-full text-muted-foreground mt-1">
        Skip — I'll create my own
      </Button>
    </motion.div>,

    // Step 2: Done
    <motion.div key="done" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
      <div className="text-center">
        <CheckCircle2 className="w-12 h-12 text-primary mx-auto mb-3" />
        <h3 className="text-lg font-bold text-foreground mb-1">You're all set!</h3>
        <p className="text-sm text-muted-foreground mb-4">
          {addedPatterns.size > 0
            ? `${addedPatterns.size} pattern${addedPatterns.size > 1 ? "s" : ""} added! We'll scan millions of domains and alert you when there's a match.`
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
