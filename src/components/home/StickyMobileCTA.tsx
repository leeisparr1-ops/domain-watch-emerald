import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { useEffect, useState } from "react";

const CONSENT_KEY = "cookie-consent";

export function StickyMobileCTA() {
  const [visible, setVisible] = useState(false);
  const [cookieBannerVisible, setCookieBannerVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 400);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const checkConsent = () => {
      const consent = localStorage.getItem(CONSENT_KEY);
      setCookieBannerVisible(!consent);
    };
    checkConsent();
    window.addEventListener("storage", checkConsent);
    const interval = setInterval(checkConsent, 1000);
    return () => {
      window.removeEventListener("storage", checkConsent);
      clearInterval(interval);
    };
  }, []);

  if (!visible) return null;

  return (
    <div
      className={`fixed inset-x-0 z-50 p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] bg-background/80 backdrop-blur-lg border-t border-border md:hidden transition-all duration-300 ${
        cookieBannerVisible ? "bottom-[120px]" : "bottom-0"
      }`}
    >
      <Link to="/signup" className="block">
        <Button variant="hero" size="lg" className="w-full">
          Start Monitoring Free
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </Link>
    </div>
  );
}
