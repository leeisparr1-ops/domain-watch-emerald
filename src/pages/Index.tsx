import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Navbar } from "@/components/layout/Navbar";
import { HeroV2 } from "@/components/home/HeroV2";
import { HowItWorksV2 } from "@/components/home/HowItWorksV2";
import { ToolsShowcaseV2 } from "@/components/home/ToolsShowcaseV2";
import { FeaturesV2 } from "@/components/home/FeaturesV2";
import { CtaBanner } from "@/components/home/CtaBanner";
import { StickyMobileCTA } from "@/components/home/StickyMobileCTA";
import { Footer } from "@/components/layout/Footer";
import { useAuth } from "@/hooks/useAuth";
import { consumePostAuthRedirect } from "@/lib/postAuthRedirect";
import { Helmet } from "react-helmet-async";

const Index = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading || !user) return;

    const next = consumePostAuthRedirect();
    if (next) {
      navigate(next, { replace: true });
    }
  }, [loading, navigate, user]);

  return (
    <>
      <Helmet>
        <title>ExpiredHawk - Pattern-Based Domain Alerts & Monitoring</title>
        <meta name="description" content="Get alerted when expiring domain names matching your criteria become available at auction. Smart pattern matching, push notifications, and email alerts." />
        <link rel="canonical" href="https://expiredhawk.com/" />
      </Helmet>
      <div className="min-h-screen bg-background">
        <Navbar />
        <main>
          <HeroV2 />
          <HowItWorksV2 />
          <ToolsShowcaseV2 />
          <FeaturesV2 />
          <CtaBanner />
        </main>
        <Footer />
        <StickyMobileCTA />
      </div>
    </>
  );
};

export default Index;
