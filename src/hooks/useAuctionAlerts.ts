import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useNotificationSettings } from './useNotificationSettings';
import { toast } from 'sonner';

const CHECK_INTERVAL = 2 * 60 * 1000; // 2 min
const INITIAL_CHECK_DELAY = 12000; // keep initial dashboard load fast
const REQUEST_TIMEOUT_MS = 8000;
const PRICE_UPDATE_BATCH_SIZE = 20;

type FavoriteRow = {
  id: string;
  domain_name: string;
  auction_id: string | null;
  last_known_price: number | null;
};

type AuctionRow = {
  id: string;
  domain_name: string;
  end_time: string | null;
  price: number | null;
};

function chunk<T>(items: T[], size: number): T[] {
  return items.slice(0, size);
}

export function useAuctionAlerts() {
  const { user } = useAuth();
  const { settings } = useNotificationSettings();
  const alertedDomainsRef = useRef<Map<string, number>>(new Map());
  const priceDropAlertedRef = useRef<Map<string, number>>(new Map());

  const sendNotification = useCallback((title: string, body: string, tag: string) => {
    if (!settings.enabled) return;

    if (settings.browserNotifications && Notification.permission === 'granted') {
      new Notification(title, {
        body,
        icon: '/favicon.ico',
        tag,
        requireInteraction: true,
      });
    }

    if (settings.inAppToasts) {
      toast.warning(body, {
        duration: 10000,
        action: {
          label: 'View',
          onClick: () => window.scrollTo({ top: 0, behavior: 'smooth' }),
        },
      });
    }
  }, [settings]);

  const checkFavoriteAuctions = useCallback(async () => {
    if (!user || !settings.enabled) return;
    if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return;

    try {
      const favoritesController = new AbortController();
      const favoritesTimeout = setTimeout(() => favoritesController.abort(), REQUEST_TIMEOUT_MS);

      const { data: favorites, error: favError } = await supabase
        .from('favorites')
        .select('id, domain_name, auction_id, last_known_price')
        .eq('user_id', user.id)
        .abortSignal(favoritesController.signal);

      clearTimeout(favoritesTimeout);

      if (favError || !favorites?.length) return;

      const favoriteRows = favorites as FavoriteRow[];
      const favoriteById = favoriteRows.filter((f) => !!f.auction_id);
      const favoriteByDomain = favoriteRows.filter((f) => !f.auction_id);

      const auctionsById = new Map<string, AuctionRow>();
      const auctionsByDomain = new Map<string, AuctionRow>();

      // Fast path: PK lookup by auction_id (avoids large text IN() scans)
      if (favoriteById.length > 0) {
        const auctionIds = favoriteById
          .map((f) => f.auction_id)
          .filter((id): id is string => !!id);

        const auctionsByIdController = new AbortController();
        const auctionsByIdTimeout = setTimeout(() => auctionsByIdController.abort(), REQUEST_TIMEOUT_MS);

        const { data: byIdRows, error: byIdError } = await supabase
          .from('auctions')
          .select('id, domain_name, end_time, price')
          .in('id', auctionIds)
          .abortSignal(auctionsByIdController.signal);

        clearTimeout(auctionsByIdTimeout);

        if (byIdError) throw byIdError;
        for (const row of (byIdRows || []) as AuctionRow[]) {
          auctionsById.set(row.id, row);
          auctionsByDomain.set(row.domain_name, row);
        }
      }

      // Fallback path: only unresolved favorites without auction_id (usually tiny)
      if (favoriteByDomain.length > 0) {
        const domainNames = favoriteByDomain.map((f) => f.domain_name).filter(Boolean);
        const smallDomainBatch = chunk(domainNames, 30);

        if (smallDomainBatch.length > 0) {
          const auctionsByDomainController = new AbortController();
          const auctionsByDomainTimeout = setTimeout(() => auctionsByDomainController.abort(), REQUEST_TIMEOUT_MS);

          const { data: byDomainRows, error: byDomainError } = await supabase
            .from('auctions')
            .select('id, domain_name, end_time, price')
            .in('domain_name', smallDomainBatch)
            .abortSignal(auctionsByDomainController.signal);

          clearTimeout(auctionsByDomainTimeout);

          if (byDomainError) throw byDomainError;
          for (const row of (byDomainRows || []) as AuctionRow[]) {
            auctionsByDomain.set(row.domain_name, row);
          }
        }
      }

      const now = Date.now();
      const thresholdMs = settings.alertThresholdMinutes * 60 * 1000;
      const priceUpdates: { id: string; price: number }[] = [];

      for (const fav of favoriteRows) {
        const auction = (fav.auction_id ? auctionsById.get(fav.auction_id) : undefined) || auctionsByDomain.get(fav.domain_name);
        if (!auction) continue;

        const currentPrice = Number(auction.price);
        const lastKnown = fav.last_known_price != null ? Number(fav.last_known_price) : null;

        if (Number.isFinite(currentPrice) && (lastKnown === null || lastKnown !== currentPrice)) {
          priceUpdates.push({ id: fav.id, price: currentPrice });
        }

        if (lastKnown !== null && Number.isFinite(currentPrice) && currentPrice < lastKnown) {
          const dropAmount = lastKnown - currentPrice;
          const dropPct = Math.round((dropAmount / lastKnown) * 100);
          const lastDropAlert = priceDropAlertedRef.current.get(fav.domain_name);

          if (!lastDropAlert || (now - lastDropAlert) > 60 * 60 * 1000) {
            sendNotification(
              '📉 Price Drop!',
              `${fav.domain_name} dropped $${dropAmount.toFixed(0)} (${dropPct}%) → $${currentPrice.toFixed(0)}`,
              `price-drop-${fav.domain_name}`
            );
            priceDropAlertedRef.current.set(fav.domain_name, now);
          }
        }

        if (auction.end_time) {
          const endTime = new Date(auction.end_time).getTime();
          const timeRemaining = endTime - now;

          if (timeRemaining > 0 && timeRemaining <= thresholdMs) {
            const lastAlerted = alertedDomainsRef.current.get(auction.domain_name);

            if (!lastAlerted || (now - lastAlerted) > 30 * 60 * 1000) {
              const minutes = Math.floor(timeRemaining / (1000 * 60));
              const timeString = minutes >= 60
                ? `${Math.floor(minutes / 60)}h ${minutes % 60}m`
                : `${minutes}m`;

              sendNotification(
                '🔔 Auction Ending Soon!',
                `⏰ ${auction.domain_name} ending in ${timeString}`,
                auction.domain_name
              );
              alertedDomainsRef.current.set(auction.domain_name, now);
            }
          }
        }
      }

      // Keep write-load bounded so dashboard reads stay responsive
      const boundedUpdates = chunk(priceUpdates, PRICE_UPDATE_BATCH_SIZE);
      if (boundedUpdates.length > 0) {
        await Promise.all(
          boundedUpdates.map(({ id, price }) =>
            supabase
              .from('favorites')
              .update({ last_known_price: price } as any)
              .eq('id', id)
          )
        );
      }

      const twoHoursAgo = now - 2 * 60 * 60 * 1000;
      alertedDomainsRef.current.forEach((timestamp, domain) => {
        if (timestamp < twoHoursAgo) alertedDomainsRef.current.delete(domain);
      });
      priceDropAlertedRef.current.forEach((timestamp, domain) => {
        if (timestamp < twoHoursAgo) priceDropAlertedRef.current.delete(domain);
      });
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return;
      }
      console.error('Error checking favorite auctions:', error);
    }
  }, [user, settings.enabled, settings.alertThresholdMinutes, sendNotification]);

  useEffect(() => {
    if (!user || !settings.enabled) return;

    const initialTimeout = setTimeout(() => {
      void checkFavoriteAuctions();
    }, INITIAL_CHECK_DELAY);

    const interval = setInterval(() => {
      void checkFavoriteAuctions();
    }, CHECK_INTERVAL);

    return () => {
      clearTimeout(initialTimeout);
      clearInterval(interval);
    };
  }, [user, settings.enabled, checkFavoriteAuctions]);

  const requestPermission = useCallback(async () => {
    if (!('Notification' in window)) {
      toast.error('Browser notifications are not supported');
      return false;
    }

    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      toast.success('Notifications enabled!');
    } else if (permission === 'denied') {
      toast.error('Notifications blocked. Enable in browser settings.');
    }
    return permission === 'granted';
  }, []);

  return {
    notificationsEnabled: settings.enabled,
    permissionStatus: typeof Notification !== 'undefined' ? Notification.permission : 'default',
    requestPermission,
    toggleNotifications: useCallback(() => {
      toast.info('Configure alerts in Settings', {
        action: {
          label: 'Open Settings',
          onClick: () => window.location.href = '/settings',
        },
      });
    }, []),
  };
}
