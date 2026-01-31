import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface AuctionDomain {
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

export interface Filters {
  tld: string;
  auctionType: string;
  minPrice: number;
  maxPrice: number;
}

export interface SortOption {
  value: string;
  label: string;
  column: string;
  ascending: boolean;
}

export const SORT_OPTIONS: SortOption[] = [
  { value: "price_asc", label: "Price: Low to High", column: "price", ascending: true },
  { value: "price_desc", label: "Price: High to Low", column: "price", ascending: false },
  { value: "end_time_asc", label: "Ending Soon", column: "end_time", ascending: true },
  { value: "end_time_desc", label: "Ending Last", column: "end_time", ascending: false },
  { value: "bid_count_desc", label: "Most Bids", column: "bid_count", ascending: false },
  { value: "bid_count_asc", label: "Least Bids", column: "bid_count", ascending: true },
  { value: "domain_name_asc", label: "Domain: A-Z", column: "domain_name", ascending: true },
  { value: "domain_name_desc", label: "Domain: Z-A", column: "domain_name", ascending: false },
  { value: "valuation_asc", label: "Valuation: Low to High", column: "valuation", ascending: true },
  { value: "valuation_desc", label: "Valuation: High to Low", column: "valuation", ascending: false },
  { value: "domain_age_asc", label: "Age: Youngest First", column: "domain_age", ascending: true },
  { value: "domain_age_desc", label: "Age: Oldest First", column: "domain_age", ascending: false },
];

interface UseAuctionsOptions {
  page: number;
  itemsPerPage: number;
  sortBy: string;
  filters: Filters;
  enabled?: boolean;
}

const mapAuctionRow = (a: Record<string, unknown>): AuctionDomain => ({
  id: a.id as string,
  domain: a.domain_name as string,
  auctionEndTime: (a.end_time as string) || '',
  price: Number(a.price) || 0,
  numberOfBids: (a.bid_count as number) || 0,
  traffic: (a.traffic_count as number) || 0,
  domainAge: (a.domain_age as number) || 0,
  auctionType: (a.auction_type as string) || 'auction',
  tld: (a.tld as string) || '',
  valuation: (a.valuation as number) || undefined,
  inventorySource: (a.inventory_source as string) || undefined,
});

async function fetchAuctions(
  page: number,
  itemsPerPage: number,
  sortBy: string,
  filters: Filters,
  signal?: AbortSignal
): Promise<{ auctions: AuctionDomain[]; hasMore: boolean; estimatedTotal: number }> {
  const from = (page - 1) * itemsPerPage;
  const to = from + itemsPerPage; // Fetch one extra to detect hasMore

  const currentSort = SORT_OPTIONS.find(s => s.value === sortBy) || SORT_OPTIONS[0];
  const endTimeFilter = new Date().toISOString();

  let query = supabase
    .from('auctions')
    .select('id,domain_name,end_time,price,bid_count,traffic_count,domain_age,auction_type,tld,valuation,inventory_source')
    .gte('end_time', endTimeFilter)
    .gte('price', filters.minPrice)
    .lte('price', filters.maxPrice);

  // Exclude unknown values for sorts that would scan huge ranges
  if (currentSort.column === 'valuation') {
    query = query.gt('valuation', 0);
  } else if (currentSort.column === 'domain_age') {
    query = query.gt('domain_age', 0);
  } else if (currentSort.column === 'bid_count' && !currentSort.ascending) {
    query = query.gt('bid_count', 0);
  }

  // Apply TLD/type filters
  if (filters.tld !== "all") {
    query = query.eq('tld', filters.tld.toUpperCase());
  }
  if (filters.auctionType !== "all") {
    query = query.eq('auction_type', filters.auctionType);
  }

  // Stable sort with tie-breakers
  const needsSecondarySort = ['valuation', 'domain_age', 'bid_count', 'end_time', 'domain_name'].includes(currentSort.column);
  
  query = query.order(currentSort.column, { ascending: currentSort.ascending });
  
  if (needsSecondarySort) {
    if (currentSort.column !== 'end_time') {
      query = query.order('end_time', { ascending: currentSort.ascending });
    }
    query = query.order('id', { ascending: currentSort.ascending });
  }

  query = query.range(from, to);

  if (signal) {
    query = query.abortSignal(signal);
  }

  const { data, error } = await query;

  if (error) {
    const code = (error as { code?: string }).code;
    const isTimeout = code === '57014' || error.message?.includes('timeout');
    throw new Error(isTimeout ? 'Database is busy - please try again' : error.message);
  }

  const hasMore = (data?.length || 0) > itemsPerPage;
  const auctions = (data || []).slice(0, itemsPerPage).map(mapAuctionRow);
  
  // Estimate total: if we have more, assume at least next page exists
  const estimatedTotal = hasMore ? from + itemsPerPage + 1 : from + auctions.length;

  return { auctions, hasMore, estimatedTotal };
}

export function useAuctions({ page, itemsPerPage, sortBy, filters, enabled = true }: UseAuctionsOptions) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['auctions', page, itemsPerPage, sortBy, filters],
    queryFn: async ({ signal }) => fetchAuctions(page, itemsPerPage, sortBy, filters, signal),
    enabled: enabled && !!user,
    staleTime: 30 * 1000, // Data is fresh for 30 seconds
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
    retry: 2,
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 5000),
    refetchOnWindowFocus: false,
    placeholderData: (previousData) => previousData, // Keep previous data while loading new
  });
}

// Hook for matches tab - optimized with server-side pagination
interface UseMatchesOptions {
  page: number;
  itemsPerPage: number;
  hideEnded: boolean;
  enabled?: boolean;
}

export interface MatchDomain {
  alert_id: string;
  auction_id: string;
  domain_name: string;
  price: number;
  end_time: string | null;
  pattern_description: string;
  bid_count?: number;
  traffic_count?: number;
  domain_age?: number;
  auction_type?: string;
  tld?: string;
  valuation?: number;
  inventory_source?: string;
}

async function fetchMatches(
  userId: string,
  page: number,
  itemsPerPage: number,
  hideEnded: boolean,
  signal?: AbortSignal
): Promise<{ matches: MatchDomain[]; total: number }> {
  const from = (page - 1) * itemsPerPage;
  const now = new Date().toISOString();

  // Single query with join - much faster than multiple queries
  let query = supabase
    .from('pattern_alerts')
    .select(`
      id,
      auction_id,
      domain_name,
      pattern_id,
      alerted_at,
      auctions!inner(id, price, end_time, bid_count, traffic_count, domain_age, auction_type, tld, valuation, inventory_source)
    `, { count: 'estimated' })
    .eq('user_id', userId)
    .order('alerted_at', { ascending: false });

  // Server-side filter for ended auctions
  if (hideEnded) {
    query = query.gte('auctions.end_time', now);
  }

  query = query.range(from, from + itemsPerPage - 1);

  if (signal) {
    query = query.abortSignal(signal);
  }

  const { data: alerts, count, error } = await query;

  if (error) {
    console.error('Matches query error:', error);
    throw error;
  }

  if (!alerts?.length) {
    return { matches: [], total: 0 };
  }

  // Get pattern descriptions in parallel
  const patternIds = [...new Set(alerts.map(a => a.pattern_id))];
  const { data: patterns } = await supabase
    .from('user_patterns')
    .select('id, description')
    .in('id', patternIds);

  const patternMap = new Map((patterns || []).map(p => [p.id, p.description || 'Pattern']));

  const matches: MatchDomain[] = alerts.map(alert => {
    const auction = alert.auctions as unknown as {
      id: string;
      price: number;
      end_time: string | null;
      bid_count: number;
      traffic_count: number;
      domain_age: number | null;
      auction_type: string | null;
      tld: string | null;
      valuation: number | null;
      inventory_source: string | null;
    };
    
    return {
      alert_id: alert.id,
      auction_id: alert.auction_id,
      domain_name: alert.domain_name,
      price: auction?.price || 0,
      end_time: auction?.end_time || null,
      pattern_description: patternMap.get(alert.pattern_id) || 'Pattern',
      bid_count: auction?.bid_count || 0,
      traffic_count: auction?.traffic_count || 0,
      domain_age: auction?.domain_age || 0,
      auction_type: auction?.auction_type || 'Bid',
      tld: auction?.tld || '',
      valuation: auction?.valuation || undefined,
      inventory_source: auction?.inventory_source || undefined,
    };
  });

  return { matches, total: count || matches.length };
}

export function useMatches({ page, itemsPerPage, hideEnded, enabled = true }: UseMatchesOptions) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['matches', user?.id, page, itemsPerPage, hideEnded],
    queryFn: async ({ signal }) => {
      if (!user) throw new Error('Not authenticated');
      return fetchMatches(user.id, page, itemsPerPage, hideEnded, signal);
    },
    enabled: enabled && !!user,
    staleTime: 60 * 1000, // Matches are fresh for 1 minute
    gcTime: 5 * 60 * 1000,
    retry: 1,
    refetchOnWindowFocus: false,
    placeholderData: (previousData) => previousData,
  });
}

// Hook to prefetch next page
export function usePrefetchNextPage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return {
    prefetchAuctions: (page: number, itemsPerPage: number, sortBy: string, filters: Filters) => {
      if (!user) return;
      queryClient.prefetchQuery({
        queryKey: ['auctions', page + 1, itemsPerPage, sortBy, filters],
        queryFn: () => fetchAuctions(page + 1, itemsPerPage, sortBy, filters),
        staleTime: 30 * 1000,
      });
    },
    prefetchMatches: (page: number, itemsPerPage: number, hideEnded: boolean) => {
      if (!user) return;
      queryClient.prefetchQuery({
        queryKey: ['matches', user.id, page + 1, itemsPerPage, hideEnded],
        queryFn: () => fetchMatches(user.id, page + 1, itemsPerPage, hideEnded),
        staleTime: 60 * 1000,
      });
    },
  };
}
