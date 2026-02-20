import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Navbar } from "@/components/layout/Navbar";
import { HeroV2 } from "@/components/home/HeroV2";

import { HowItWorksV2 } from "@/components/home/HowItWorksV2";
import { ToolsShowcaseV2 } from "@/components/home/ToolsShowcaseV2";
import { FeaturesV2 } from "@/components/home/FeaturesV2";
import { CtaBanner } from "@/components/home/CtaBanner";
import { Footer } from "@/components/layout/Footer";
import { Helmet } from "react-helmet-async";

const Index = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // After OAuth redirect lands on /, redirect authenticated users to dashboard
  useEffect(() => {
    if (user) navigate("/dashboard", { replace: true });
  }, [user, navigate]);

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
      </div>
    </>
  );
};

export default Index;
