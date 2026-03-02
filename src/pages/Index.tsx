import { Navbar } from "@/components/layout/Navbar";
import { HeroV2 } from "@/components/home/HeroV2";
import { StatsBar } from "@/components/home/StatsBar";
import { HowItWorksV2 } from "@/components/home/HowItWorksV2";
import { ToolsShowcaseV2 } from "@/components/home/ToolsShowcaseV2";
import { FeaturesV2 } from "@/components/home/FeaturesV2";
import { CtaBanner } from "@/components/home/CtaBanner";
import { Footer } from "@/components/layout/Footer";
import { Helmet } from "react-helmet-async";

const Index = () => {
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
          <StatsBar />
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
