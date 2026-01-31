// Local storage cache for instant dashboard loading
// Shows cached data immediately while fresh data loads in background

const CACHE_KEY_PREFIX = 'expiredhawk_cache_';
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes - data is still useful if slightly stale
const MAX_CACHED_ITEMS = 100; // Only cache first page for instant display

interface CachedAuction {
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

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  totalCount?: number;
}

function getCacheKey(type: string, userId: string): string {
  return `${CACHE_KEY_PREFIX}${type}_${userId}`;
}

export function getCachedAuctions(userId: string): { auctions: CachedAuction[]; totalCount: number; isStale: boolean } | null {
  try {
    const key = getCacheKey('auctions', userId);
    const cached = localStorage.getItem(key);
    if (!cached) return null;
    
    const entry: CacheEntry<CachedAuction[]> = JSON.parse(cached);
    const now = Date.now();
    const isStale = now - entry.timestamp > CACHE_TTL;
    
    // Filter out ended auctions from cache
    const validAuctions = entry.data.filter(a => {
      if (!a.auctionEndTime) return true;
      return new Date(a.auctionEndTime) > new Date();
    });
    
    return { 
      auctions: validAuctions, 
      totalCount: entry.totalCount || validAuctions.length,
      isStale 
    };
  } catch {
    return null;
  }
}

export function setCachedAuctions(userId: string, auctions: CachedAuction[], totalCount: number): void {
  try {
    const key = getCacheKey('auctions', userId);
    const entry: CacheEntry<CachedAuction[]> = {
      data: auctions.slice(0, MAX_CACHED_ITEMS),
      timestamp: Date.now(),
      totalCount,
    };
    localStorage.setItem(key, JSON.stringify(entry));
  } catch {
    // Ignore storage errors
  }
}

export function getCachedMatches(userId: string): { matches: unknown[]; totalCount: number; isStale: boolean } | null {
  try {
    const key = getCacheKey('matches', userId);
    const cached = localStorage.getItem(key);
    if (!cached) return null;
    
    const entry: CacheEntry<unknown[]> = JSON.parse(cached);
    const now = Date.now();
    const isStale = now - entry.timestamp > CACHE_TTL;
    
    return { 
      matches: entry.data, 
      totalCount: entry.totalCount || entry.data.length,
      isStale 
    };
  } catch {
    return null;
  }
}

export function setCachedMatches(userId: string, matches: unknown[], totalCount: number): void {
  try {
    const key = getCacheKey('matches', userId);
    const entry: CacheEntry<unknown[]> = {
      data: matches.slice(0, MAX_CACHED_ITEMS),
      timestamp: Date.now(),
      totalCount,
    };
    localStorage.setItem(key, JSON.stringify(entry));
  } catch {
    // Ignore storage errors
  }
}

export function getCachedFavorites(userId: string): Set<string> | null {
  try {
    const key = getCacheKey('favorites', userId);
    const cached = localStorage.getItem(key);
    if (!cached) return null;
    
    const entry: CacheEntry<string[]> = JSON.parse(cached);
    // Favorites cache is valid for longer - 2 hours
    if (Date.now() - entry.timestamp > 2 * 60 * 60 * 1000) return null;
    
    return new Set(entry.data);
  } catch {
    return null;
  }
}

export function setCachedFavorites(userId: string, favorites: Set<string>): void {
  try {
    const key = getCacheKey('favorites', userId);
    const entry: CacheEntry<string[]> = {
      data: Array.from(favorites),
      timestamp: Date.now(),
    };
    localStorage.setItem(key, JSON.stringify(entry));
  } catch {
    // Ignore storage errors
  }
}

export function clearUserCache(userId: string): void {
  try {
    localStorage.removeItem(getCacheKey('auctions', userId));
    localStorage.removeItem(getCacheKey('matches', userId));
    localStorage.removeItem(getCacheKey('favorites', userId));
  } catch {
    // Ignore errors
  }
}
