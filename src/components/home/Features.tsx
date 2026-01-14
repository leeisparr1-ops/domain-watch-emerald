import { motion } from "framer-motion";
import { Search, Bell, BarChart3, Zap, Shield, Globe } from "lucide-react";

const features = [
  {
    icon: Search,
    title: "Pattern-Based Search",
    description: "Use wildcards and regex patterns to find domains matching your criteria. Search for *crypto*, ???ai, or complex patterns.",
  },
  {
    icon: Bell,
    title: "Real-time Alerts",
    description: "Get notified instantly when a domain matching your pattern becomes available or approaches your price range.",
  },
  {
    icon: BarChart3,
    title: "Market Analytics",
    description: "Track pricing trends, auction activity, and market movements to make informed decisions.",
  },
  {
    icon: Zap,
    title: "Instant Access",
    description: "Click any domain to go directly to its auction page. Never miss an opportunity with our direct links.",
  },
  {
    icon: Shield,
    title: "Secure Monitoring",
    description: "Your search patterns and preferences are encrypted and private. Only you can see what you're tracking.",
  },
  {
    icon: Globe,
    title: "Multiple Sources",
    description: "Monitor domains from GoDaddy auctions, closeouts, and more sources in one unified dashboard.",
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
            Everything You Need to <span className="gradient-text">Hunt Domains</span>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Powerful tools designed for serious domain investors and businesses looking for the perfect web address.
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
