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
  Target,
  ShieldAlert,
  Wrench,
  BrainCircuit,
  Briefcase,
  BarChart3,
  ArrowRight,
} from "lucide-react";

export default function Help() {
  const gettingStartedSteps = [
    {
      icon: <Search className="w-6 h-6 text-primary" />,
      title: "1. Create Your First Pattern",
      description: "Go to the Dashboard and click 'Add Pattern'. Choose 'Starts with', 'Ends with', 'Contains', or custom regex. Add TLD filters, price limits, character length, and domain age filters."
    },
    {
      icon: <Bookmark className="w-6 h-6 text-primary" />,
      title: "2. Manage Saved Patterns",
      description: "Click 'Saved Patterns' to view, rename, toggle, or delete patterns. Use 'Clear All' (with confirmation) to remove all at once."
    },
    {
      icon: <Bell className="w-6 h-6 text-primary" />,
      title: "3. Configure Notifications",
      description: "Go to Settings to enable push and/or email notifications. Set your preferred frequency (every 2, 4, or 6 hours). Install as a PWA for the best push notification experience."
    },
    {
      icon: <Target className="w-6 h-6 text-primary" />,
      title: "4. Review Matches",
      description: "Click the 'Matches' tab to see domains grouped by pattern. Use 'Clear All' to reset your match history after reviewing."
    },
    {
      icon: <BrainCircuit className="w-6 h-6 text-primary" />,
      title: "5. AI Domain Advisor",
      description: "Analyze any domain with AI-powered investment advice. Get buy/sell verdicts, flip scores (0–10), buyer personas, and ask follow-up questions in a conversational chat."
    },
    {
      icon: <Briefcase className="w-6 h-6 text-primary" />,
      title: "6. Portfolio Tracker",
      description: "Track your domain investments with purchase prices, renewal costs, sale prices, and P&L. Import domains in bulk via CSV or add them individually."
    },
    {
      icon: <Wrench className="w-6 h-6 text-primary" />,
      title: "7. Domain Tools Suite",
      description: "Use the full analysis toolkit: Brandability Scorer (radar chart), Valuation Estimator, Pronounceability Scorer, AI Name Generator, Bulk Checker (CSV/TXT), TLD Comparison, and the unified Domain Report Card."
    },
    {
      icon: <ShieldAlert className="w-6 h-6 text-primary" />,
      title: "8. Check Spam Risk",
      description: "Click any domain to view its spam risk level. Domains are checked against industry-standard blacklists for spam and phishing status."
    },
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
      question: "How many patterns can I save?",
      answer: "Free plan: 5 patterns. Basic ($4.99/mo): 50 patterns. Advanced ($9.99/mo): 125 patterns. Upgrade anytime from the Pricing page."
    },
    {
      question: "How often are auctions updated?",
      answer: "Auctions sync every 3 hours automatically. After each sync, your patterns are checked and notifications sent based on your frequency preference."
    },
    {
      question: "How do I control notification frequency?",
      answer: "Go to Settings → Notifications and choose your preferred interval: every 2, 4, or 6 hours. This applies to both email and push notifications."
    },
    {
      question: "What is the AI Domain Advisor?",
      answer: "The AI Domain Advisor analyzes any domain and provides investment-grade insights: buy/sell verdict, flip score (0–10 gauge), end-user value vs. max acquisition price, buyer persona, strengths, risks, and niche analysis. You can ask follow-up questions in a conversational chat."
    },
    {
      question: "How does tool chaining work?",
      answer: "After an AI analysis, use the 'Next Steps' buttons to pass the domain to other tools — Score Brandability, Pronounceability, Generate Variants, or Compare TLDs. The domain is automatically pre-filled."
    },
    {
      question: "What is the Portfolio Tracker?",
      answer: "The Portfolio Tracker lets you manage your domain investments. Track purchase price, renewal costs (with real TLD pricing hints), sale prices, and tags. View P&L stats and import domains in bulk via CSV."
    },
    {
      question: "Can I get one-click analysis from alerts?",
      answer: "Yes! When you receive a pattern match notification, click it to open the AI Domain Advisor with the matched domain pre-filled for instant analysis."
    },
    {
      question: "What's the difference between 'Bid' and 'BuyNow' auctions?",
      answer: "'Bid' auctions let you compete with other buyers. 'BuyNow' domains have a fixed price for instant purchase."
    },
    {
      question: "Can I use ExpiredHawk on my phone?",
      answer: "Yes! Install ExpiredHawk as a PWA by clicking 'Add to Home Screen' in your browser. This gives you a native app-like experience with push notifications. For best results, disable battery optimization for your browser."
    },
    {
      question: "Why am I not receiving push notifications when the browser is closed?",
      answer: "Some Android devices aggressively kill background processes. To fix: 1) Install ExpiredHawk as a PWA (Add to Home Screen), 2) Disable battery optimization for Chrome (Settings → Apps → Chrome → Battery → Unrestricted), 3) On Samsung, disable 'Put unused apps to sleep' for Chrome."
    },
    {
      question: "What TLD filters are available?",
      answer: "Popular extensions (.com, .net, .org), tech-focused (.io, .ai, .dev, .app), and country codes (.co, .me, .tv). Set per-pattern in Add Pattern."
    },
    {
      question: "What does the spam risk badge mean?",
      answer: "Green (Clean) = no issues. Yellow (Low Risk) = minor indicators. Orange (Medium Risk) = found on spam blacklists. Red (High Risk) = flagged for phishing/malware. Click any domain to see full risk details."
    },
    {
      question: "How do I filter by character length or domain age?",
      answer: "When creating a pattern, use the 'Chars' inputs for min/max character limits and 'Age' inputs (in years) for domain age. For example, set min age 5 to find established domains."
    },
    {
      question: "What are the Domain Tools?",
      answer: "The Tools suite includes: AI Domain Advisor (investment analysis with chat), Brandability Scorer (radar chart with 6 dimensions), Valuation Estimator (trend-aware pricing), Pronounceability Scorer, AI Name Generator, Bulk Checker (CSV/TXT upload), TLD Comparison (45+ extensions with investor grades), and the unified Domain Report Card."
    },
    {
      question: "Do I need an account to use the Tools?",
      answer: "Yes, all domain tools require you to be signed in. Create a free account to access the full analysis suite."
    },
  ];

  return (
    <>
      <Helmet>
        <title>Help & Getting Started - ExpiredHawk</title>
        <meta name="description" content="Learn how to use ExpiredHawk to monitor domain patterns, set up alerts, analyze domains with AI, and track your portfolio. FAQs and getting started guide." />
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
              Learn how to use ExpiredHawk to find, analyze, and invest in domains
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
                    <BrainCircuit className="w-5 h-5 text-primary" />
                    <span className="font-medium">Ask the AI</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Use the AI Domain Advisor for instant investment analysis with follow-up chat
                  </p>
                </CardContent>
              </Card>
              <Card className="bg-primary/5 border-primary/20">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2 mb-2">
                    <ArrowRight className="w-5 h-5 text-primary" />
                    <span className="font-medium">Chain Tools</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    After AI analysis, click Next Steps to score brandability, estimate value, and more
                  </p>
                </CardContent>
              </Card>
              <Card className="bg-primary/5 border-primary/20">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2 mb-2">
                    <Bell className="w-5 h-5 text-primary" />
                    <span className="font-medium">Install as PWA</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Add to Home Screen for reliable push notifications even when the browser is closed
                  </p>
                </CardContent>
              </Card>
              <Card className="bg-primary/5 border-primary/20">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2 mb-2">
                    <Briefcase className="w-5 h-5 text-primary" />
                    <span className="font-medium">Track Investments</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Use the Portfolio to log purchases, renewals, and sales with automatic P&L
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
                    Use price limits, TLD filters, character length, and domain age to reduce noise
                  </p>
                </CardContent>
              </Card>
              <Card className="bg-primary/5 border-primary/20">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2 mb-2">
                    <BarChart3 className="w-5 h-5 text-primary" />
                    <span className="font-medium">Report Card</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Get a 9-dimension snapshot of any domain with the Domain Report Card
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