import { Helmet } from "react-helmet-async";
import { useSearchParams } from "react-router-dom";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { BrandabilityScorer } from "@/components/tools/BrandabilityScorer";

const BrandabilityScorePage = () => {
  const [searchParams] = useSearchParams();
  const domain = searchParams.get("domain") || undefined;

  return (
    <>
      <Helmet>
        <title>Brandability Score — Rate Any Domain Name | ExpiredHawk</title>
        <meta name="description" content="Free brandability scorer: get a 0-100 score measuring how brandable your domain is. Checks pronounceability, memorability, trademark risk, and word structure." />
        <link rel="canonical" href="https://expiredhawk.com/tools/brandability-score" />
      </Helmet>
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto px-4 pt-24 pb-16">
          <div className="max-w-4xl mx-auto">
            <BrandabilityScorer initialDomain={domain} />
          </div>
        </main>
        <Footer />
      </div>
    </>
  );
};

export default BrandabilityScorePage;
