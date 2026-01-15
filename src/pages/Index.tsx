import { Navbar } from "@/components/layout/Navbar";
import { Hero } from "@/components/home/Hero";
import { Features } from "@/components/home/Features";
import { RegistrarComparison } from "@/components/home/RegistrarComparison";
import { Footer } from "@/components/layout/Footer";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <Hero />
      <Features />
      <RegistrarComparison />
      <Footer />
    </div>
  );
};

export default Index;
