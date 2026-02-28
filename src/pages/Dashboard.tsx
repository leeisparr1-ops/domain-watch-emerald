import { useState, useEffect, useCallback, useRef, useTransition, useMemo } from "react";
import { Loader2, Bell, BellOff, Trash2, Heart, Download, CheckSquare } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/layout/Navbar";
import { useAuth } from "@/hooks/useAuth";
import { useFavorites } from "@/hooks/useFavorites";
import { useAuctionAlerts } from "@/hooks/useAuctionAlerts";
import { useUserPatterns } from "@/hooks/useUserPatterns";
import { usePatternAlerts } from "@/hooks/usePatternAlerts";
import { Navigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
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
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { ViewModeToggle } from "@/components/dashboard/ViewModeToggle";
import { SearchAndFilters, SORT_OPTIONS } from "@/components/dashboard/SearchAndFilters";
import { MatchesView } from "@/components/dashboard/MatchesView";
import { PaginationControls } from "@/components/dashboard/PaginationControls";
import { useDashboardKeyboardShortcuts } from "@/hooks/useDashboardKeyboardShortcuts";
import { useDismissedDomains } from "@/hooks/useDismissedDomains";

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
  brandabilityScore?: number | null;
  pronounceabilityScore?: number | null;
  trademarkRisk?: string | null;
}

interface Filters {
  tld: string;
  auctionType: string;
  minPrice: number;
  maxPrice: number;
  inventorySource: string;
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
  const { isFavorite, toggleFavorite, count: favoritesCount, clearAllFavorites, favoriteDomains, loading: favoritesLoading } = useFavorites();
  const { notificationsEnabled, toggleNotifications, permissionStatus } = useAuctionAlerts();
  const { patterns, addPattern, removePattern, togglePattern, renamePattern, updatePattern, clearPatterns, matchesDomain, hasPatterns, checkPatterns, checking, maxPatterns, enabledCount } = useUserPatterns();
  usePatternAlerts({ enabledCount, checkPatterns });
  const { isDismissed, dismissDomain, dismissMany, undismiss, dismissedCount, dismissedList } = useDismissedDomains();
  // Track pending refetch after dismiss actions
  const [dismissRefetchTrigger, setDismissRefetchTrigger] = useState(0);

  // Wrap dismiss actions to trigger a matches refetch afterward
  // Optimistic count updates ensure the badge decrements immediately
  const handleDismissDomain = useCallback(async (domainName: string) => {
    // Optimistic: decrement count immediately so user sees feedback
    setTotalMatchesCount(prev => Math.max(0, prev - 1));
    // Remove from current page display immediately
    setDialogMatches(prev => prev.filter(m => m.domain_name !== domainName));
    await dismissDomain(domainName);
    setDismissRefetchTrigger(t => t + 1);
  }, [dismissDomain]);

  const handleDismissMany = useCallback(async (domainNames: string[]) => {
    const dismissSet = new Set(domainNames);
    // Optimistic: decrement count and remove from display
    setTotalMatchesCount(prev => Math.max(0, prev - domainNames.length));
    setDialogMatches(prev => prev.filter(m => !dismissSet.has(m.domain_name)));
    await dismissMany(domainNames);
    setMatchesPage(1);
    setDismissRefetchTrigger(t => t + 1);
  }, [dismissMany]);

  const handleUndismiss = useCallback(async (domainName: string) => {
    // Optimistic: increment count
    setTotalMatchesCount(prev => prev + 1);
    await undismiss(domainName);
    setDismissRefetchTrigger(t => t + 1);
  }, [undismiss]);
  const [isSortPending, startSortTransition] = useTransition();
  const [isFetchingAuctions, setIsFetchingAuctions] = useState(false);
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
  const [hideEndedMatches, setHideEndedMatches] = useState(true);
  const [loadingMatches, setLoadingMatches] = useState(false);
  // Persistent filters from localStorage
  const STORAGE_KEY = "eh_dashboard_prefs";
  const savedPrefs = useMemo(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  }, []);

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [auctions, setAuctions] = useState<AuctionDomain[]>([]);
  const [selectedDomain, setSelectedDomain] = useState<AuctionDomain | null>(null);
  const [detailSheetOpen, setDetailSheetOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewMode] = useState<"all" | "favorites" | "matches">(savedPrefs?.viewMode || "all");
  const [itemsPerPage, setItemsPerPage] = useState(savedPrefs?.itemsPerPage || 50);
  const [jumpToPage, setJumpToPage] = useState("");
  const [filters, setFilters] = useState<Filters>(savedPrefs?.filters || {
    tld: "all",
    auctionType: "all",
    minPrice: 0,
    maxPrice: 1000000,
    inventorySource: "godaddy",
  });
  const [sortBy, setSortBy] = useState(savedPrefs?.sortBy || "end_time_asc");

  // Persist filter/sort preferences
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ filters, sortBy, viewMode, itemsPerPage }));
    } catch { /* quota exceeded - ignore */ }
  }, [filters, sortBy, viewMode, itemsPerPage]);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [totalDomainCount, setTotalDomainCount] = useState<number | null>(null);
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const TIME_UPDATE_INTERVAL = 60 * 1000;
  
  const activeFilterCount = [
    filters.tld !== "all",
    filters.auctionType !== "all",
    filters.minPrice > 0 || filters.maxPrice < 1000000,
    filters.inventorySource !== "all",
  ].filter(Boolean).length;

  // Fetch real domain count from DB
  const didFetchTotalRef = useRef(false);
  useEffect(() => {
    if (didFetchTotalRef.current) return;
    didFetchTotalRef.current = true;
    (async () => {
      try {
        const { data, error } = await supabase.rpc('get_auction_count');
        if (!error && data && data > 100000) {
          setTotalDomainCount(data);
        } else {
          setTotalDomainCount(1300000);
        }
      } catch {
        setTotalDomainCount(1300000);
      }
    })();
  }, []);

  // Track tab visibility
  useEffect(() => {
    const handler = () => {
      if (document.visibilityState === "hidden") {
        wasHiddenRef.current = true;
      }
    };
    document.addEventListener("visibilitychange", handler);
    return () => document.removeEventListener("visibilitychange", handler);
  }, []);

  // Fetch favorite auctions — reuses cached favoriteDomains from useFavorites (no extra DB call)
  const fetchFavoriteAuctions = useCallback(async (showLoadingSpinner = true) => {
    if (!user) return;
    // Wait for favorites to load before querying auctions
    if (favoritesLoading) return;
    const { seq, signal } = beginNewFetch();
    try {
      if (seq === activeFetchSeqRef.current) {
        if (showLoadingSpinner) setLoading(true);
        else setIsFetchingAuctions(true);
        setError(null);
      }

      // Use cached favorites from useFavorites hook — no extra DB round-trip
      if (favoriteDomains.length === 0) {
        if (seq === activeFetchSeqRef.current) {
          setAuctions([]);
          setTotalCount(0);
          setLastRefresh(new Date());
          hasLoadedOnceRef.current = true;
        }
        return;
      }

      const from = (currentPage - 1) * itemsPerPage;
      const to = from + itemsPerPage - 1;
      const currentSort = SORT_OPTIONS.find(s => s.value === sortBy) || SORT_OPTIONS[0];
      const endTimeFilter = new Date().toISOString();

      // Single query with count: 'exact' — combines count + data in one round-trip
      let query = supabase
        .from('auctions')
        .select('id,domain_name,end_time,price,bid_count,traffic_count,domain_age,auction_type,tld,valuation,inventory_source,brandability_score,pronounceability_score,trademark_risk', { count: 'exact' })
        .in('domain_name', favoriteDomains)
        .gte('end_time', endTimeFilter);
      if (filters.minPrice > 0) query = query.gte('price', filters.minPrice);
      if (filters.maxPrice < 1000000) query = query.lte('price', filters.maxPrice);
      if (filters.tld !== "all") query = query.ilike('tld', filters.tld);
      if (filters.auctionType === "bid") query = query.in('auction_type', ['Bid', 'auction']);
      else if (filters.auctionType === "buynow") query = query.in('auction_type', ['BuyNow', 'buy-now']);
      if (filters.inventorySource === "namecheap") query = query.eq('inventory_source', 'namecheap');
      else if (filters.inventorySource === "godaddy") query = query.neq('inventory_source', 'namecheap');
      query = query.order(currentSort.column, { ascending: currentSort.ascending });
      query = query.range(from, to).abortSignal(signal);

      const { data, count, error: queryError } = await query;
      if (queryError) throw queryError;
      if (seq !== activeFetchSeqRef.current) return;
      setTotalCount(count ?? 0);
      if (data) {
        const mapped: AuctionDomain[] = data.map(a => ({
          id: a.id, domain: a.domain_name, auctionEndTime: a.end_time || '',
          price: Number(a.price) || 0, numberOfBids: a.bid_count || 0,
          traffic: a.traffic_count || 0, domainAge: a.domain_age || 0,
          auctionType: a.auction_type || 'auction', tld: a.tld || '',
          valuation: a.valuation || undefined, inventorySource: a.inventory_source || undefined,
          brandabilityScore: (a as any).brandability_score ?? null,
          pronounceabilityScore: (a as any).pronounceability_score ?? null,
          trademarkRisk: (a as any).trademark_risk ?? null,
        }));
        setAuctions(mapped);
        setLastRefresh(new Date());
        hasLoadedOnceRef.current = true;
      }
    } catch (err) {
      if (seq !== activeFetchSeqRef.current) return;
      if (err instanceof Error && err.name === 'AbortError') {
        setError('The server is under heavy load. Please tap Retry or wait a moment.');
        return;
      }
      console.error('Error fetching favorite auctions:', err);
      setError('Unable to load favorites right now. Please tap Retry.');
    } finally {
      if (seq === activeFetchSeqRef.current) {
        if (showLoadingSpinner) setLoading(false);
        else setIsFetchingAuctions(false);
      }
    }
  }, [user, beginNewFetch, currentPage, sortBy, filters, itemsPerPage, favoriteDomains, favoritesLoading]);

  const fetchAuctionsFromDb = useCallback(async (showLoadingSpinner = true, retryCount = 0) => {
    const MAX_RETRIES = 2;
    const RETRY_DELAY = 1500;
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
      const endTimeFilter = new Date().toISOString();
      
      let query = supabase
        .from('auctions')
        .select('id,domain_name,end_time,price,bid_count,traffic_count,domain_age,auction_type,tld,valuation,inventory_source,brandability_score,pronounceability_score,trademark_risk')
        .gte('end_time', endTimeFilter);
      if (debouncedSearch) query = query.ilike('domain_name', `%${debouncedSearch}%`);
      if (filters.minPrice > 0) query = query.gte('price', filters.minPrice);
      if (filters.maxPrice < 1000000) query = query.lte('price', filters.maxPrice);
      if (filters.tld !== "all") query = query.ilike('tld', filters.tld);
      if (filters.auctionType === "bid") query = query.in('auction_type', ['Bid', 'auction']);
      else if (filters.auctionType === "buynow") query = query.in('auction_type', ['BuyNow', 'buy-now']);
      if (filters.inventorySource === "namecheap") query = query.eq('inventory_source', 'namecheap');
      else if (filters.inventorySource === "godaddy") query = query.neq('inventory_source', 'namecheap');
      query = query.order(currentSort.column, { ascending: currentSort.ascending });
      query = query.range(from, to + 1).abortSignal(signal);
      
      const { data, error: queryError } = await query;
      if (filters.inventorySource !== "all") {
        console.log('[Dashboard]', `Source=${filters.inventorySource} Sort=${sortBy} Rows=${data?.length ?? 0} Err=${queryError?.message ?? 'none'}`);
      }
      if (queryError) throw queryError;
      
      if (data) {
        const hasMore = data.length > itemsPerPage;
        const resultsToShow = hasMore ? data.slice(0, itemsPerPage) : data;
        const mapped: AuctionDomain[] = resultsToShow.map(a => ({
          id: a.id, domain: a.domain_name, auctionEndTime: a.end_time || '',
          price: Number(a.price) || 0, numberOfBids: a.bid_count || 0,
          traffic: a.traffic_count || 0, domainAge: a.domain_age || 0,
          auctionType: a.auction_type || 'auction', tld: a.tld || '',
          valuation: a.valuation || undefined, inventorySource: a.inventory_source || undefined,
          brandabilityScore: (a as any).brandability_score ?? null,
          pronounceabilityScore: (a as any).pronounceability_score ?? null,
          trademarkRisk: (a as any).trademark_risk ?? null,
        }));
        if (seq !== activeFetchSeqRef.current) return;
        setAuctions(mapped);
        if (hasMore) {
          if (totalDomainCount && filters.tld === "all" && filters.auctionType === "all" && filters.inventorySource === "all" && filters.minPrice === 0 && filters.maxPrice >= 1000000) {
            setTotalCount(totalDomainCount);
          } else {
            const newEstimate = from + itemsPerPage * 1000;
            setTotalCount(prev => Math.max(prev, newEstimate));
          }
        } else {
          setTotalCount(from + mapped.length);
        }
        setLastRefresh(new Date());
        hasLoadedOnceRef.current = true;
      }
    } catch (err) {
      if (seq !== activeFetchSeqRef.current) return;
      const errCode = (typeof err === 'object' && err !== null && 'code' in err) ? (err as { code: string }).code : '';
      const errMsg = err instanceof Error ? err.message : (typeof err === 'object' && err !== null && 'message' in err) ? (err as { message: string }).message : String(err);
      const isTimeoutError = (err instanceof Error && err.name === 'AbortError') || errCode === '57014';
      if (!isTimeoutError || retryCount >= MAX_RETRIES) toast.error(`Query error: ${errMsg}`);
      if (isTimeoutError && retryCount < MAX_RETRIES) {
        console.log(`Database timeout, retrying... (${retryCount + 1}/${MAX_RETRIES})`);
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
        return fetchAuctionsFromDb(showLoadingSpinner, retryCount + 1);
      } else if (isTimeoutError) {
        setError('The server is under heavy load. Please tap Retry or wait a moment.');
      } else {
        console.error('Error fetching auctions:', err);
        setError('Unable to load domains right now. Please tap Retry.');
      }
    } finally {
      if (seq === activeFetchSeqRef.current) {
        if (showLoadingSpinner) setLoading(false);
        else setIsFetchingAuctions(false);
      }
    }
  }, [beginNewFetch, currentPage, sortBy, filters, itemsPerPage, debouncedSearch]);
  
  function resetFilters() {
    setFilters({ tld: "all", auctionType: "all", minPrice: 0, maxPrice: 1000000, inventorySource: "all" });
    setCurrentPage(1);
  }
  
  const prevHideEndedRef = useRef(hideEndedMatches);
  const prevMatchesPerPageRef = useRef(matchesPerPage);
  
  // Fetch data with debounce
  const lastFetchRef = useRef<number>(0);
  const fetchDebounceRef = useRef<number | null>(null);
  const REFETCH_COOLDOWN = 30000;
  
  useEffect(() => {
    if (!user) return;
    if (fetchDebounceRef.current) clearTimeout(fetchDebounceRef.current);
    fetchDebounceRef.current = window.setTimeout(() => {
      const now = Date.now();
      const timeSinceLastFetch = now - lastFetchRef.current;
      if (wasHiddenRef.current && timeSinceLastFetch < REFETCH_COOLDOWN && lastFetchRef.current > 0) {
        wasHiddenRef.current = false;
        return;
      }
      lastFetchRef.current = now;
      wasHiddenRef.current = false;
      const showLoadingSpinner = !hasLoadedOnceRef.current;
      if (viewMode === "favorites") fetchFavoriteAuctions(showLoadingSpinner);
      else if (viewMode === "all") fetchAuctionsFromDb(showLoadingSpinner);
    }, 150);
    return () => { if (fetchDebounceRef.current) clearTimeout(fetchDebounceRef.current); };
  }, [user, viewMode, currentPage, itemsPerPage, filters, sortBy, fetchAuctionsFromDb, fetchFavoriteAuctions]);

  // Auto-cleanup old matches
  const cleanupOldMatches = useCallback(async () => {
    if (!user) return;
    try {
      const eightDaysAgo = new Date();
      eightDaysAgo.setDate(eightDaysAgo.getDate() - 8);
      const { data: oldMatches } = await supabase
        .from('pattern_alerts').select('id').eq('user_id', user.id)
        .lt('alerted_at', eightDaysAgo.toISOString()).limit(100);
      if (oldMatches && oldMatches.length > 0) {
        await supabase.from('pattern_alerts').delete().in('id', oldMatches.map(m => m.id));
      }
    } catch (error) { /* silent */ }
  }, [user]);

  const didCleanupMatchesRef = useRef(false);
  useEffect(() => {
    if (!user || didCleanupMatchesRef.current) return;
    didCleanupMatchesRef.current = true;
    const timeoutId = window.setTimeout(() => cleanupOldMatches(), 60000);
    return () => clearTimeout(timeoutId);
  }, [user, cleanupOldMatches]);

  // Fetch pattern matches with pagination
  const matchesFetchSeqRef = useRef(0);
  const matchesFetchControllerRef = useRef<AbortController | null>(null);
  
  const fetchDialogMatches = useCallback(async (page: number = 1, currentHideEnded: boolean = hideEndedMatches, perPage: number = matchesPerPage) => {
    if (!user) return;
    matchesFetchSeqRef.current += 1;
    const seq = matchesFetchSeqRef.current;
    if (matchesFetchControllerRef.current) matchesFetchControllerRef.current.abort();
    const controller = new AbortController();
    matchesFetchControllerRef.current = controller;
    const timeoutId = setTimeout(() => controller.abort(), 15000);
    
    setLoadingMatches(true);
    try {
      const from = (page - 1) * perPage;

      const { data, error: rpcError } = await supabase
        .rpc('get_pattern_matches', {
          p_user_id: user.id,
          p_hide_ended: currentHideEnded,
          p_offset: from,
          p_limit: perPage,
        })
        .abortSignal(controller.signal);

      clearTimeout(timeoutId);
      if (rpcError) throw rpcError;
      if (seq !== matchesFetchSeqRef.current) return;

      const rows = (data || []) as Array<any>;
      const totalFromDb = rows.length > 0 ? Number(rows[0].total_count) : 0;
      setTotalMatchesCount(totalFromDb);

      const matches = rows.map((row: any) => ({
        alert_id: row.alert_id,
        auction_id: row.auction_id,
        domain_name: row.domain_name,
        price: Number(row.price) || 0,
        end_time: row.end_time || null,
        pattern_description: row.pattern_description || 'Pattern',
        bid_count: row.bid_count || 0,
        traffic_count: row.traffic_count || 0,
        domain_age: row.domain_age || 0,
        auction_type: row.auction_type || 'Bid',
        tld: row.tld || '',
        valuation: row.valuation ? Number(row.valuation) : undefined,
        inventory_source: row.inventory_source || undefined,
      }));
      setDialogMatches(matches);
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        if (seq === matchesFetchSeqRef.current) { setDialogMatches([]); setTotalMatchesCount(0); setLoadingMatches(false); }
        return;
      }
      if (seq !== matchesFetchSeqRef.current) return;
      setDialogMatches([]);
      setTotalMatchesCount(0);
    } finally {
      if (seq === matchesFetchSeqRef.current) setLoadingMatches(false);
    }
  }, [user, matchesPerPage, hideEndedMatches]);

  useEffect(() => {
    if (prevHideEndedRef.current !== hideEndedMatches || prevMatchesPerPageRef.current !== matchesPerPage) {
      prevHideEndedRef.current = hideEndedMatches;
      prevMatchesPerPageRef.current = matchesPerPage;
      setMatchesPage(1);
      if (viewMode === "matches") fetchDialogMatches(1, hideEndedMatches, matchesPerPage);
    }
  }, [matchesPerPage, hideEndedMatches, viewMode, fetchDialogMatches]);

  const clearAllMatches = async () => {
    if (!user) return;
    try {
      await supabase.from('pattern_alerts').delete().eq('user_id', user.id);
      setDialogMatches([]);
      setTotalMatchesCount(0);
      setMatchesPage(1);
    } catch (error) { console.error('Error clearing matches:', error); }
  };

  // Fetch initial match count using the RPC (excludes dismissed domains)
  const didFetchInitialCountRef = useRef(false);
  useEffect(() => {
    if (!user || didFetchInitialCountRef.current) return;
    didFetchInitialCountRef.current = true;
    const fetchInitialMatchCount = async () => {
      try {
        const { data, error } = await supabase.rpc('get_pattern_matches', {
          p_user_id: user.id,
          p_hide_ended: true,
          p_offset: 0,
          p_limit: 1,
        });
        if (!error && data && (data as any[]).length > 0) {
          setTotalMatchesCount(Number((data as any[])[0].total_count));
        } else if (!error) {
          setTotalMatchesCount(0);
        }
      } catch (error) { console.error('Error fetching initial match count:', error); }
    };
    fetchInitialMatchCount();
  }, [user]);

  useEffect(() => {
    const handleOpenMatches = () => { setViewMode("matches"); setMatchesPage(1); fetchDialogMatches(1); };
    window.addEventListener('openPatternMatches', handleOpenMatches);
    return () => window.removeEventListener('openPatternMatches', handleOpenMatches);
  }, [fetchDialogMatches]);

  useEffect(() => {
    if (viewMode === "matches") fetchDialogMatches(matchesPage);
  }, [viewMode, matchesPage, fetchDialogMatches]);

  // Refetch matches after dismiss/undismiss actions
  useEffect(() => {
    if (dismissRefetchTrigger > 0 && viewMode === "matches") {
      fetchDialogMatches(matchesPage);
    }
  }, [dismissRefetchTrigger]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const timer = setTimeout(() => { setDebouncedSearch(search); setCurrentPage(1); }, 250);
    return () => clearTimeout(timer);
  }, [search]);

  const [, setTimeTick] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => { setTimeTick(t => t + 1); }, TIME_UPDATE_INTERVAL);
    return () => clearInterval(interval);
  }, [TIME_UPDATE_INTERVAL]);
  
  const totalPages = Math.ceil(totalCount / itemsPerPage);
  const filtered = auctions;

  // Clear selections when page/view changes
  useEffect(() => { setSelectedRows(new Set()); setHighlightedIndex(-1); }, [currentPage, viewMode]);

  // Bulk action handlers
  const toggleRowSelection = useCallback((id: string) => {
    setSelectedRows(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const selectAllOnPage = useCallback(() => {
    if (selectedRows.size === filtered.length) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(filtered.map(d => d.id)));
    }
  }, [filtered, selectedRows.size]);

  const bulkFavorite = useCallback(async () => {
    if (selectedRows.size === 0) return;
    const domainsToFav = filtered.filter(d => selectedRows.has(d.id));
    for (const d of domainsToFav) {
      if (!isFavorite(d.domain)) await toggleFavorite(d.domain, d.id);
    }
    setSelectedRows(new Set());
    toast.success(`Added ${domainsToFav.length} domains to favorites`);
  }, [selectedRows, filtered, isFavorite, toggleFavorite]);

  const bulkUnfavorite = useCallback(async () => {
    if (selectedRows.size === 0) return;
    const domainsToRemove = filtered.filter(d => selectedRows.has(d.id));
    for (const d of domainsToRemove) {
      if (isFavorite(d.domain)) await toggleFavorite(d.domain, d.id);
    }
    setSelectedRows(new Set());
    toast.success(`Removed ${domainsToRemove.length} domains from favorites`);
  }, [selectedRows, filtered, isFavorite, toggleFavorite]);

  const exportSelectedCsv = useCallback(() => {
    const rows = selectedRows.size > 0
      ? filtered.filter(d => selectedRows.has(d.id))
      : filtered;
    if (rows.length === 0) return;
    const header = "Domain,Price,Bids,Age,TLD,Ends,Source\n";
    const csv = header + rows.map(d =>
      `${d.domain},${d.price},${d.numberOfBids},${d.domainAge},${d.tld},${d.auctionEndTime},${d.inventorySource || ''}`
    ).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `expiredhawk-export-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${rows.length} domains to CSV`);
  }, [selectedRows, filtered]);

  // Keyboard shortcuts
  useDashboardKeyboardShortcuts({
    enabled: viewMode !== "matches" && !detailSheetOpen,
    onNavigateUp: () => setHighlightedIndex(prev => Math.max(0, prev - 1)),
    onNavigateDown: () => setHighlightedIndex(prev => Math.min(filtered.length - 1, prev + 1)),
    onToggleFavorite: () => {
      if (highlightedIndex >= 0 && highlightedIndex < filtered.length) {
        const d = filtered[highlightedIndex];
        toggleFavorite(d.domain, d.id);
      }
    },
    onFocusSearch: () => searchInputRef.current?.focus(),
    onOpenDetail: () => {
      if (highlightedIndex >= 0 && highlightedIndex < filtered.length) {
        handleDomainClick(filtered[highlightedIndex]);
      }
    },
  });

  if (authLoading) return <div className="min-h-screen bg-background flex items-center justify-center"><div className="animate-pulse text-primary">Loading...</div></div>;
  if (!user) return <Navigate to="/login" />;

  const handleViewChange = (mode: "all" | "favorites" | "matches") => {
    setViewMode(mode);
    setCurrentPage(1);
  };

  const handleDomainClick = (d: AuctionDomain) => {
    setSelectedDomain(d);
    setDetailSheetOpen(true);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-24 pb-12 px-4">
        <div className="container mx-auto">
          <DashboardHeader
            totalDomainCount={totalDomainCount}
            lastRefresh={lastRefresh}
            loading={loading}
            onRefresh={() => viewMode === "favorites" ? fetchFavoriteAuctions() : fetchAuctionsFromDb()}
            onReset={() => { setViewMode("all"); setSearch(""); setCurrentPage(1); resetFilters(); }}
          />

          <ViewModeToggle
            viewMode={viewMode}
            onViewChange={handleViewChange}
            favoritesCount={favoritesCount}
            totalMatchesCount={totalMatchesCount}
          />

          {/* Search and Actions Bar - Hidden in matches view */}
          {viewMode !== "matches" && (
            <SearchAndFilters
              search={search}
              onSearchChange={setSearch}
              filters={filters}
              onFiltersChange={(updater) => startSortTransition(() => setFilters(updater))}
              sortBy={sortBy}
              onSortChange={(v) => startSortTransition(() => setSortBy(v))}
              showFilters={showFilters}
              onToggleFilters={() => setShowFilters(!showFilters)}
              activeFilterCount={activeFilterCount}
              onResetFilters={resetFilters}
              onPageReset={() => setCurrentPage(1)}
              isSearching={!!debouncedSearch && (loading || isFetchingAuctions)}
              searchInputRef={searchInputRef}
              onExportCsv={exportSelectedCsv}
            />
          )}

          {/* Pattern Controls - Hidden in matches view */}
          {viewMode !== "matches" && (
            <div className="mb-4 flex flex-wrap items-center gap-2 sm:gap-3 animate-in fade-in duration-300 delay-150">
              <PatternDialog patterns={patterns} onAddPattern={addPattern} onRemovePattern={removePattern} onClearPatterns={clearPatterns} maxPatterns={maxPatterns} />
              <Link to="/settings">
                <Button variant={notificationsEnabled ? "default" : "outline"} size="sm" className="gap-1 sm:gap-2">
                  {notificationsEnabled ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
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
              <MatchesView
                loading={loadingMatches}
                matches={dialogMatches}
                totalCount={totalMatchesCount}
                dismissedCount={dismissedCount}
                dismissedList={dismissedList}
                page={matchesPage}
                perPage={matchesPerPage}
                hideEnded={hideEndedMatches}
                onPageChange={setMatchesPage}
                onPerPageChange={setMatchesPerPage}
                onHideEndedChange={setHideEndedMatches}
                onClearAll={clearAllMatches}
                onDomainClick={handleDomainClick}
                onDismiss={handleDismissDomain}
                onDismissMany={handleDismissMany}
                onUndismiss={handleUndismiss}
                isFavorite={isFavorite}
              />
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
              {activeFilterCount > 0 && <Button variant="outline" onClick={resetFilters}>Clear Filters</Button>}
            </div>
          )}

          {viewMode !== "matches" && !loading && !error && filtered.length > 0 && (
            <>
              {viewMode === "favorites" && totalCount > 0 && (
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm text-muted-foreground">
                    Showing {Math.min((currentPage - 1) * itemsPerPage + 1, totalCount)}-{Math.min(currentPage * itemsPerPage, totalCount)} of {totalCount} favorite{totalCount !== 1 ? 's' : ''}
                  </p>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
                        <Trash2 className="w-4 h-4 mr-1" />
                        <span className="hidden sm:inline">Clear All</span>
                        <span className="sm:hidden">Clear</span>
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Clear All Favorites?</AlertDialogTitle>
                        <AlertDialogDescription>This will remove all {favoritesCount} domains from your favorites. This action cannot be undone.</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={async () => { await clearAllFavorites(); setAuctions([]); setTotalCount(0); }} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Clear All</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              )}
              {/* Bulk Actions Bar */}
              {selectedRows.size > 0 && (
                <div className="mb-3 flex flex-wrap items-center gap-2 p-2 rounded-lg bg-primary/5 border border-primary/20 animate-in fade-in duration-200">
                  <div className="flex items-center gap-2 mr-auto">
                    <CheckSquare className="w-4 h-4 text-primary shrink-0" />
                    <span className="text-sm font-medium whitespace-nowrap">{selectedRows.size} selected</span>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {viewMode === "favorites" ? (
                      <Button size="sm" variant="outline" className="gap-1 text-destructive hover:text-destructive" onClick={bulkUnfavorite}>
                        <Trash2 className="w-3.5 h-3.5" /> Remove
                      </Button>
                    ) : (
                      <Button size="sm" variant="outline" className="gap-1" onClick={bulkFavorite}>
                        <Heart className="w-3.5 h-3.5" /> Favorite
                      </Button>
                    )}
                    <Button size="sm" variant="outline" className="gap-1" onClick={exportSelectedCsv}>
                      <Download className="w-3.5 h-3.5" /> Export
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setSelectedRows(new Set())}>
                      Clear
                    </Button>
                  </div>
                </div>
              )}
              <div className="animate-in fade-in duration-300 delay-200">
                <DomainTable
                  domains={filtered}
                  onDomainClick={handleDomainClick}
                  sortBy={sortBy}
                  onSortChange={(newSort) => startSortTransition(() => { setCurrentPage(1); setSortBy(newSort); })}
                  selectedRows={selectedRows}
                  onToggleRow={toggleRowSelection}
                  onSelectAll={selectAllOnPage}
                  highlightedIndex={highlightedIndex}
                />
              </div>

              <PaginationControls
                currentPage={currentPage}
                totalPages={totalPages}
                itemsPerPage={itemsPerPage}
                jumpToPage={jumpToPage}
                onPageChange={setCurrentPage}
                onItemsPerPageChange={(v) => startSortTransition(() => { setCurrentPage(1); setItemsPerPage(v); })}
                onJumpToPageChange={setJumpToPage}
              />
            </>
          )}
        </div>

        <DomainDetailSheet
          domain={selectedDomain}
          open={detailSheetOpen}
          onOpenChange={setDetailSheetOpen}
        />
      </main>
    </div>
  );
}
