import { Search, Bell, Smartphone, Check } from "lucide-react";
import { motion } from "framer-motion";

const steps = [
  {
    icon: Search,
    step: "01",
    title: "Set Your Criteria",
    description: "Define what you're looking for — keywords, length, TLD, or price range. No regex needed.",
  },
  {
    icon: Bell,
    step: "02",
    title: "We Scan Daily",
    description: "ExpiredHawk checks millions of expiring domains every few hours against your patterns.",
  },
  {
    icon: Smartphone,
    step: "03",
    title: "Get Notified",
    description: "Receive a push notification or email the moment a matching domain appears.",
  },
  {
    icon: Check,
    step: "04",
    title: "Grab It",
    description: "Click the link in your alert to go straight to the auction and secure the domain.",
  },
];

export function HowItWorksV2() {
  return (
    <section className="py-24">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            How It <span className="gradient-text">Works</span>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Get started in minutes and never miss a domain opportunity again.
          </p>
        </motion.div>

        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-10">
            {steps.map((item, index) => {
              const Icon = item.icon;
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 15 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className="flex gap-4"
                >
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center">
                      <Icon className="w-5 h-5 text-primary-foreground" />
                    </div>
                  </div>
                  <div>
                    <div className="text-xs font-mono text-primary font-semibold mb-1 tracking-wider">
                      STEP {item.step}
                    </div>
                    <h3 className="text-lg font-semibold mb-1 text-foreground">
                      {item.title}
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {item.description}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
