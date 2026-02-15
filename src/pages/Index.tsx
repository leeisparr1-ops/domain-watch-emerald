import { Navbar } from "@/components/layout/Navbar";
import { Hero } from "@/components/home/Hero";
import { Features } from "@/components/home/Features";
import { HowItWorks } from "@/components/home/HowItWorks";
import { ToolsShowcase } from "@/components/home/ToolsShowcase";
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
          <Hero />
          <HowItWorks />
          <ToolsShowcase />
          <Features />
        </main>
        <Footer />
      </div>
    </>
  );
};

export default Index;
