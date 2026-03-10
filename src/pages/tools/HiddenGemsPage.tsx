import { Helmet } from "react-helmet-async";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { HiddenGemsFinder } from "@/components/tools/HiddenGemsFinder";

const HiddenGemsPage = () => (
  <>
    <Helmet>
      <title>Hidden Gems — Find Undervalued Domains | ExpiredHawk</title>
      <meta name="description" content="Discover undervalued domains in our inventory. AI-scored hidden gems ranked by brandability, pronounceability, valuation gap, and flip potential." />
      <link rel="canonical" href="https://expiredhawk.com/tools/hidden-gems" />
    </Helmet>
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 pt-24 pb-16">
        <div className="max-w-5xl mx-auto">
          <HiddenGemsFinder />
        </div>
      </main>
      <Footer />
    </div>
  </>
);

export default HiddenGemsPage;
