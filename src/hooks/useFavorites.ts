import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export function useFavorites() {
  const { user } = useAuth();
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const fetchFavorites = useCallback(async () => {
    if (!user) {
      setFavorites(new Set());
      setLoading(false);
      return;
    }

    try {
      // Use AbortController with timeout to prevent long-running queries
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const { data, error } = await supabase
        .from('favorites')
        .select('domain_name')
        .eq('user_id', user.id)
        .abortSignal(controller.signal);

      clearTimeout(timeoutId);

      if (error) throw error;

      setFavorites(new Set(data?.map(f => f.domain_name) || []));
    } catch (err) {
      // Silently fail on timeout - favorites aren't critical for page load
      if (err instanceof Error && err.name === 'AbortError') {
        console.warn('Favorites fetch timed out - DB may be under load');
      } else {
        console.error('Error fetching favorites:', err);
      }
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchFavorites();
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

  return {
    favorites,
    loading,
    toggleFavorite,
    isFavorite,
    refetch: fetchFavorites,
    count: favorites.size,
  };
}
