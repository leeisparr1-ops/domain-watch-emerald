import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Search, Zap, TrendingUp, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Hero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16">
      {/* Background Effects */}
      <div className="absolute inset-0 pattern-grid opacity-30" />
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-primary/5 rounded-full blur-3xl" />

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mb-6"
          >
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass border border-primary/30 text-sm text-primary">
              <Zap className="w-4 h-4" />
              Real-time Domain Auction Monitoring
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-5xl md:text-7xl font-bold mb-6"
          >
            Discover Premium{" "}
            <span className="gradient-text">Domains</span> Before Anyone Else
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto"
          >
            Monitor GoDaddy auctions and closeouts in real-time. Set up pattern-based 
            alerts and never miss the perfect domain for your next project.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex flex-col sm:flex-row gap-4 justify-center mb-12"
          >
            <Link to="/signup">
              <Button variant="hero" size="xl">
                <Search className="w-5 h-5 mr-2" />
                Start Monitoring Free
              </Button>
            </Link>
            <Link to="/pricing">
              <Button variant="glass" size="xl">
                View Pricing
              </Button>
            </Link>
          </motion.div>

          {/* Feature Pills */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="flex flex-wrap justify-center gap-4"
          >
            {[
              { icon: Search, text: "Pattern Matching" },
              { icon: TrendingUp, text: "Live Auction Data" },
              { icon: Shield, text: "Secure & Private" },
            ].map((feature, index) => (
              <div
                key={index}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-secondary/50 text-secondary-foreground text-sm"
              >
                <feature.icon className="w-4 h-4 text-primary" />
                {feature.text}
              </div>
            ))}
          </motion.div>
        </div>

        {/* Floating Domain Cards */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="mt-16 max-w-5xl mx-auto"
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { domain: "crypto.io", price: "$2,450", bids: 12, time: "2h 15m" },
              { domain: "startup.dev", price: "$890", bids: 8, time: "45m" },
              { domain: "design.co", price: "$1,200", bids: 5, time: "4h 30m" },
            ].map((item, index) => (
              <motion.div
                key={index}
                whileHover={{ y: -5, scale: 1.02 }}
                className="p-4 rounded-xl glass border-glow"
              >
                <div className="font-mono text-lg text-primary mb-2">{item.domain}</div>
                <div className="flex justify-between text-sm">
                  <span className="text-foreground font-semibold">{item.price}</span>
                  <span className="text-muted-foreground">{item.bids} bids</span>
                </div>
                <div className="text-xs text-muted-foreground mt-2">
                  Ends in {item.time}
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
