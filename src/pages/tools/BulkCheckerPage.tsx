import { Helmet } from "react-helmet-async";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { BulkPronounceabilityChecker } from "@/components/tools/BulkPronounceabilityChecker";

const BulkCheckerPage = () => (
  <>
    <Helmet>
      <title>Bulk Domain Analyzer — Score Your Entire Portfolio | ExpiredHawk</title>
      <meta name="description" content="Analyze multiple domains at once. Get pronounceability scores, valuations, and trademark risk for your entire domain portfolio in seconds." />
      <link rel="canonical" href="https://expiredhawk.lovable.app/tools/bulk-checker" />
    </Helmet>
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 pt-24 pb-16">
        <div className="max-w-4xl mx-auto">
          <BulkPronounceabilityChecker />
        </div>
      </main>
      <Footer />
    </div>
  </>
);

export default BulkCheckerPage;
