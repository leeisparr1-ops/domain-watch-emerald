import { motion } from "framer-motion";
import { Search, Bell, Smartphone, Shield, Globe, Zap, Mail } from "lucide-react";
const features = [
  {
    icon: Search,
    title: "Smart Pattern Builder",
    description: "Create patterns with 'Starts with', 'Ends with', 'Contains', or custom regex. Add TLD filters and price limits to match exactly what you want.",
  },
  {
    icon: Smartphone,
    title: "Push Notifications",
    description: "Get alerts on your phone when matching domains become available—even when your browser is closed.",
  },
  {
    icon: Mail,
    title: "Email Notifications",
    description: "Receive email alerts on your schedule—every 2, 4, or 6 hours. Customize notification frequency in Settings.",
  },
  {
    icon: Bell,
    title: "Flexible Alert Frequency",
    description: "Choose how often you receive notifications. Set 2, 4, or 6-hour intervals to match your workflow.",
  },
  {
    icon: Zap,
    title: "Automatic Matching",
    description: "Patterns are checked automatically after every sync. New matches appear in your Matches tab with one-click access.",
  },
  {
    icon: Shield,
    title: "Secure & Private",
    description: "Your search patterns and preferences are encrypted and private. Only you can see what you're tracking.",
  },
  {
    icon: Globe,
    title: "Live Auction Data",
    description: "Syncs every 6 hours with auctions, closeouts, and expiring domains.",
  },
];

export function Features() {
  return (
    <section className="py-20">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Never Miss a <span className="gradient-text">Perfect Domain</span>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Set up your patterns once, then let ExpiredHawk watch for you 24/7 and alert you instantly on your phone.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ y: -5 }}
              className="p-6 rounded-2xl glass border border-border hover:border-primary/30 transition-all group"
            >
              <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center mb-4 group-hover:glow-primary transition-all">
                <feature.icon className="w-6 h-6 text-primary-foreground" />
              </div>
              <h3 className="text-xl font-semibold mb-2 text-foreground">
                {feature.title}
              </h3>
              <p className="text-muted-foreground">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}