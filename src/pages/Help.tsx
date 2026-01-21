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
  Pencil
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
      description: "Your patterns appear in the 'Saved Patterns' section. You can rename them by clicking the pencil icon, toggle them on/off, or delete them. Pattern limits depend on your plan."
    },
    {
      icon: <Filter className="w-6 h-6 text-primary" />,
      title: "3. Set Filters",
      description: "Optionally filter by price range, TLD (.com, .net, etc.), and more to narrow down your search to domains that fit your budget."
    },
    {
      icon: <Bell className="w-6 h-6 text-primary" />,
      title: "4. Enable Notifications",
      description: "Turn on email and/or push notifications in Settings to get alerted immediately when matching domains are found."
    },
    {
      icon: <Heart className="w-6 h-6 text-primary" />,
      title: "5. Save Favorites",
      description: "Found a great domain? Click the heart icon to save it to your favorites for easy access later."
    }
  ];

  const faqs = [
    {
      question: "What is a pattern?",
      answer: "A pattern is a search rule you create to find specific domains. You can use keywords, wildcards (*), or exact matches. For example, 'ai*' will match all domains starting with 'ai', while '*shop*' matches any domain containing 'shop'."
    },
    {
      question: "How do I manage my saved patterns?",
      answer: "After adding a pattern, it appears in the 'Saved Patterns' section on the Dashboard. Here you can: 1) Toggle patterns on/off with the toggle switch, 2) Rename patterns by clicking the pencil icon, 3) Delete patterns with the trash icon. The number of patterns you can save depends on your subscription plan."
    },
    {
      question: "How many patterns can I save?",
      answer: "The number of patterns depends on your plan: Free plan allows 2 patterns, Basic plan ($4.99/mo) allows 50 patterns, and Advanced plan ($9.99/mo) allows 125 patterns. You can upgrade at any time from the Pricing page."
    },
    {
      question: "How often are domain auctions updated?",
      answer: "Our system automatically syncs with GoDaddy Auctions every 6 hours, ensuring you have access to the latest expired and expiring domains."
    },
    {
      question: "What's the difference between 'Bid' and 'BuyNow' auctions?",
      answer: "'Bid' auctions allow you to place competitive bids against other buyers, while 'BuyNow' domains have a fixed price for instant purchase."
    },
    {
      question: "How do I enable email notifications?",
      answer: "Go to Settings → Notifications, enter your email address, and toggle on 'Email Notifications'. You can test it with the 'Send Test' button."
    },
    {
      question: "Can I use ExpiredHawk on my phone?",
      answer: "Yes! ExpiredHawk is a Progressive Web App (PWA). You can install it on your phone by clicking 'Add to Home Screen' in your browser menu for a native app-like experience."
    },
    {
      question: "What do the pattern types mean?",
      answer: "'Contains' matches domains containing your keyword anywhere. 'Starts with' matches domains beginning with your keyword. 'Ends with' matches domains ending with your keyword. 'Exact' requires an exact domain name match."
    },
    {
      question: "How do I rename a pattern?",
      answer: "In the 'Saved Patterns' section on the Dashboard, click the pencil icon next to the pattern you want to rename. Type your new name and press Enter or click the checkmark to save."
    },
    {
      question: "How do I delete a pattern?",
      answer: "In the 'Saved Patterns' section on the Dashboard, click the trash icon next to the pattern you want to remove."
    },
    {
      question: "Why am I not receiving notifications?",
      answer: "Check that: 1) Notifications are enabled in Settings, 2) Your email is correct, 3) The pattern is enabled (toggle is on in Saved Patterns), 4) Check your spam folder for emails."
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
