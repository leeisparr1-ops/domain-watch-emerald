import { Link } from "react-router-dom";
import { Bell, ArrowRight, Play, Pause } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { useRef, useState } from "react";

export function HeroV2() {
  const [isPlaying, setIsPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const toggleVideo = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  return (
    <section className="relative min-h-[50vh] lg:min-h-[60vh] flex items-center overflow-hidden pt-20 pb-12">
      {/* Subtle grid background */}
      <div className="absolute inset-0 pattern-grid opacity-[0.08]" />
      
      {/* Gradient orbs */}
      <div className="absolute top-1/3 -left-32 w-[500px] h-[500px] rounded-full bg-primary/5 blur-3xl" />
      <div className="absolute bottom-1/4 -right-32 w-[400px] h-[400px] rounded-full bg-primary/3 blur-3xl" />

      <div className="container mx-auto px-4 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col items-center text-center max-w-3xl mx-auto"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium mb-6">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            Scanning 2.7M+ domains daily
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-[1.1] mb-6 tracking-tight">
            Never Miss an{" "}
            <span className="gradient-text">Expiring Domain</span>{" "}
            Again
          </h1>

          <p className="text-lg text-muted-foreground mb-8 max-w-lg leading-relaxed">
            Set your rules once — we'll watch millions of expiring domains and ping you when something good drops. Simple as that.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 mb-8">
            <Link to="/signup">
              <Button variant="hero" size="xl" className="w-full sm:w-auto">
                <Bell className="w-5 h-5 mr-2" />
                Start Monitoring Free
              </Button>
            </Link>
            <Link to="/pricing">
              <Button variant="outline" size="xl" className="w-full sm:w-auto">
                View Pricing
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>

          <p className="text-sm text-muted-foreground mb-10">
            Free tier includes 30 patterns · No credit card required
          </p>

          {/* Promo Video */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="w-full max-w-2xl"
          >
            <div
              className="relative rounded-xl border border-border bg-card/80 backdrop-blur-sm overflow-hidden cursor-pointer group shadow-lg hover:shadow-xl transition-shadow"
              onClick={toggleVideo}
            >
              <div className="aspect-video relative bg-[#0a0a0f]">
                <video
                  ref={videoRef}
                  src="/expiredhawk-promo.mp4"
                  className="w-full h-full object-cover"
                  playsInline
                  muted
                  loop
                  preload="metadata"
                  onEnded={() => setIsPlaying(false)}
                />
                {/* Play/Pause overlay */}
                <div
                  className={`absolute inset-0 flex items-center justify-center transition-opacity duration-300 ${
                    isPlaying ? "opacity-0 hover:opacity-100" : "opacity-100"
                  } bg-background/20`}
                >
                  <div className="w-16 h-16 rounded-full bg-primary/90 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                    {isPlaying ? (
                      <Pause className="w-7 h-7 text-primary-foreground" />
                    ) : (
                      <Play className="w-7 h-7 text-primary-foreground ml-1" />
                    )}
                  </div>
                </div>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              See how ExpiredHawk helps you find valuable expiring domains
            </p>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}