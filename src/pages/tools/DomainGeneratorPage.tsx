import { Helmet } from "react-helmet-async";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { NameGenerator } from "@/components/tools/NameGenerator";

const DomainGeneratorPage = () => (
  <>
    <Helmet>
      <title>AI Domain Name Generator — Best Domain Ideas 2026 | ExpiredHawk</title>
      <meta name="description" content="Generate brandable domain name ideas with AI. Instant pronounceability scores, availability checks, and investor-ready suggestions for domainers." />
      <link rel="canonical" href="https://expiredhawk.lovable.app/tools/domain-generator" />
    </Helmet>
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 pt-24 pb-16">
        <div className="max-w-4xl mx-auto">
          <NameGenerator />
        </div>
      </main>
      <Footer />
    </div>
  </>
);

export default DomainGeneratorPage;
