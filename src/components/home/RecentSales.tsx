import { motion } from "framer-motion";
import { TrendingUp, Clock, ExternalLink } from "lucide-react";

const recentSales = [
  { domain: "crypto.com", price: "$12,000,000", date: "12h ago", change: "+15%" },
  { domain: "voice.ai", price: "$350,000", date: "18h ago", change: "+8%" },
  { domain: "music.io", price: "$125,000", date: "24h ago", change: "+12%" },
  { domain: "tech.dev", price: "$45,000", date: "28h ago", change: "+5%" },
  { domain: "startup.co", price: "$32,000", date: "32h ago", change: "+22%" },
  { domain: "brand.app", price: "$28,500", date: "36h ago", change: "+18%" },
  { domain: "cloud.io", price: "$22,000", date: "40h ago", change: "+10%" },
  { domain: "data.ai", price: "$18,750", date: "44h ago", change: "+7%" },
];

export function RecentSales() {
  return (
    <section className="py-20 relative">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/5 to-transparent" />
      
      <div className="container mx-auto px-4 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass border border-primary/30 text-sm text-primary mb-4">
            <Clock className="w-4 h-4" />
            Last 48 Hours
          </div>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Recent Domain <span className="gradient-text">Sales</span>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Data sourced from NameBio daily market reports. Stay updated on the latest premium domain transactions.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {recentSales.map((sale, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.05 }}
              whileHover={{ y: -5 }}
              className="p-4 rounded-xl glass border border-border hover:border-primary/30 transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="font-mono text-primary group-hover:glow-text transition-all">
                  {sale.domain}
                </span>
                <ExternalLink className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <div className="text-xl font-bold text-foreground mb-2">
                {sale.price}
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{sale.date}</span>
                <span className="flex items-center gap-1 text-primary">
                  <TrendingUp className="w-3 h-3" />
                  {sale.change}
                </span>
              </div>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="mt-8 text-center"
        >
          <a
            href="https://namebio.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-muted-foreground hover:text-primary transition-colors inline-flex items-center gap-2"
          >
            Data from NameBio Daily Market Report
            <ExternalLink className="w-3 h-3" />
          </a>
        </motion.div>
      </div>
    </section>
  );
}
