import { motion } from "framer-motion";
import { ExternalLink } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";

const registrars = [
  { name: "GoDaddy", com: "$12.99", renewal: "$21.99", transfer: "$12.99", url: "https://godaddy.com" },
  { name: "Namecheap", com: "$8.88", renewal: "$14.98", transfer: "$9.48", url: "https://namecheap.com" },
  { name: "Porkbun", com: "$9.73", renewal: "$10.58", transfer: "$9.73", url: "https://porkbun.com" },
  { name: "Cloudflare", com: "$9.77", renewal: "$9.77", transfer: "$9.77", url: "https://cloudflare.com/products/registrar" },
  { name: "Spaceship", com: "$9.38", renewal: "$12.18", transfer: "$9.38", url: "https://spaceship.com" },
  { name: "Google Domains", com: "$12.00", renewal: "$12.00", transfer: "$12.00", url: "https://domains.google" },
];

export default function Registrars() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <section className="pt-32 pb-20">
        <div className="container mx-auto px-4">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">Registrar <span className="gradient-text">Comparison</span></h1>
            <p className="text-muted-foreground">Compare .com pricing across popular registrars</p>
          </motion.div>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="overflow-x-auto">
            <table className="w-full max-w-4xl mx-auto">
              <thead><tr className="border-b border-border">
                <th className="text-left py-4 px-4">Registrar</th>
                <th className="text-left py-4 px-4">.com Registration</th>
                <th className="text-left py-4 px-4">Renewal</th>
                <th className="text-left py-4 px-4">Transfer</th>
                <th className="py-4 px-4"></th>
              </tr></thead>
              <tbody>
                {registrars.map((r, i) => (
                  <motion.tr key={i} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                    className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                    <td className="py-4 px-4 font-medium">{r.name}</td>
                    <td className="py-4 px-4 font-mono text-primary">{r.com}</td>
                    <td className="py-4 px-4 font-mono text-muted-foreground">{r.renewal}</td>
                    <td className="py-4 px-4 font-mono text-muted-foreground">{r.transfer}</td>
                    <td className="py-4 px-4"><a href={r.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-1"><ExternalLink className="w-4 h-4" /></a></td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </motion.div>
        </div>
      </section>
      <Footer />
    </div>
  );
}
