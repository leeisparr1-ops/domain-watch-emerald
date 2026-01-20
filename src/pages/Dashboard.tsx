import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Search, ExternalLink, Clock, Gavel, Loader2, Filter, X, ChevronLeft, ChevronRight, ArrowUpDown, Heart, RefreshCw, Bell, BellOff, Settings } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Navbar } from "@/components/layout/Navbar";
import { useAuth } from "@/hooks/useAuth";
import { useFavorites } from "@/hooks/useFavorites";
import { useAuctionAlerts } from "@/hooks/useAuctionAlerts";
import { useUserPatterns } from "@/hooks/useUserPatterns";
import { usePatternAlerts } from "@/hooks/usePatternAlerts";
import { Navigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

import { PatternDialog } from "@/components/dashboard/PatternDialog";

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

interface Filters {
  tld: string;
  auctionType: string;
  minPrice: number;
  maxPrice: number;
}

interface SortOption {
  value: string;
  label: string;
  column: string;
  ascending: boolean;
}

const SORT_OPTIONS: SortOption[] = [
  { value: "end_time_asc", label: "Ending Soon", column: "end_time", ascending: true },
  { value: "end_time_desc", label: "Ending Last", column: "end_time", ascending: false },
  { value: "price_asc", label: "Price: Low to High", column: "price", ascending: true },
  { value: "price_desc", label: "Price: High to Low", column: "price", ascending: false },
  { value: "bid_count_desc", label: "Most Bids", column: "bid_count", ascending: false },
  { value: "bid_count_asc", label: "Least Bids", column: "bid_count", ascending: true },
  { value: "domain_name_asc", label: "Domain: A-Z", column: "domain_name", ascending: true },
  { value: "domain_name_desc", label: "Domain: Z-A", column: "domain_name", ascending: false },
];

const TLD_OPTIONS = [
  { value: "all", label: "All TLDs" },
  { value: ".com", label: ".com" },
  { value: ".net", label: ".net" },
  { value: ".org", label: ".org" },
  { value: ".io", label: ".io" },
  { value: ".co", label: ".co" },
  { value: ".ai", label: ".ai" },
  { value: ".xyz", label: ".xyz" },
  { value: ".info", label: ".info" },
];

const AUCTION_TYPE_OPTIONS = [
  { value: "all", label: "All Types" },
  { value: "Bid", label: "Bid Auctions" },
  { value: "BuyNow", label: "Buy Now" },
];

const PRICE_PRESETS = [
  { label: "Any", min: 0, max: 1000000 },
  { label: "Under $50", min: 0, max: 50 },
  { label: "$50-$500", min: 50, max: 500 },
  { label: "$500-$5K", min: 500, max: 5000 },
  { label: "$5K+", min: 5000, max: 1000000 },
];

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
  const { isFavorite, toggleFavorite, count: favoritesCount } = useFavorites();
  const { notificationsEnabled, toggleNotifications, permissionStatus } = useAuctionAlerts();
  const { patterns, addPattern, removePattern, clearPatterns, matchesDomain, hasPatterns, checkPatterns, checking, maxPatterns } = useUserPatterns();
  usePatternAlerts(); // Enable background pattern checking
  const [search, setSearch] = useState("");
  const [auctions, setAuctions] = useState<AuctionDomain[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewMode] = useState<"all" | "favorites">("all");
  const [itemsPerPage, setItemsPerPage] = useState(50);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [jumpToPage, setJumpToPage] = useState("");
  const [filters, setFilters] = useState<Filters>({
    tld: "all",
    auctionType: "all",
    minPrice: 0,
    maxPrice: 1000000,
  });
  const [sortBy, setSortBy] = useState("end_time_asc");
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [timeKey, setTimeKey] = useState(0); // Force re-render for time remaining
  const TIME_UPDATE_INTERVAL = 30 * 1000; // 30 seconds for time display update
  
  const activeFilterCount = [
    filters.tld !== "all",
    filters.auctionType !== "all",
    filters.minPrice > 0 || filters.maxPrice < 1000000,
  ].filter(Boolean).length;

  const fetchAuctionsFromDb = useCallback(async (showLoadingSpinner = true) => {
    try {
      if (showLoadingSpinner) setLoading(true);
      setError(null);
      
      const from = (currentPage - 1) * itemsPerPage;
      const to = from + itemsPerPage - 1;
      
      // Get current sort option
      const currentSort = SORT_OPTIONS.find(s => s.value === sortBy) || SORT_OPTIONS[0];
      
      const now = new Date();
      const endTimeFilter = now.toISOString();
      
      // Use AbortController with timeout to prevent hanging on overloaded DB
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      // Query from database with filters, sorting, and pagination
      // REMOVED count query to prevent timeouts - we estimate count from results instead
      let query = supabase
        .from('auctions')
        .select('id,domain_name,end_time,price,bid_count,traffic_count,domain_age,auction_type,tld')
        .gte('end_time', endTimeFilter)
        .gte('price', filters.minPrice)
        .lte('price', filters.maxPrice)
        .order(currentSort.column, { ascending: currentSort.ascending })
        .range(from, to + 1) // Fetch one extra to detect if there are more pages
        .abortSignal(controller.signal);
      
      // Apply TLD filter (convert to uppercase to match DB format like .COM)
      if (filters.tld !== "all") {
        query = query.eq('tld', filters.tld.toUpperCase());
      }
      
      // Apply auction type filter
      if (filters.auctionType !== "all") {
        query = query.eq('auction_type', filters.auctionType);
      }
      
      const { data, error: queryError } = await query;
      
      clearTimeout(timeoutId);
      
      if (queryError) {
        throw queryError;
      }
      
      if (data) {
        // Check if there are more results (we fetched one extra)
        const hasMore = data.length > itemsPerPage;
        const resultsToShow = hasMore ? data.slice(0, itemsPerPage) : data;
        
        const mapped: AuctionDomain[] = resultsToShow.map(a => ({
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
        // Estimate total count: if we have more pages, keep increasing the estimate
        // This avoids expensive COUNT queries on large tables while allowing full navigation
        if (hasMore) {
          // If there are more results, estimate at least 1000 more pages from current position
          const newEstimate = from + itemsPerPage * 1000;
          setTotalCount(prev => Math.max(prev, newEstimate));
        } else {
          // We've reached the end - set exact count
          setTotalCount(from + mapped.length);
        }
        setLastRefresh(new Date());
      }
    } catch (err) {
      // Handle timeout gracefully
      if (err instanceof Error && err.name === 'AbortError') {
        setError('Database is busy - please try again in a moment');
      } else {
        console.error('Error fetching auctions:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch auctions');
      }
    } finally {
      setLoading(false);
    }
  }, [currentPage, sortBy, filters, itemsPerPage]);
  
  // triggerSync removed - now using SyncAllDialog component
  
  function resetFilters() {
    setFilters({
      tld: "all",
      auctionType: "all",
      minPrice: 0,
      maxPrice: 1000000,
    });
    setCurrentPage(1);
  }
  
  // Reset to page 1 when filters, sort, view mode, or items per page change
  useEffect(() => {
    setCurrentPage(1);
  }, [filters, sortBy, viewMode, itemsPerPage]);
  
  // Initial load
  useEffect(() => {
    if (user) {
      fetchAuctionsFromDb();
    }
  }, [user, fetchAuctionsFromDb]);
  
  
  // Update time remaining display every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeKey(k => k + 1);
    }, TIME_UPDATE_INTERVAL);
    
    return () => clearInterval(interval);
  }, [TIME_UPDATE_INTERVAL]);
  
  const formatLastRefresh = () => {
    const now = new Date();
    const diff = Math.floor((now.getTime() - lastRefresh.getTime()) / 1000);
    if (diff < 60) return 'Just now';
    if (diff < 120) return '1 min ago';
    return `${Math.floor(diff / 60)} mins ago`;
  };
  
  const totalPages = Math.ceil(totalCount / itemsPerPage);
  
  // Generate page numbers to display
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisiblePages = 7;
    
    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      
      if (currentPage > 3) pages.push('...');
      
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      
      for (let i = start; i <= end; i++) pages.push(i);
      
      if (currentPage < totalPages - 2) pages.push('...');
      
      pages.push(totalPages);
    }
    
    return pages;
  };
  
  if (authLoading) return <div className="min-h-screen bg-background flex items-center justify-center"><div className="animate-pulse text-primary">Loading...</div></div>;
  if (!user) return <Navigate to="/login" />;

  const filtered = auctions.filter(d => {
    const matchesSearch = d.domain.toLowerCase().includes(search.toLowerCase());
    const matchesFavorites = viewMode === "all" || isFavorite(d.domain);
    const matchesPattern = matchesDomain(d.domain);
    return matchesSearch && matchesFavorites && matchesPattern;
  });

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-24 pb-12 px-4">
        <div className="container mx-auto">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-6 sm:mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold mb-1 sm:mb-2">Domain <span className="gradient-text">Dashboard</span></h1>
                <p className="text-sm sm:text-base text-muted-foreground">
                  Browse and filter domain auctions
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <RefreshCw className="w-4 h-4 text-primary" />
                  <span className="hidden sm:inline">Updated {formatLastRefresh()}</span>
                  <span className="sm:hidden">{formatLastRefresh()}</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => fetchAuctionsFromDb()}
                  disabled={loading}
                  title="Refresh data"
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                </Button>
              </div>
            </div>
          </motion.div>

          {/* View Mode Toggle */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.05 }} className="mb-4">
            <div className="inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground">
              <button
                onClick={() => setViewMode(viewMode === "favorites" ? "all" : "favorites")}
                className={`inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium transition-all gap-2 ${
                  viewMode === "favorites" 
                    ? "bg-background text-foreground shadow-sm" 
                    : "hover:bg-background/50"
                }`}
              >
                <Heart className="w-4 h-4" />
                Favorites
                {favoritesCount > 0 && (
                  <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                    {favoritesCount}
                  </Badge>
                )}
              </button>
              <Link to="/settings">
                <button
                  className={`inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium transition-all gap-2 ${
                    notificationsEnabled 
                      ? "bg-background text-foreground shadow-sm" 
                      : "hover:bg-background/50"
                  }`}
                  title="Configure auction alerts in Settings"
                >
                  {notificationsEnabled ? (
                    <Bell className="w-4 h-4 text-primary" />
                  ) : (
                    <BellOff className="w-4 h-4" />
                  )}
                  {notificationsEnabled ? 'Alerts ON' : 'Alerts OFF'}
                  <Settings className="w-3 h-3 opacity-50" />
                </button>
              </Link>
            </div>
          </motion.div>

          {/* Search and Actions Bar */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} className="flex flex-col gap-3 sm:flex-row sm:gap-4 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search domains..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10 bg-input" />
            </div>
            <div className="flex gap-2 sm:gap-4 overflow-x-auto">
              <Button 
                variant={showFilters ? "secondary" : "outline"} 
                onClick={() => setShowFilters(!showFilters)}
                className="relative flex-shrink-0"
                size="sm"
              >
                <Filter className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">Filters</span>
                {activeFilterCount > 0 && (
                  <Badge variant="default" className="ml-1 sm:ml-2 h-5 w-5 p-0 flex items-center justify-center text-xs">
                    {activeFilterCount}
                  </Badge>
                )}
              </Button>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-[140px] sm:w-[180px] bg-background flex-shrink-0">
                  <ArrowUpDown className="w-4 h-4 mr-1 sm:mr-2" />
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent className="bg-background border border-border z-50">
                  {SORT_OPTIONS.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </motion.div>

          {/* Filters Panel */}
          {showFilters && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }} 
              animate={{ opacity: 1, height: 'auto' }} 
              exit={{ opacity: 0, height: 0 }}
              className="mb-6 p-4 rounded-xl glass border border-border"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">Filter Auctions</h3>
                {activeFilterCount > 0 && (
                  <Button variant="ghost" size="sm" onClick={resetFilters}>
                    <X className="w-4 h-4 mr-1" /> Clear Filters
                  </Button>
                )}
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* TLD Filter */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">TLD Extension</label>
                  <Select value={filters.tld} onValueChange={(value) => setFilters(f => ({ ...f, tld: value }))}>
                    <SelectTrigger className="bg-background">
                      <SelectValue placeholder="Select TLD" />
                    </SelectTrigger>
                    <SelectContent className="bg-background border border-border z-50">
                      {TLD_OPTIONS.map(option => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Auction Type Filter */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Auction Type</label>
                  <Select value={filters.auctionType} onValueChange={(value) => setFilters(f => ({ ...f, auctionType: value }))}>
                    <SelectTrigger className="bg-background">
                      <SelectValue placeholder="Select Type" />
                    </SelectTrigger>
                    <SelectContent className="bg-background border border-border z-50">
                      {AUCTION_TYPE_OPTIONS.map(option => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Price Range Filter */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Price Range</label>
                  <div className="flex flex-wrap gap-2">
                    {PRICE_PRESETS.map(preset => (
                      <Button 
                        key={preset.label}
                        variant={filters.minPrice === preset.min && filters.maxPrice === preset.max ? "default" : "outline"}
                        size="sm"
                        onClick={() => setFilters(f => ({ ...f, minPrice: preset.min, maxPrice: preset.max }))}
                      >
                        {preset.label}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Active Filters Summary */}
              {activeFilterCount > 0 && (
                <div className="mt-4 pt-4 border-t border-border flex flex-wrap gap-2">
                  {filters.tld !== "all" && (
                    <Badge variant="secondary" className="flex items-center gap-1">
                      TLD: {filters.tld}
                      <X className="w-3 h-3 cursor-pointer" onClick={() => setFilters(f => ({ ...f, tld: "all" }))} />
                    </Badge>
                  )}
                  {filters.auctionType !== "all" && (
                    <Badge variant="secondary" className="flex items-center gap-1">
                      Type: {filters.auctionType}
                      <X className="w-3 h-3 cursor-pointer" onClick={() => setFilters(f => ({ ...f, auctionType: "all" }))} />
                    </Badge>
                  )}
                  {(filters.minPrice > 0 || filters.maxPrice < 1000000) && (
                    <Badge variant="secondary" className="flex items-center gap-1">
                      ${filters.minPrice.toLocaleString()} - ${filters.maxPrice.toLocaleString()}
                      <X className="w-3 h-3 cursor-pointer" onClick={() => setFilters(f => ({ ...f, minPrice: 0, maxPrice: 1000000 }))} />
                    </Badge>
                  )}
                </div>
              )}
            </motion.div>
          )}

          {/* Add Patterns - Below Filters */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }} className="mb-4">
            <PatternDialog patterns={patterns} onAddPattern={addPattern} onRemovePattern={removePattern} onClearPatterns={clearPatterns} maxPatterns={maxPatterns} />
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
              <p className="mb-2">No auctions found matching your criteria.</p>
              {activeFilterCount > 0 && (
                <Button variant="outline" onClick={resetFilters}>Clear Filters</Button>
              )}
            </div>
          )}

          {!loading && !error && filtered.length > 0 && (
            <>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="grid gap-3 sm:gap-4">
              {filtered.map((d, i) => (
                  <a
                    key={d.id || i}
                    href={`https://auctions.godaddy.com/trpItemListing.aspx?domain=${encodeURIComponent(d.domain)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block"
                  >
                    <motion.div
                      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }}
                      className="p-3 sm:p-4 rounded-xl glass border border-border hover:border-primary/30 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 group cursor-pointer">
                      <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0"><Gavel className="w-5 h-5 text-primary" /></div>
                        <div className="min-w-0 flex-1">
                          <div className="font-mono text-base sm:text-lg text-primary group-hover:glow-text truncate">{d.domain}</div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm text-muted-foreground capitalize">{d.auctionType || 'Auction'}</span>
                            <Badge variant="outline" className="text-xs">{d.tld}</Badge>
                            <span className="text-sm font-bold sm:hidden">${d.price.toLocaleString()}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-4 md:gap-8">
                        <div className="text-right hidden sm:block">
                          <div className="font-bold">${d.price.toLocaleString()}</div>
                          <div className="text-xs text-muted-foreground">{d.numberOfBids} bids</div>
                        </div>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Clock className="w-4 h-4" />{formatTimeRemaining(d.auctionEndTime)}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            toggleFavorite(d.domain, d.id);
                          }}
                          className={isFavorite(d.domain) ? "text-red-500 hover:text-red-600" : "text-muted-foreground hover:text-red-500"}
                        >
                          <Heart className={`w-5 h-5 ${isFavorite(d.domain) ? "fill-current" : ""}`} />
                        </Button>
                        <ExternalLink className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </motion.div>
                  </a>
                ))}
              </motion.div>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <motion.div 
                  initial={{ opacity: 0 }} 
                  animate={{ opacity: 1 }} 
                  className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4"
                >
                  {/* Items per page selector */}
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Show:</span>
                    <Select value={itemsPerPage.toString()} onValueChange={(v) => setItemsPerPage(Number(v))}>
                      <SelectTrigger className="w-20 h-8 bg-background">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-background border border-border z-50">
                        <SelectItem value="25">25</SelectItem>
                        <SelectItem value="50">50</SelectItem>
                        <SelectItem value="100">100</SelectItem>
                      </SelectContent>
                    </Select>
                    <span className="text-sm text-muted-foreground">per page</span>
                  </div>

                  {/* Page navigation */}
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(1)}
                      disabled={currentPage === 1}
                      className="hidden sm:flex"
                    >
                      First
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    
                    <div className="flex items-center gap-1">
                      {getPageNumbers().map((page, idx) => (
                        typeof page === 'number' ? (
                          <Button
                            key={idx}
                            variant={currentPage === page ? "default" : "outline"}
                            size="sm"
                            className="w-9"
                            onClick={() => setCurrentPage(page)}
                          >
                            {page}
                          </Button>
                        ) : (
                          <span key={idx} className="px-2 text-muted-foreground">...</span>
                        )
                      ))}
                    </div>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(totalPages)}
                      disabled={currentPage === totalPages}
                      className="hidden sm:flex"
                    >
                      Last
                    </Button>
                  </div>

                  {/* Jump to page */}
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Go to:</span>
                    <Input
                      type="number"
                      min={1}
                      max={totalPages}
                      value={jumpToPage}
                      onChange={(e) => setJumpToPage(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          const page = parseInt(jumpToPage);
                          if (page >= 1 && page <= totalPages) {
                            setCurrentPage(page);
                            setJumpToPage("");
                          }
                        }
                      }}
                      placeholder={currentPage.toString()}
                      className="w-20 h-8 bg-background"
                    />
                    <span className="text-sm text-muted-foreground">
                      of {totalPages.toLocaleString()}
                    </span>
                  </div>
                </motion.div>
              )}
              
            </>
          )}
        </div>
      </main>
    </div>
  );
}
