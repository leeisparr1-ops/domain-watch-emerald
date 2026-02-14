import { Helmet } from "react-helmet-async";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { TldComparisonTool } from "@/components/tools/TldComparisonTool";

const TldComparePage = () => (
  <>
    <Helmet>
      <title>TLD Comparison Tool — Compare Domain Extensions | ExpiredHawk</title>
      <meta name="description" content="Compare 45+ domain extensions side by side. See liquidity grades, pricing, and niche recommendations to pick the best TLD for your domain investment." />
      <link rel="canonical" href="https://expiredhawk.lovable.app/tools/tld-compare" />
    </Helmet>
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 pt-24 pb-16">
        <div className="max-w-4xl mx-auto">
          <TldComparisonTool />
        </div>
      </main>
      <Footer />
    </div>
  </>
);

export default TldComparePage;
