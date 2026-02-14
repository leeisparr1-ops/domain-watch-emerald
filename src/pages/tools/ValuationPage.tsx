import { Helmet } from "react-helmet-async";
import { useSearchParams } from "react-router-dom";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { DomainValuationEstimator } from "@/components/tools/DomainValuationEstimator";

const ValuationPage = () => {
  const [searchParams] = useSearchParams();
  const domain = searchParams.get("domain") || undefined;

  return (
    <>
      <Helmet>
        <title>Domain Valuation Estimator — What's Your Domain Worth? | ExpiredHawk</title>
        <meta name="description" content="Free domain valuation tool with 2026 market data. Get instant price estimates based on comparable sales, TLD demand, and trending niches like AI and fintech." />
        <link rel="canonical" href="https://expiredhawk.lovable.app/tools/valuation" />
      </Helmet>
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto px-4 pt-24 pb-16">
          <div className="max-w-4xl mx-auto">
            <DomainValuationEstimator initialDomain={domain} />
          </div>
        </main>
        <Footer />
      </div>
    </>
  );
};

export default ValuationPage;
