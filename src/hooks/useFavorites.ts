import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { getCachedFavorites, setCachedFavorites } from "@/lib/dashboardCache";

export function useFavorites() {
  const { user } = useAuth();
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const fetchControllerRef = useRef<AbortController | null>(null);
  const hasFetchedRef = useRef(false);

  const fetchFavorites = useCallback(async () => {
    if (!user) {
      setFavorites(new Set());
      setLoading(false);
      return;
    }

    // Load from cache immediately for instant display
    if (!hasFetchedRef.current) {
      const cached = getCachedFavorites(user.id);
      if (cached) {
        setFavorites(cached);
        setLoading(false);
      }
    }

    // Cancel any existing fetch
    if (fetchControllerRef.current) {
      fetchControllerRef.current.abort();
    }
    
    const controller = new AbortController();
    fetchControllerRef.current = controller;
    
    // Longer timeout - 10s for favorites
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      const { data, error } = await supabase
        .from('favorites')
        .select('domain_name')
        .eq('user_id', user.id)
        .abortSignal(controller.signal);

      clearTimeout(timeoutId);
      
      if (controller.signal.aborted) return;
      if (error) throw error;

      const newFavorites = new Set(data?.map(f => f.domain_name) || []);
      setFavorites(newFavorites);
      setCachedFavorites(user.id, newFavorites);
      hasFetchedRef.current = true;
    } catch (err) {
      if (controller.signal.aborted) return;
      // Silently fail - cached data is already displayed
      console.warn('Favorites fetch failed, using cache');
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
      }
    }
  }, [user]);

  useEffect(() => {
    hasFetchedRef.current = false;
    fetchFavorites();
    return () => {
      fetchControllerRef.current?.abort();
    };
  }, [fetchFavorites]);

  const toggleFavorite = useCallback(async (domainName: string, auctionId?: string) => {
    if (!user) {
      toast.error("Please log in to save favorites");
      return;
    }

    const isFavorite = favorites.has(domainName);

    // Optimistic update
    setFavorites(prev => {
      const next = new Set(prev);
      if (isFavorite) {
        next.delete(domainName);
      } else {
        next.add(domainName);
      }
      return next;
    });

    try {
      if (isFavorite) {
        const { error } = await supabase
          .from('favorites')
          .delete()
          .eq('user_id', user.id)
          .eq('domain_name', domainName);

        if (error) throw error;
        toast.success("Removed from favorites");
      } else {
        const { error } = await supabase
          .from('favorites')
          .insert({
            user_id: user.id,
            domain_name: domainName,
            auction_id: auctionId || null,
          });

        if (error) throw error;
        toast.success("Added to favorites");
      }
    } catch (err) {
      // Revert on error
      setFavorites(prev => {
        const next = new Set(prev);
        if (isFavorite) {
          next.add(domainName);
        } else {
          next.delete(domainName);
        }
        return next;
      });
      console.error('Error toggling favorite:', err);
      toast.error("Failed to update favorites");
    }
  }, [user, favorites]);

  const isFavorite = useCallback((domainName: string) => {
    return favorites.has(domainName);
  }, [favorites]);

  const clearAllFavorites = useCallback(async () => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('favorites')
        .delete()
        .eq('user_id', user.id);

      if (error) throw error;
      
      setFavorites(new Set());
      toast.success("All favorites cleared");
    } catch (err) {
      console.error('Error clearing favorites:', err);
      toast.error("Failed to clear favorites");
    }
  }, [user]);

  return {
    favorites,
    loading,
    toggleFavorite,
    isFavorite,
    refetch: fetchFavorites,
    count: favorites.size,
    clearAllFavorites,
  };
}
