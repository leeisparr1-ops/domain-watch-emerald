import { useState, useEffect, useCallback, useRef, useTransition } from "react";
import { Search, ExternalLink, Clock, Gavel, Loader2, Filter, X, ChevronLeft, ChevronRight, ArrowUpDown, Heart, RefreshCw, Bell, BellOff, Settings, Target, Trash2, Info } from "lucide-react";

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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

import { PatternDialog } from "@/components/dashboard/PatternDialog";
import { SavedPatternsDialog } from "@/components/dashboard/SavedPatternsDialog";
import { DomainDetailSheet } from "@/components/dashboard/DomainDetailSheet";
import { DomainTable } from "@/components/dashboard/DomainTable";

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
  valuation?: number;
  inventorySource?: string;
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

// Reduced sort options to only those with reliable index performance on 750k+ rows
// Other sorts (Most Bids, Domain A-Z, etc.) cause statement timeouts
const SORT_OPTIONS: SortOption[] = [
  { value: "price_asc", label: "Price: Low to High", column: "price", ascending: true },
  { value: "price_desc", label: "Price: High to Low", column: "price", ascending: false },
  { value: "end_time_asc", label: "Ending Soon", column: "end_time", ascending: true },
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
  const { isFavorite, toggleFavorite, count: favoritesCount, clearAllFavorites } = useFavorites();
  const { notificationsEnabled, toggleNotifications, permissionStatus } = useAuctionAlerts();
  const { patterns, addPattern, removePattern, togglePattern, renamePattern, updatePattern, clearPatterns, matchesDomain, hasPatterns, checkPatterns, checking, maxPatterns, enabledCount } = useUserPatterns();
  usePatternAlerts({ enabledCount, checkPatterns }); // Enable background pattern checking
  const [isSortPending, startSortTransition] = useTransition();
  const [isFetchingAuctions, setIsFetchingAuctions] = useState(false);
  // Prevent slow/buggy dropdown interactions by canceling stale in-flight requests
  // and ignoring late responses.
  const activeFetchSeqRef = useRef(0);
  const activeFetchControllerRef = useRef<AbortController | null>(null);
  const activeFetchTimeoutRef = useRef<number | null>(null);
  const beginNewFetch = useCallback(() => {
    activeFetchSeqRef.current += 1;
    const seq = activeFetchSeqRef.current;

    if (activeFetchTimeoutRef.current) {
      window.clearTimeout(activeFetchTimeoutRef.current);
      activeFetchTimeoutRef.current = null;
    }
    if (activeFetchControllerRef.current) {
      activeFetchControllerRef.current.abort();
    }

    const controller = new AbortController();
    activeFetchControllerRef.current = controller;
    // Extended timeout (25s) to handle heavy database load with 750k+ rows
    activeFetchTimeoutRef.current = window.setTimeout(() => controller.abort(), 25000);

    return { seq, signal: controller.signal };
  }, []);

  useEffect(() => {
    return () => {
      if (activeFetchTimeoutRef.current) window.clearTimeout(activeFetchTimeoutRef.current);
      activeFetchControllerRef.current?.abort();
    };
  }, []);
  const hasLoadedOnceRef = useRef(false);
  const wasHiddenRef = useRef(false);
  const [dialogMatches, setDialogMatches] = useState<Array<{
    auction_id: string;
    domain_name: string;
    price: number;
    end_time: string | null;
    pattern_description: string;
    alert_id?: string;
    bid_count?: number;
    traffic_count?: number;
    domain_age?: number;
    auction_type?: string;
    tld?: string;
    valuation?: number;
    inventory_source?: string;
  }>>([]);
  const [matchesPage, setMatchesPage] = useState(1);
  const [matchesPerPage, setMatchesPerPage] = useState(50);
  const [totalMatchesCount, setTotalMatchesCount] = useState(0);
  const [hideEndedMatches, setHideEndedMatches] = useState(true); // Default: hide ended auctions
  const [loadingMatches, setLoadingMatches] = useState(false);
  const [search, setSearch] = useState("");
  const [auctions, setAuctions] = useState<AuctionDomain[]>([]);
  const [selectedDomain, setSelectedDomain] = useState<AuctionDomain | null>(null);
  const [detailSheetOpen, setDetailSheetOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewMode] = useState<"all" | "favorites" | "matches">("all");
  const [itemsPerPage, setItemsPerPage] = useState(50);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [jumpToPage, setJumpToPage] = useState("");
  const [filters, setFilters] = useState<Filters>({
    tld: "all",
    auctionType: "all",
    minPrice: 0,
    maxPrice: 1000000,
  });
  const [sortBy, setSortBy] = useState("price_asc");
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [timeKey, setTimeKey] = useState(0); // Force re-render for time remaining
  const TIME_UPDATE_INTERVAL = 30 * 1000; // 30 seconds for time display update
  
  const activeFilterCount = [
    filters.tld !== "all",
    filters.auctionType !== "all",
    filters.minPrice > 0 || filters.maxPrice < 1000000,
  ].filter(Boolean).length;

  // Track tab visibility so we can avoid expensive re-fetches on tab-switch
  // while still allowing explicit user-driven changes (sort/filter/page) to fetch immediately.
  useEffect(() => {
    const handler = () => {
      if (document.visibilityState === "hidden") {
        wasHiddenRef.current = true;
      }
    };
    document.addEventListener("visibilitychange", handler);
    return () => document.removeEventListener("visibilitychange", handler);
  }, []);

  // Fetch favorite auctions directly by domain names with proper pagination
  const fetchFavoriteAuctions = useCallback(async (showLoadingSpinner = true) => {
    if (!user) return;
    const { seq, signal } = beginNewFetch();
    try {
      if (seq === activeFetchSeqRef.current) {
        if (showLoadingSpinner) setLoading(true);
        else setIsFetchingAuctions(true);
        setError(null);
      }

      const from = (currentPage - 1) * itemsPerPage;
      const to = from + itemsPerPage - 1;
      const currentSort = SORT_OPTIONS.find(s => s.value === sortBy) || SORT_OPTIONS[0];
      const now = new Date();
      const endTimeFilter = now.toISOString();

      // First get ALL user's favorite domain names (needed to filter auctions)
      const { data: favData, error: favError } = await supabase
        .from('favorites')
        .select('domain_name')
        .eq('user_id', user.id)
        .abortSignal(signal);

      if (favError) throw favError;

      const favDomains = favData?.map(f => f.domain_name) || [];
      
      if (favDomains.length === 0) {
        if (seq === activeFetchSeqRef.current) {
          setAuctions([]);
          setTotalCount(0);
          setLastRefresh(new Date());
          hasLoadedOnceRef.current = true;
        }
        return;
      }

      // Get total count of active favorite auctions (for accurate pagination)
      let countQuery = supabase
        .from('auctions')
        .select('id', { count: 'exact', head: true })
        .in('domain_name', favDomains)
        .gte('end_time', endTimeFilter)
        .gte('price', filters.minPrice)
        .lte('price', filters.maxPrice);

      if (filters.tld !== "all") {
        countQuery = countQuery.eq('tld', filters.tld.toUpperCase());
      }
      if (filters.auctionType !== "all") {
        countQuery = countQuery.eq('auction_type', filters.auctionType);
      }

       const { count: totalFavCount } = await countQuery;
       if (seq === activeFetchSeqRef.current) setTotalCount(totalFavCount || 0);

      // Now fetch paginated auctions for those domains - optimized query
      let query = supabase
        .from('auctions')
        .select('id,domain_name,end_time,price,bid_count,traffic_count,domain_age,auction_type,tld,valuation,inventory_source')
        .in('domain_name', favDomains)
        .gte('end_time', endTimeFilter);
      
      // Only apply price filters if they differ from defaults
      if (filters.minPrice > 0) {
        query = query.gte('price', filters.minPrice);
      }
      if (filters.maxPrice < 1000000) {
        query = query.lte('price', filters.maxPrice);
      }
      
      if (filters.tld !== "all") {
        query = query.eq('tld', filters.tld.toUpperCase());
      }
      if (filters.auctionType !== "all") {
        query = query.eq('auction_type', filters.auctionType);
      }
      
      // Add primary sort column only
      query = query.order(currentSort.column, { ascending: currentSort.ascending });
      
      // Apply pagination and abort signal
      query = query.range(from, to).abortSignal(signal);

       const { data, error: queryError } = await query;

      if (queryError) throw queryError;

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
          valuation: a.valuation || undefined,
          inventorySource: a.inventory_source || undefined,
        }));
        if (seq === activeFetchSeqRef.current) {
          setAuctions(mapped);
          setLastRefresh(new Date());
          hasLoadedOnceRef.current = true;
        }
      }
    } catch (err) {
      // Ignore aborted/stale requests (common when rapidly changing sort/filter).
      if (seq !== activeFetchSeqRef.current) return;
      if (err instanceof Error && err.name === 'AbortError') {
        setError('Database is busy - please try again in a moment');
        return;
      }
      console.error('Error fetching favorite auctions:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch favorites');
    } finally {
      if (seq === activeFetchSeqRef.current) {
        if (showLoadingSpinner) setLoading(false);
        else setIsFetchingAuctions(false);
      }
    }
  }, [user, beginNewFetch, currentPage, sortBy, filters, itemsPerPage]);

  const fetchAuctionsFromDb = useCallback(async (showLoadingSpinner = true, retryCount = 0) => {
    const MAX_RETRIES = 2;
    const RETRY_DELAY = 1500; // 1.5 seconds between retries
    const { seq, signal } = beginNewFetch();
    
    try {
      if (seq === activeFetchSeqRef.current) {
        if (showLoadingSpinner) setLoading(true);
        else setIsFetchingAuctions(true);
        setError(null);
      }
      
      const from = (currentPage - 1) * itemsPerPage;
      const to = from + itemsPerPage - 1;
      
      // Get current sort option
      const currentSort = SORT_OPTIONS.find(s => s.value === sortBy) || SORT_OPTIONS[0];
      
      const now = new Date();
      const endTimeFilter = now.toISOString();
      
      // Query from database with filters, sorting, and pagination
      // Optimized for 750k+ rows - minimal filters to maximize index usage
      let query = supabase
        .from('auctions')
        .select('id,domain_name,end_time,price,bid_count,traffic_count,domain_age,auction_type,tld,valuation,inventory_source')
        .gte('end_time', endTimeFilter);
      
      // Only apply price filters if they differ from defaults (reduces query complexity)
      if (filters.minPrice > 0) {
        query = query.gte('price', filters.minPrice);
      }
      if (filters.maxPrice < 1000000) {
        query = query.lte('price', filters.maxPrice);
      }
      
      // Apply TLD filter (convert to uppercase to match DB format like .COM)
      if (filters.tld !== "all") {
        query = query.eq('tld', filters.tld.toUpperCase());
      }
      
      // Apply auction type filter
      if (filters.auctionType !== "all") {
        query = query.eq('auction_type', filters.auctionType);
      }
      
      // Add primary sort column only - skip secondary sorts to use simpler query plan
      query = query.order(currentSort.column, { ascending: currentSort.ascending });
      
      // Apply pagination
      query = query.range(from, to + 1).abortSignal(signal); // Fetch one extra to detect if there are more pages
      
      const { data, error: queryError } = await query;
      
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
          valuation: a.valuation || undefined,
          inventorySource: a.inventory_source || undefined,
        }));
        if (seq !== activeFetchSeqRef.current) return;
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
        hasLoadedOnceRef.current = true;
      }
    } catch (err) {
      if (seq !== activeFetchSeqRef.current) return;
      // Handle timeout gracefully with retry logic
      const isTimeoutError = 
        (err instanceof Error && err.name === 'AbortError') ||
        (typeof err === 'object' && err !== null && 'code' in err && (err as { code: string }).code === '57014');
      
      if (isTimeoutError && retryCount < MAX_RETRIES) {
        console.log(`Database timeout, retrying... (${retryCount + 1}/${MAX_RETRIES})`);
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
        return fetchAuctionsFromDb(showLoadingSpinner, retryCount + 1);
      } else if (isTimeoutError) {
        setError('Database is busy - please try again in a moment');
      } else {
        console.error('Error fetching auctions:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch auctions');
      }
    } finally {
      if (seq === activeFetchSeqRef.current) {
        if (showLoadingSpinner) setLoading(false);
        else setIsFetchingAuctions(false);
      }
    }
  }, [beginNewFetch, currentPage, sortBy, filters, itemsPerPage]);
  
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
  
  // Refs for tracking previous values to detect changes (used by effect after fetchDialogMatches)
  const prevHideEndedRef = useRef(hideEndedMatches);
  const prevMatchesPerPageRef = useRef(matchesPerPage);
  
  // Fetch data based on view mode with debounce to prevent UI blocking
  const lastFetchRef = useRef<number>(0);
  const fetchDebounceRef = useRef<number | null>(null);
  const REFETCH_COOLDOWN = 30000; // 30 seconds minimum between auto-refetches
  
  useEffect(() => {
    if (!user) return;
    
    // Clear any pending debounced fetch
    if (fetchDebounceRef.current) {
      clearTimeout(fetchDebounceRef.current);
    }
    
    // Debounce the fetch to prevent rapid state changes from blocking UI
    fetchDebounceRef.current = window.setTimeout(() => {
      const now = Date.now();
      const timeSinceLastFetch = now - lastFetchRef.current;

      // Only apply cooldown when the tab was hidden and then shown again.
      // For normal user interactions (sort/filter/page), fetch immediately.
      if (wasHiddenRef.current && timeSinceLastFetch < REFETCH_COOLDOWN && lastFetchRef.current > 0) {
        wasHiddenRef.current = false;
        return;
      }

      lastFetchRef.current = now;
      wasHiddenRef.current = false;

      const showLoadingSpinner = !hasLoadedOnceRef.current;

      if (viewMode === "favorites") {
        fetchFavoriteAuctions(showLoadingSpinner);
      } else if (viewMode === "all") {
        fetchAuctionsFromDb(showLoadingSpinner);
      }
      // matches tab has its own fetch via fetchDialogMatches
    }, 150); // Let UI settle before kicking off network work
    
    return () => {
      if (fetchDebounceRef.current) {
        clearTimeout(fetchDebounceRef.current);
      }
    };
  }, [
    user,
    viewMode,
    currentPage,
    itemsPerPage,
    filters,
    sortBy,
    fetchAuctionsFromDb,
    fetchFavoriteAuctions,
  ]);

  // NOTE: We intentionally avoid fetching a full matches COUNT on initial dashboard load.
  // That count can be expensive when users have many matches.
  
  // Auto-cleanup old matches (older than 8 days)
  const cleanupOldMatches = useCallback(async () => {
    if (!user) return;
    try {
      const eightDaysAgo = new Date();
      eightDaysAgo.setDate(eightDaysAgo.getDate() - 8);
      
      await supabase
        .from('pattern_alerts')
        .delete()
        .eq('user_id', user.id)
        .lt('alerted_at', eightDaysAgo.toISOString());
    } catch (error) {
      console.error('Error cleaning up old matches:', error);
    }
  }, [user]);

  // Cleanup old matches once per page-load (non-blocking)
  const didCleanupMatchesRef = useRef(false);
  useEffect(() => {
    if (!user) return;
    if (didCleanupMatchesRef.current) return;
    didCleanupMatchesRef.current = true;
    window.setTimeout(() => {
      cleanupOldMatches();
    }, 0);
  }, [user, cleanupOldMatches]);

  // Fetch pattern matches from database with TRUE server-side pagination
  // Uses range() for efficient DB-level pagination instead of fetching all then slicing
  // Includes abort controller to prevent race conditions on rapid page changes
  const matchesFetchSeqRef = useRef(0);
  const matchesFetchControllerRef = useRef<AbortController | null>(null);
  
  const fetchDialogMatches = useCallback(async (page: number = 1, currentHideEnded: boolean = hideEndedMatches, perPage: number = matchesPerPage) => {
    if (!user) return;
    
    // Increment sequence and cancel any in-flight request
    matchesFetchSeqRef.current += 1;
    const seq = matchesFetchSeqRef.current;
    
    if (matchesFetchControllerRef.current) {
      matchesFetchControllerRef.current.abort();
    }
    const controller = new AbortController();
    matchesFetchControllerRef.current = controller;
    
    setLoadingMatches(true);
    try {
      const from = (page - 1) * perPage;
      const to = from + perPage - 1;
      const nowIso = new Date().toISOString();

      // Single DB call with joins + true pagination.
      // Uses foreign keys: pattern_alerts.auction_id -> auctions.id, pattern_alerts.pattern_id -> user_patterns.id
      const select = currentHideEnded
        ? 'id, auction_id, domain_name, pattern_id, alerted_at, auctions!inner(price,end_time,bid_count,traffic_count,domain_age,auction_type,tld,valuation,inventory_source), user_patterns(description)'
        : 'id, auction_id, domain_name, pattern_id, alerted_at, auctions(price,end_time,bid_count,traffic_count,domain_age,auction_type,tld,valuation,inventory_source), user_patterns(description)';

      const countSelect = currentHideEnded
        ? 'id, auctions!inner(id)'
        : 'id';

      let countQuery = supabase
        .from('pattern_alerts')
        .select(countSelect, { count: 'estimated', head: true })
        .eq('user_id', user.id)
        .abortSignal(controller.signal);

      let dataQuery = supabase
        .from('pattern_alerts')
        .select(select)
        .eq('user_id', user.id)
        .order('alerted_at', { ascending: false })
        .range(from, to)
        .abortSignal(controller.signal);

      if (currentHideEnded) {
        countQuery = countQuery.gte('auctions.end_time', nowIso);
        dataQuery = dataQuery.gte('auctions.end_time', nowIso);
      }

      const [countResult, dataResult] = await Promise.all([countQuery, dataQuery]);
      if (dataResult.error) throw dataResult.error;
      if (seq !== matchesFetchSeqRef.current) return;

      const rows = (dataResult.data || []) as Array<any>;
      const matches = rows.map((row) => {
        const auction = Array.isArray(row.auctions) ? row.auctions[0] : row.auctions;
        const pattern = Array.isArray(row.user_patterns) ? row.user_patterns[0] : row.user_patterns;
        return {
          alert_id: row.id,
          auction_id: row.auction_id,
          domain_name: row.domain_name,
          price: Number(auction?.price) || 0,
          end_time: auction?.end_time || null,
          pattern_description: pattern?.description || 'Pattern',
          bid_count: auction?.bid_count || 0,
          traffic_count: auction?.traffic_count || 0,
          domain_age: auction?.domain_age || 0,
          auction_type: auction?.auction_type || 'Bid',
          tld: auction?.tld || '',
          valuation: auction?.valuation || undefined,
          inventory_source: auction?.inventory_source || undefined,
        };
      });

      setDialogMatches(matches);
      setTotalMatchesCount(countResult.count || 0);
    } catch (error) {
      // Ignore aborted requests
      if (error instanceof Error && error.name === 'AbortError') return;
      if (seq !== matchesFetchSeqRef.current) return;
      console.error('Error fetching pattern matches:', error);
      setDialogMatches([]);
      setTotalMatchesCount(0);
    } finally {
      if (seq === matchesFetchSeqRef.current) {
        setLoadingMatches(false);
      }
    }
  }, [user, cleanupOldMatches, matchesPerPage, hideEndedMatches]);

  // Reset matches page AND refetch when matchesPerPage or hideEndedMatches changes
  useEffect(() => {
    // Only trigger if these specific values changed (not on initial render)
    if (prevHideEndedRef.current !== hideEndedMatches || prevMatchesPerPageRef.current !== matchesPerPage) {
      prevHideEndedRef.current = hideEndedMatches;
      prevMatchesPerPageRef.current = matchesPerPage;
      
      // Reset to page 1 and fetch with new settings
      setMatchesPage(1);
      if (viewMode === "matches") {
        // Call with explicit params to ensure we use the latest values
        fetchDialogMatches(1, hideEndedMatches, matchesPerPage);
      }
    }
  }, [matchesPerPage, hideEndedMatches, viewMode, fetchDialogMatches]);

  // Delete a single match
  const deleteMatch = async (alertId: string) => {
    if (!user) return;
    try {
      await supabase
        .from('pattern_alerts')
        .delete()
        .eq('id', alertId)
        .eq('user_id', user.id);
      
      setDialogMatches(prev => prev.filter(m => m.alert_id !== alertId));
      setTotalMatchesCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error deleting match:', error);
    }
  };

  // Clear all matches
  const clearAllMatches = async () => {
    if (!user) return;
    try {
      await supabase
        .from('pattern_alerts')
        .delete()
        .eq('user_id', user.id);
      
      setDialogMatches([]);
      setTotalMatchesCount(0);
      setMatchesPage(1);
    } catch (error) {
      console.error('Error clearing matches:', error);
    }
  };

  // Listen for custom event to open pattern matches tab
  useEffect(() => {
    const handleOpenMatches = () => {
      setViewMode("matches");
      setMatchesPage(1);
      fetchDialogMatches(1);
    };
    window.addEventListener('openPatternMatches', handleOpenMatches);
    return () => window.removeEventListener('openPatternMatches', handleOpenMatches);
  }, [fetchDialogMatches]);

  // Fetch matches when switching to matches tab or changing page
  useEffect(() => {
    if (viewMode === "matches") {
      fetchDialogMatches(matchesPage);
    }
  }, [viewMode, matchesPage, fetchDialogMatches]);

  
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

  // Filter auctions - only apply search filter client-side
  // Pattern matching is handled separately in the "Matches" tab via pattern_alerts
  const filtered = auctions.filter(d => {
    const matchesSearch = d.domain.toLowerCase().includes(search.toLowerCase());
    return matchesSearch;
  });

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-24 pb-12 px-4">
        <div className="container mx-auto">
          <div className="mb-6 sm:mb-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                 <button 
                  onClick={() => {
                    setViewMode("all");
                    setSearch("");
                    setCurrentPage(1);
                    resetFilters();
                  }}
                  className="text-left hover:opacity-80 transition-opacity"
                  title="Reset to dashboard home"
                >
                  <h1 className="text-2xl sm:text-3xl font-bold mb-1 sm:mb-2">Domain <span className="gradient-text">Dashboard</span></h1>
                </button>
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
                  onClick={() => viewMode === "favorites" ? fetchFavoriteAuctions() : fetchAuctionsFromDb()}
                  disabled={loading}
                  title="Refresh data"
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                </Button>
              </div>
            </div>
          </div>

          {/* View Mode Toggle */}
          <div className="mb-4 animate-in fade-in duration-300">
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground">
                <button
                   onClick={() => {
                     setViewMode("all");
                     setCurrentPage(1);
                   }}
                  className={`inline-flex items-center justify-center whitespace-nowrap rounded-sm px-2 sm:px-3 py-1.5 text-sm font-medium transition-all gap-1 sm:gap-2 ${
                    viewMode === "all" 
                      ? "bg-background text-foreground shadow-sm" 
                      : "hover:bg-background/50"
                  }`}
                >
                  <span className="hidden sm:inline">All Domains</span>
                  <span className="sm:hidden">All</span>
                </button>
                <button
                   onClick={() => {
                     setViewMode("favorites");
                     setCurrentPage(1);
                   }}
                  className={`inline-flex items-center justify-center whitespace-nowrap rounded-sm px-2 sm:px-3 py-1.5 text-sm font-medium transition-all gap-1 sm:gap-2 ${
                    viewMode === "favorites" 
                      ? "bg-background text-foreground shadow-sm" 
                      : "hover:bg-background/50"
                  }`}
                >
                  <Heart className="w-4 h-4" />
                  <span className="hidden sm:inline">Favorites</span>
                  {favoritesCount > 0 && (
                    <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                      {favoritesCount}
                    </Badge>
                  )}
                </button>
                <button
                   onClick={() => {
                     setViewMode("matches");
                     setCurrentPage(1);
                   }}
                  className={`inline-flex items-center justify-center whitespace-nowrap rounded-sm px-2 sm:px-3 py-1.5 text-sm font-medium transition-all gap-1 sm:gap-2 ${
                    viewMode === "matches" 
                      ? "bg-background text-foreground shadow-sm" 
                      : "hover:bg-background/50"
                  }`}
                >
                  <Target className="w-4 h-4" />
                  <span>Matches</span>
                  {totalMatchesCount > 0 && (
                    <Badge variant="default" className="ml-1 h-5 px-1.5 text-xs bg-primary">
                      {totalMatchesCount}
                    </Badge>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Search and Actions Bar - Hidden in matches view */}
          {viewMode !== "matches" && (
            <div className="flex flex-col gap-3 sm:flex-row sm:gap-4 mb-4 animate-in fade-in duration-300 delay-100">
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
                <Select
                  value={sortBy}
                   onValueChange={(value) => startSortTransition(() => {
                     setCurrentPage(1);
                     setSortBy(value);
                   })}
                >
                  <SelectTrigger className="w-[140px] sm:w-[180px] bg-background flex-shrink-0">
                    <ArrowUpDown className="w-4 h-4 mr-1 sm:mr-2" />
                    <SelectValue placeholder="Sort by" />
                    {(isSortPending || isFetchingAuctions) && (
                      <Loader2 className="ml-auto h-4 w-4 animate-spin text-muted-foreground" />
                    )}
                  </SelectTrigger>
                  <SelectContent className="bg-popover text-popover-foreground border border-border shadow-md z-[100]">
                    {SORT_OPTIONS.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Filters Panel - Hidden in matches view */}
          {showFilters && viewMode !== "matches" && (
            <div 
              className="mb-6 p-4 rounded-xl glass border border-border animate-in fade-in slide-in-from-top-2 duration-200"
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
                  <Select
                    value={filters.tld}
                    onValueChange={(value) => startSortTransition(() => {
                      setCurrentPage(1);
                      setFilters(f => ({ ...f, tld: value }));
                    })}
                  >
                    <SelectTrigger className="bg-background">
                      <SelectValue placeholder="Select TLD" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover text-popover-foreground border border-border shadow-md z-[100]">
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
                  <Select
                    value={filters.auctionType}
                    onValueChange={(value) => startSortTransition(() => {
                      setCurrentPage(1);
                      setFilters(f => ({ ...f, auctionType: value }));
                    })}
                  >
                    <SelectTrigger className="bg-background">
                      <SelectValue placeholder="Select Type" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover text-popover-foreground border border-border shadow-md z-[100]">
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
                        onClick={() => startSortTransition(() => {
                          setCurrentPage(1);
                          setFilters(f => ({ ...f, minPrice: preset.min, maxPrice: preset.max }));
                        })}
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
            </div>
          )}

          {/* Add Patterns, Saved Patterns, and Alerts - Hidden in matches view */}
          {viewMode !== "matches" && (
            <div className="mb-4 flex flex-wrap items-center gap-2 sm:gap-3 animate-in fade-in duration-300 delay-150">
              <PatternDialog patterns={patterns} onAddPattern={addPattern} onRemovePattern={removePattern} onClearPatterns={clearPatterns} maxPatterns={maxPatterns} />
              <Link to="/settings">
                <Button
                  variant={notificationsEnabled ? "default" : "outline"}
                  size="sm"
                  className="gap-1 sm:gap-2"
                >
                  {notificationsEnabled ? (
                    <Bell className="w-4 h-4" />
                  ) : (
                    <BellOff className="w-4 h-4" />
                  )}
                  <span className="hidden sm:inline">{notificationsEnabled ? 'Alerts ON' : 'Alerts OFF'}</span>
                  <span className="sm:hidden">{notificationsEnabled ? 'ON' : 'OFF'}</span>
                </Button>
              </Link>
              <SavedPatternsDialog
                patterns={patterns}
                onRemovePattern={removePattern}
                onTogglePattern={togglePattern}
                onRenamePattern={renamePattern}
                onUpdatePattern={updatePattern}
                maxPatterns={maxPatterns}
              />
            </div>
          )}

          {/* Pattern Matches View */}
          {viewMode === "matches" && (
            <div className="animate-in fade-in duration-300 delay-100">
              {loadingMatches ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 text-primary animate-spin" />
                  <span className="ml-3 text-muted-foreground">Loading matches...</span>
                </div>
              ) : dialogMatches.length > 0 ? (
                <div className="space-y-4">
                  {/* Header with controls */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-3">
                      <p className="text-sm text-muted-foreground">
                        Showing {Math.min((matchesPage - 1) * matchesPerPage + 1, totalMatchesCount)}-{Math.min(matchesPage * matchesPerPage, totalMatchesCount)} of {totalMatchesCount} matches
                      </p>
                      {/* Hide ended toggle */}
                      <label className="flex items-center gap-2 text-sm cursor-pointer">
                        <input
                          type="checkbox"
                          checked={hideEndedMatches}
                          onChange={(e) => setHideEndedMatches(e.target.checked)}
                          className="rounded border-border"
                        />
                        <span className="text-muted-foreground">
                          {hideEndedMatches ? "Ended hidden" : "Show ended"}
                        </span>
                      </label>
                    </div>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4 mr-1" />
                          <span className="hidden sm:inline">Clear All</span>
                          <span className="sm:hidden">Clear</span>
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Clear all matches?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will remove all {totalMatchesCount} pattern matches from your history. This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={clearAllMatches} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            Clear All
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>

                  {/* Matches table view */}
                  {(() => {
                    // Convert matches to AuctionDomain format for the table
                    const matchesAsDomains: AuctionDomain[] = dialogMatches.map(match => ({
                      id: match.auction_id,
                      domain: match.domain_name,
                      auctionEndTime: match.end_time || '',
                      price: match.price,
                      numberOfBids: match.bid_count || 0,
                      traffic: match.traffic_count || 0,
                      domainAge: match.domain_age || 0,
                      auctionType: match.auction_type || 'Bid',
                      tld: match.tld || '',
                      valuation: match.valuation,
                      inventorySource: match.inventory_source,
                    }));

                    // Create pattern descriptions map
                    const patternMap: Record<string, string> = {};
                    dialogMatches.forEach(match => {
                      patternMap[match.auction_id] = match.pattern_description;
                    });

                    return (
                      <DomainTable
                        domains={matchesAsDomains}
                        onDomainClick={(d) => {
                          setSelectedDomain(d);
                          setDetailSheetOpen(true);
                        }}
                        showPatternColumn={true}
                        patternDescriptions={patternMap}
                      />
                    );
                  })()}

                  {/* Pagination for matches - configurable results per page */}
                  {totalMatchesCount > 0 && (
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-border">
                      {/* Items per page selector */}
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">Show:</span>
                        <Select value={matchesPerPage.toString()} onValueChange={(v) => setMatchesPerPage(Number(v))}>
                          <SelectTrigger className="w-20 h-8 bg-background">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-background border border-border z-50">
                            <SelectItem value="10">10</SelectItem>
                            <SelectItem value="50">50</SelectItem>
                            <SelectItem value="100">100</SelectItem>
                            <SelectItem value="250">250</SelectItem>
                          </SelectContent>
                        </Select>
                        <span className="text-sm text-muted-foreground">per page</span>
                      </div>

                      {/* Page navigation */}
                      {Math.ceil(totalMatchesCount / matchesPerPage) > 1 && (
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setMatchesPage(p => Math.max(1, p - 1))}
                            disabled={matchesPage === 1}
                          >
                            <ChevronLeft className="w-4 h-4" />
                          </Button>
                          <span className="text-sm text-muted-foreground px-2">
                            Page {matchesPage} of {Math.ceil(totalMatchesCount / matchesPerPage)}
                          </span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setMatchesPage(p => Math.min(Math.ceil(totalMatchesCount / matchesPerPage), p + 1))}
                            disabled={matchesPage >= Math.ceil(totalMatchesCount / matchesPerPage)}
                          >
                            <ChevronRight className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Target className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
                  <p className="mb-2">No pattern matches found.</p>
                  <p className="text-xs text-muted-foreground">
                    Matches will appear here when your patterns find new domains.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Standard Auctions View */}
          {viewMode !== "matches" && loading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
              <span className="ml-3 text-muted-foreground">Loading auctions...</span>
            </div>
          )}

          {viewMode !== "matches" && error && !loading && (
            <div className="text-center py-12">
              <p className="text-destructive mb-4">{error}</p>
              <Button variant="outline" onClick={() => window.location.reload()}>Retry</Button>
            </div>
          )}

          {viewMode !== "matches" && !loading && !error && filtered.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <p className="mb-2">No auctions found matching your criteria.</p>
              {activeFilterCount > 0 && (
                <Button variant="outline" onClick={resetFilters}>Clear Filters</Button>
              )}
            </div>
          )}

          {viewMode !== "matches" && !loading && !error && filtered.length > 0 && (
            <>
              {/* Favorites header with Clear All button */}
              {viewMode === "favorites" && totalCount > 0 && (
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm text-muted-foreground">
                    Showing {Math.min((currentPage - 1) * itemsPerPage + 1, totalCount)}-{Math.min(currentPage * itemsPerPage, totalCount)} of {totalCount} favorite{totalCount !== 1 ? 's' : ''}
                  </p>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4 mr-1" />
                        <span className="hidden sm:inline">Clear All</span>
                        <span className="sm:hidden">Clear</span>
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Clear All Favorites?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will remove all {favoritesCount} domains from your favorites. This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={async () => {
                            await clearAllFavorites();
                            setAuctions([]);
                            setTotalCount(0);
                          }}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Clear All
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              )}
              <div className="animate-in fade-in duration-300 delay-200">
                <DomainTable
                  domains={filtered}
                  onDomainClick={(d) => {
                    setSelectedDomain(d);
                    setDetailSheetOpen(true);
                  }}
                  sortBy={sortBy}
                  onSortChange={(newSort) => startSortTransition(() => {
                    setCurrentPage(1);
                    setSortBy(newSort);
                  })}
                />
              </div>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div 
                  className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4 animate-in fade-in duration-300"
                >
                  {/* Items per page selector */}
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Show:</span>
                    <Select
                      value={itemsPerPage.toString()}
                      onValueChange={(v) => startSortTransition(() => {
                        setCurrentPage(1);
                        setItemsPerPage(Number(v));
                      })}
                    >
                      <SelectTrigger className="w-20 h-8 bg-background">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-background border border-border z-50">
                        <SelectItem value="10">10</SelectItem>
                        <SelectItem value="50">50</SelectItem>
                        <SelectItem value="100">100</SelectItem>
                        <SelectItem value="250">250</SelectItem>
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
                </div>
              )}
              
            </>
          )}
        </div>

        {/* Domain Detail Sheet */}
        <DomainDetailSheet
          domain={selectedDomain}
          open={detailSheetOpen}
          onOpenChange={setDetailSheetOpen}
        />
      </main>
    </div>
  );
}
