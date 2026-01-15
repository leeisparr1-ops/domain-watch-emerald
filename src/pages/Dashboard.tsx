import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Search, Plus, ExternalLink, Clock, Gavel, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Navbar } from "@/components/layout/Navbar";
import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

interface AuctionDomain {
  id: string;
  domain: string;
  auctionEndTime: string;
  price: number;
  numberOfBids: number;
  traffic: number;
  domainAge: number;
  auctionType: string;
  tld: string;
}

function formatTimeRemaining(endTime: string): string {
  const end = new Date(endTime);
  const now = new Date();
  const diff = end.getTime() - now.getTime();
  
  if (diff <= 0) return "Ended";
  
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  
  if (hours >= 24) {
    const days = Math.floor(hours / 24);
    return `${days}d ${hours % 24}h`;
  }
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

export default function Dashboard() {
  const { user, loading: authLoading } = useAuth();
  const [search, setSearch] = useState("");
  const [auctions, setAuctions] = useState<AuctionDomain[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  
  async function fetchAuctionsFromDb() {
    try {
      setLoading(true);
      setError(null);
      
      // Query from database with filters
      let query = supabase
        .from('auctions')
        .select('*', { count: 'exact' })
        .gte('end_time', new Date().toISOString())
        .order('end_time', { ascending: true })
        .limit(100);
      
      const { data, error, count } = await query;
      
      if (error) throw error;
      
      if (data) {
        const mapped: AuctionDomain[] = data.map(a => ({
          id: a.id,
          domain: a.domain_name,
          auctionEndTime: a.end_time || '',
          price: Number(a.price) || 0,
          numberOfBids: a.bid_count || 0,
          traffic: a.traffic_count || 0,
          domainAge: a.domain_age || 0,
          auctionType: a.auction_type || 'auction',
          tld: a.tld || '',
        }));
        setAuctions(mapped);
        setTotalCount(count || 0);
      }
    } catch (err) {
      console.error('Error fetching auctions:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch auctions');
    } finally {
      setLoading(false);
    }
  }
  
  async function triggerSync() {
    setSyncing(true);
    try {
      // Sync multiple inventory types
      for (const type of ['endingToday', 'endingTomorrow', 'allBiddable']) {
        await supabase.functions.invoke('sync-auctions', {
          body: null,
        });
      }
      // Refresh data after sync
      await fetchAuctionsFromDb();
    } catch (err) {
      console.error('Sync error:', err);
    } finally {
      setSyncing(false);
    }
  }
  
  useEffect(() => {
    if (user) {
      fetchAuctionsFromDb();
    }
  }, [user]);
  
  if (authLoading) return <div className="min-h-screen bg-background flex items-center justify-center"><div className="animate-pulse text-primary">Loading...</div></div>;
  if (!user) return <Navigate to="/login" />;

  const filtered = auctions.filter(d => d.domain.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-24 pb-12 px-4">
        <div className="container mx-auto">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Domain <span className="gradient-text">Dashboard</span></h1>
            <p className="text-muted-foreground">
              {totalCount > 0 ? `${totalCount.toLocaleString()} auctions in database` : 'Monitor auctions from GoDaddy inventory'}
            </p>
          </motion.div>
          
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} className="flex flex-col sm:flex-row gap-4 mb-8">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search domains or use patterns like *crypto*" value={search} onChange={e => setSearch(e.target.value)} className="pl-10 bg-input" />
            </div>
            <Button variant="outline" onClick={triggerSync} disabled={syncing}>
              <RefreshCw className={`w-4 h-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? 'Syncing...' : 'Sync Now'}
            </Button>
            <Button variant="hero"><Plus className="w-4 h-4 mr-2" />Add Pattern</Button>
          </motion.div>

          {loading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
              <span className="ml-3 text-muted-foreground">Loading auctions...</span>
            </div>
          )}

          {error && !loading && (
            <div className="text-center py-12">
              <p className="text-destructive mb-4">{error}</p>
              <Button variant="outline" onClick={() => window.location.reload()}>Retry</Button>
            </div>
          )}

          {!loading && !error && filtered.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              No auctions found matching your search.
            </div>
          )}

          {!loading && !error && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="grid gap-4">
              {filtered.slice(0, 50).map((d, i) => (
                <motion.a key={d.id || i} href={`https://auctions.godaddy.com/trpItemListing.aspx?domain=${d.domain}`} target="_blank" rel="noopener noreferrer"
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                  className="p-4 rounded-xl glass border border-border hover:border-primary/30 transition-all flex items-center justify-between group">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center"><Gavel className="w-5 h-5 text-primary" /></div>
                    <div>
                      <div className="font-mono text-lg text-primary group-hover:glow-text">{d.domain}</div>
                      <div className="text-sm text-muted-foreground capitalize">{d.auctionType || 'GoDaddy'}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-8">
                    <div className="text-right">
                      <div className="font-bold">${d.price.toLocaleString()}</div>
                      <div className="text-xs text-muted-foreground">{d.numberOfBids} bids</div>
                    </div>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Clock className="w-4 h-4" />{formatTimeRemaining(d.auctionEndTime)}
                    </div>
                    <ExternalLink className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </motion.a>
              ))}
            </motion.div>
          )}
        </div>
      </main>
    </div>
  );
}
