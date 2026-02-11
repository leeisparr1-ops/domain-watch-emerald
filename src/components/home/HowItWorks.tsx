import { Search, Bell, Smartphone, Check } from "lucide-react";

const steps = [
  {
    icon: Search,
    step: "1",
    title: "Set Your Criteria",
    description: "Tell us what you are looking for — keywords, length, TLD, or price range. No regex knowledge required.",
  },
  {
    icon: Bell,
    step: "2",
    title: "We Scan Daily",
    description: "ExpiredHawk checks thousands of expiring domains every few hours and compares them to your patterns.",
  },
  {
    icon: Smartphone,
    step: "3",
    title: "Get Notified",
    description: "Receive a push notification or email the moment a matching domain appears.",
  },
  {
    icon: Check,
    step: "4",
    title: "Grab It",
    description: "Click the link in your alert to go straight to the auction and secure the domain.",
  },
];

export function HowItWorks() {
  return (
    <section className="py-20 bg-secondary/20">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            How It <span className="gradient-text">Works</span>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Get started in minutes and never miss a domain opportunity again.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
          {steps.map((item, index) => {
            const Icon = item.icon;
            return (
              <div
                key={index}
                className="relative"
              >
                {/* Connector line for desktop */}
                {index < steps.length - 1 && (
                  <div className="hidden lg:block absolute top-12 left-[60%] w-[80%] h-0.5 bg-gradient-to-r from-primary/50 to-transparent" />
                )}
                
                <div className="flex flex-col items-center text-center p-6 rounded-2xl bg-card border border-border hover:border-primary/30 transition-colors">
                  <div className="relative mb-4">
                    <div className="w-16 h-16 rounded-full gradient-primary flex items-center justify-center">
                      <Icon className="w-7 h-7 text-primary-foreground" />
                  </div>
                  <div className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-background border-2 border-primary flex items-center justify-center text-sm font-bold text-primary">
                    {item.step}
                  </div>
                </div>
                <h3 className="text-lg font-semibold mb-2 text-foreground">
                  {item.title}
                </h3>
              <p className="text-sm text-muted-foreground">
                {item.description}
              </p>
            </div>
          </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
