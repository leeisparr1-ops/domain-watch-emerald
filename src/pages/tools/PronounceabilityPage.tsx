import { Helmet } from "react-helmet-async";
import { useSearchParams } from "react-router-dom";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { PronounceabilityScorer } from "@/components/tools/PronounceabilityScorer";

const PronounceabilityPage = () => {
  const [searchParams] = useSearchParams();
  const domain = searchParams.get("domain") || undefined;

  return (
    <>
      <Helmet>
        <title>Domain Pronounceability Checker — Is Your Domain Easy to Say? | ExpiredHawk</title>
        <meta name="description" content="Free pronounceability scorer for domain names. Check if your domain passes the radio test — easy to say, spell, and remember. Includes trademark screening." />
        <link rel="canonical" href="https://expiredhawk.lovable.app/tools/pronounceability" />
      </Helmet>
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto px-4 pt-24 pb-16">
          <div className="max-w-4xl mx-auto">
            <PronounceabilityScorer initialDomain={domain} />
          </div>
        </main>
        <Footer />
      </div>
    </>
  );
};

export default PronounceabilityPage;
