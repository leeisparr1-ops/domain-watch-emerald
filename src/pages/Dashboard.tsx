import { useState } from "react";
import { motion } from "framer-motion";
import { Search, Plus, ExternalLink, Clock, Gavel } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Navbar } from "@/components/layout/Navbar";
import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";

const mockDomains = [
  { domain: "cryptomarket.com", price: "$2,450", bids: 12, ends: "2h 15m", source: "GoDaddy" },
  { domain: "aitools.io", price: "$890", bids: 8, ends: "45m", source: "GoDaddy" },
  { domain: "startuplab.dev", price: "$1,200", bids: 5, ends: "4h 30m", source: "GoDaddy" },
  { domain: "techbrand.co", price: "$560", bids: 3, ends: "6h", source: "GoDaddy" },
  { domain: "designhub.app", price: "$320", bids: 2, ends: "12h", source: "Closeout" },
];

export default function Dashboard() {
  const { user, loading } = useAuth();
  const [search, setSearch] = useState("");
  
  if (loading) return <div className="min-h-screen bg-background flex items-center justify-center"><div className="animate-pulse text-primary">Loading...</div></div>;
  if (!user) return <Navigate to="/login" />;

  const filtered = mockDomains.filter(d => d.domain.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-24 pb-12 px-4">
        <div className="container mx-auto">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Domain <span className="gradient-text">Dashboard</span></h1>
            <p className="text-muted-foreground">Monitor auctions from GoDaddy inventory</p>
          </motion.div>
          
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} className="flex flex-col sm:flex-row gap-4 mb-8">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search domains or use patterns like *crypto*" value={search} onChange={e => setSearch(e.target.value)} className="pl-10 bg-input" />
            </div>
            <Button variant="hero"><Plus className="w-4 h-4 mr-2" />Add Pattern</Button>
          </motion.div>

          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="grid gap-4">
            {filtered.map((d, i) => (
              <motion.a key={i} href={`https://auctions.godaddy.com/trpItemListing.aspx?domain=${d.domain}`} target="_blank" rel="noopener noreferrer"
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                className="p-4 rounded-xl glass border border-border hover:border-primary/30 transition-all flex items-center justify-between group">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center"><Gavel className="w-5 h-5 text-primary" /></div>
                  <div>
                    <div className="font-mono text-lg text-primary group-hover:glow-text">{d.domain}</div>
                    <div className="text-sm text-muted-foreground">{d.source}</div>
                  </div>
                </div>
                <div className="flex items-center gap-8">
                  <div className="text-right"><div className="font-bold">{d.price}</div><div className="text-xs text-muted-foreground">{d.bids} bids</div></div>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground"><Clock className="w-4 h-4" />{d.ends}</div>
                  <ExternalLink className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </motion.a>
            ))}
          </motion.div>
        </div>
      </main>
    </div>
  );
}
