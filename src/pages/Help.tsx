import { Navbar } from "@/components/layout/Navbar";
import { Helmet } from "react-helmet-async";
import { Footer } from "@/components/layout/Footer";
import { 
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Search, 
  Bell, 
  Filter, 
  Heart, 
  Settings, 
  Mail, 
  Smartphone,
  HelpCircle,
  BookOpen,
  MessageCircle,
  Bookmark,
  Pencil,
  Target,
  ShieldAlert,
  Wrench
} from "lucide-react";

export default function Help() {
  const gettingStartedSteps = [
    {
      icon: <Search className="w-6 h-6 text-primary" />,
      title: "1. Create Your First Pattern",
      description: "Go to the Dashboard and click 'Add Pattern'. Choose 'Starts with', 'Ends with', 'Contains', or custom regex. Add TLD filters and max price limits."
    },
    {
      icon: <Bookmark className="w-6 h-6 text-primary" />,
      title: "2. Manage Saved Patterns",
      description: "Click 'Saved Patterns' to view, rename, toggle, or delete patterns. Use 'Clear All' (with confirmation) to remove all at once."
    },
    {
      icon: <Bell className="w-6 h-6 text-primary" />,
      title: "3. Configure Notifications",
      description: "Go to Settings to enable push/email notifications and set your preferred frequency (every 2, 4, or 6 hours)."
    },
    {
      icon: <Filter className="w-6 h-6 text-primary" />,
      title: "4. Use Pattern Filters",
      description: "Each pattern can have TLD filters, price limits, character length (min/max), and domain age (years) to find exactly what you need."
    },
    {
      icon: <Target className="w-6 h-6 text-primary" />,
      title: "5. Review Matches",
      description: "Click the 'Matches' tab to see domains grouped by pattern. Use 'Clear All' to reset your match history after reviewing."
    },
    {
      icon: <Heart className="w-6 h-6 text-primary" />,
      title: "6. Save Favorites",
      description: "Click the heart icon to save domains. Use 'Clear All Favorites' (with confirmation) to reset your list."
    },
    {
      icon: <ShieldAlert className="w-6 h-6 text-primary" />,
      title: "7. Check Spam Risk",
      description: "Click any domain to view its spam risk level. Domains are checked against industry-standard blacklists for spam and phishing status."
    },
    {
      icon: <Wrench className="w-6 h-6 text-primary" />,
      title: "8. Explore Domain Tools",
      description: "Visit the Tools page (Beta) for utilities like Pronounceability Scorer, AI Name Generator, Domain Valuation Estimator, Bulk Checker, and TLD Comparison."
    }
  ];

  const faqs = [
    {
      question: "What is a pattern?",
      answer: "A pattern is a search rule to find specific domains. Use 'Starts with', 'Ends with', 'Contains', or custom regex. Each pattern can include TLD filters, price limits, character length, and domain age."
    },
    {
      question: "How do I view my pattern matches?",
      answer: "Click the 'Matches' tab on the Dashboard to see all domains grouped by pattern. Use 'Clear All' (with confirmation) to reset your match history after reviewing."
    },
    {
      question: "How do I manage my saved patterns?",
      answer: "Click 'Saved Patterns' on the Dashboard. Toggle patterns on/off, rename with the pencil icon, delete individually, or use the trash icon to clear all patterns (with confirmation)."
    },
    {
      question: "How many patterns can I save?",
      answer: "Free plan: 5 patterns. Basic ($4.99/mo): 50 patterns. Advanced ($9.99/mo): 125 patterns. Upgrade anytime from the Pricing page."
    },
    {
      question: "How often are auctions updated?",
      answer: "Auctions sync every 6 hours. After each sync, your patterns are automatically checked and notifications sent based on your frequency preference."
    },
    {
      question: "How do I control notification frequency?",
      answer: "Go to Settings → Notifications and choose your preferred interval: every 2, 4, or 6 hours. This applies to both email and push notifications."
    },
    {
      question: "What's the difference between 'Bid' and 'BuyNow' auctions?",
      answer: "'Bid' auctions let you compete with other buyers. 'BuyNow' domains have a fixed price for instant purchase."
    },
    {
      question: "How do I enable notifications?",
      answer: "Go to Settings → Notifications to enable push and/or email alerts. Set your notification email and choose your preferred frequency (2, 4, or 6 hours)."
    },
    {
      question: "Can I use ExpiredHawk on my phone?",
      answer: "Yes! Install ExpiredHawk as a PWA by clicking 'Add to Home Screen' in your browser for a native app-like experience with push notifications."
    },
    {
      question: "What TLD filters are available?",
      answer: "Popular extensions (.com, .net, .org), tech-focused (.io, .ai, .dev, .app), and country codes (.co, .me, .tv). Set per-pattern in Add Pattern."
    },
    {
      question: "How do I filter by character length?",
      answer: "When creating a pattern, use the 'Chars' inputs to set min/max character limits. For example, set min 4 and max 6 to find only short domain names."
    },
    {
      question: "How do I filter by domain age?",
      answer: "Use the 'Age' inputs (in years) when creating a pattern. Set a minimum age to find established domains, or a maximum to find newer registrations."
    },
    {
      question: "How do I set price limits on patterns?",
      answer: "When creating a pattern, use the 'Max Price' slider to set a limit. Only domains at or below your max price will trigger matches and notifications."
    },
    {
      question: "Why am I not receiving notifications?",
      answer: "Check: 1) Alerts enabled in Settings, 2) Email correct, 3) Pattern enabled in Saved Patterns, 4) Spam folder. Notifications respect your frequency setting (2/4/6 hours)."
    },
    {
      question: "What does the spam risk badge mean?",
      answer: "The spam risk badge shows if a domain is listed on blacklists. Green (Clean) = no issues. Yellow (Low Risk) = minor indicators. Orange (Medium Risk) = found on spam blacklists. Red (High Risk) = flagged for phishing/malware. Click any domain to see full risk details."
    },
    {
      question: "How is spam risk checked?",
      answer: "Domains are checked against industry-standard blacklists via DNS lookups. Results are cached for 7 days to ensure fast loading. Risk checks happen when you view domain details."
    },
    {
      question: "What are the Domain Tools?",
      answer: "The Tools page (Beta) offers five utilities: Pronounceability Scorer rates how easy a domain is to say, AI Name Generator suggests brandable names, Domain Valuation Estimator scores market value, Bulk Pronounceability Checker ranks up to 50 domains at once, and TLD Comparison shows pricing and trust scores across extensions."
    },
    {
      question: "Do I need an account to use the Tools?",
      answer: "Yes, all domain tools require you to be signed in. Create a free account to access the Pronounceability Scorer, AI Name Generator, Valuation Estimator, Bulk Checker, and TLD Comparison Tool."
    },
    {
      question: "Why are the Tools marked as Beta?",
      answer: "The tools are actively being improved based on user feedback. Beta means the features work but may receive updates, new scoring algorithms, or additional capabilities over time."
    }
  ];
  return (
    <>
      <Helmet>
        <title>Help & Getting Started - ExpiredHawk</title>
        <meta name="description" content="Learn how to use ExpiredHawk to monitor domain patterns, set up alerts, and never miss the perfect domain. FAQs and getting started guide." />
        <link rel="canonical" href="https://expiredhawk.com/help" />
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          "mainEntity": faqs.map(faq => ({
            "@type": "Question",
            "name": faq.question,
            "acceptedAnswer": { "@type": "Answer", "text": faq.answer }
          }))
        })}</script>
      </Helmet>
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4 max-w-4xl">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
              <HelpCircle className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-4xl font-bold mb-4">Help & Getting Started</h1>
            <p className="text-muted-foreground text-lg">
              Learn how to use ExpiredHawk to find your perfect domain
            </p>
          </div>

          {/* Getting Started */}
          <section className="mb-12">
            <div className="flex items-center gap-2 mb-6">
              <BookOpen className="w-6 h-6 text-primary" />
              <h2 className="text-2xl font-semibold">Getting Started</h2>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {gettingStartedSteps.map((step, index) => (
                <Card key={index} className="bg-card/50 border-border/50">
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-3">
                      {step.icon}
                      <CardTitle className="text-lg">{step.title}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-muted-foreground">
                      {step.description}
                    </CardDescription>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>

          {/* Quick Tips */}
          <section className="mb-12">
            <div className="flex items-center gap-2 mb-6">
              <Smartphone className="w-6 h-6 text-primary" />
              <h2 className="text-2xl font-semibold">Quick Tips</h2>
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <Card className="bg-primary/5 border-primary/20">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2 mb-2">
                    <Bookmark className="w-5 h-5 text-primary" />
                    <span className="font-medium">Organize Patterns</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Rename your saved patterns to easily identify them later
                  </p>
                </CardContent>
              </Card>
              <Card className="bg-primary/5 border-primary/20">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2 mb-2">
                    <Bell className="w-5 h-5 text-primary" />
                    <span className="font-medium">Stay Notified</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Enable push notifications for instant alerts on mobile devices
                  </p>
                </CardContent>
              </Card>
              <Card className="bg-primary/5 border-primary/20">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2 mb-2">
                    <Settings className="w-5 h-5 text-primary" />
                    <span className="font-medium">Fine-Tune Filters</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Use price limits and TLD filters to reduce noise in your alerts
                  </p>
                </CardContent>
              </Card>
              <Card className="bg-primary/5 border-primary/20">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2 mb-2">
                    <Mail className="w-5 h-5 text-primary" />
                    <span className="font-medium">Set Frequency</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Choose 2, 4, or 6-hour notification intervals in Settings
                  </p>
                </CardContent>
              </Card>
              <Card className="bg-primary/5 border-primary/20">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2 mb-2">
                    <Wrench className="w-5 h-5 text-primary" />
                    <span className="font-medium">Try Domain Tools</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Score pronounceability, generate names, and estimate domain values
                  </p>
                </CardContent>
              </Card>
            </div>
          </section>

          {/* FAQ */}
          <section className="mb-12">
            <div className="flex items-center gap-2 mb-6">
              <MessageCircle className="w-6 h-6 text-primary" />
              <h2 className="text-2xl font-semibold">Frequently Asked Questions</h2>
            </div>
            <Accordion type="single" collapsible className="w-full">
              {faqs.map((faq, index) => (
                <AccordionItem key={index} value={`item-${index}`}>
                  <AccordionTrigger className="text-left">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </section>

          {/* Contact Support */}
          <section>
            <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
              <CardContent className="pt-6 text-center">
                <h3 className="text-xl font-semibold mb-2">Still Need Help?</h3>
                <p className="text-muted-foreground mb-4">
                  Can't find what you're looking for? Our support team is here to help.
                </p>
                <a 
                  href="mailto:support@expiredhawk.com" 
                  className="inline-flex items-center gap-2 text-primary hover:underline"
                >
                  <Mail className="w-4 h-4" />
                  support@expiredhawk.com
                </a>
              </CardContent>
            </Card>
          </section>
        </div>
      </main>

      <Footer />
    </div>
    </>
  );
}
