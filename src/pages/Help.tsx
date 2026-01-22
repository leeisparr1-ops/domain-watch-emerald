import { Navbar } from "@/components/layout/Navbar";
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
  Target
} from "lucide-react";

export default function Help() {
  const gettingStartedSteps = [
    {
      icon: <Search className="w-6 h-6 text-primary" />,
      title: "1. Create Your First Pattern",
      description: "Go to the Dashboard and click 'Add Pattern'. Enter keywords like 'crypto', 'tech', or use wildcards like '*bank*' to match domains containing 'bank'."
    },
    {
      icon: <Bookmark className="w-6 h-6 text-primary" />,
      title: "2. Manage Saved Patterns",
      description: "Click 'Saved Patterns' on the Dashboard to view, rename, toggle, or delete your patterns. Pattern limits depend on your subscription plan."
    },
    {
      icon: <Bell className="w-6 h-6 text-primary" />,
      title: "3. Enable Alerts",
      description: "Click 'Alerts ON/OFF' next to 'Add Pattern' or go to Settings to enable push and email notifications when patterns match new domains."
    },
    {
      icon: <Filter className="w-6 h-6 text-primary" />,
      title: "4. Set Filters",
      description: "Use filters to narrow results by price range, TLD extension, and auction type to find domains that fit your budget."
    },
    {
      icon: <Target className="w-6 h-6 text-primary" />,
      title: "5. Review Matches",
      description: "Click the 'Matches' tab on the Dashboard to see all domains that matched your patterns. Use the bin icon to remove reviewed matches."
    },
    {
      icon: <Heart className="w-6 h-6 text-primary" />,
      title: "6. Save Favorites",
      description: "Found a great domain? Click the heart icon to save it to your favorites for easy access later."
    }
  ];

  const faqs = [
    {
      question: "What is a pattern?",
      answer: "A pattern is a search rule you create to find specific domains. You can use keywords, wildcards (*), or exact matches. For example, 'ai*' will match all domains starting with 'ai', while '*shop*' matches any domain containing 'shop'."
    },
    {
      question: "How do I view my pattern matches?",
      answer: "Click the 'Matches' tab on the Dashboard to see all domains that have matched your patterns. Results are grouped by pattern name. Use the bin icon to remove matches you've already reviewed."
    },
    {
      question: "How do I manage my saved patterns?",
      answer: "Click 'Saved Patterns' on the Dashboard. Here you can: 1) Toggle patterns on/off, 2) Rename patterns with the pencil icon, 3) Delete patterns with the trash icon."
    },
    {
      question: "How many patterns can I save?",
      answer: "Free plan: 2 patterns. Basic ($4.99/mo): 50 patterns. Advanced ($9.99/mo): 125 patterns. Upgrade anytime from the Pricing page."
    },
    {
      question: "How often are auctions updated?",
      answer: "Auctions sync every 6 hours. After each sync, your patterns are checked and notifications are sent immediately for any new matches."
    },
    {
      question: "What's the difference between 'Bid' and 'BuyNow' auctions?",
      answer: "'Bid' auctions let you compete with other buyers. 'BuyNow' domains have a fixed price for instant purchase."
    },
    {
      question: "How do I enable notifications?",
      answer: "Click 'Alerts ON/OFF' on the Dashboard or go to Settings → Notifications to configure push and email alerts."
    },
    {
      question: "Can I use ExpiredHawk on my phone?",
      answer: "Yes! Install ExpiredHawk as a PWA by clicking 'Add to Home Screen' in your browser for a native app-like experience with push notifications."
    },
    {
      question: "What do the pattern types mean?",
      answer: "'Contains' matches domains with your keyword anywhere. 'Starts with' matches domains beginning with your keyword. 'Ends with' matches domains ending with your keyword. 'Exact' requires an exact match."
    },
    {
      question: "How do I remove matches I've reviewed?",
      answer: "In the Matches tab, click the bin icon next to any domain to remove it from your matches list. This helps you keep track of domains you've already evaluated."
    },
    {
      question: "Why am I not receiving notifications?",
      answer: "Check that: 1) Alerts are enabled (Alerts ON on Dashboard), 2) Email is correct in Settings, 3) Pattern is enabled in Saved Patterns, 4) Check spam folder. Notifications are sent after each 6-hour sync."
    }
  ];

  return (
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
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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
                    <span className="font-medium">Check Email</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Daily digest emails summarize all matching domains found
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
  );
}
