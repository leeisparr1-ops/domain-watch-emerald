import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

export function CtaBanner() {
  return (
    <section className="py-20">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="relative rounded-2xl gradient-primary px-8 py-14 md:py-16 text-center overflow-hidden"
        >
          {/* Decorative circles */}
          <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-white/5 -translate-y-1/2 translate-x-1/3" />
          <div className="absolute bottom-0 left-0 w-48 h-48 rounded-full bg-white/5 translate-y-1/2 -translate-x-1/3" />

          <div className="relative z-10">
            <h2 className="text-2xl md:text-4xl font-bold text-primary-foreground mb-4">
              Stop Missing Premium Domains
            </h2>
            <p className="text-primary-foreground/80 mb-8 max-w-lg mx-auto">
              Catch expiring domains before anyone else — set your patterns and let us do the scanning.
            </p>
            <Link to="/signup">
              <Button
                size="xl"
                className="bg-primary-foreground text-primary font-semibold hover:bg-primary-foreground/90 shadow-lg"
              >
                Start Monitoring Free
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
