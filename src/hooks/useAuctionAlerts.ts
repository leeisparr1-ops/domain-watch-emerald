import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useNotificationSettings } from './useNotificationSettings';
import { toast } from 'sonner';

export function useAuctionAlerts() {
  const { user } = useAuth();
  const { settings } = useNotificationSettings();
  const alertedDomainsRef = useRef<Map<string, number>>(new Map());
  const priceDropAlertedRef = useRef<Map<string, number>>(new Map());
  const CHECK_INTERVAL = 60 * 1000; // Check every minute

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

    try {
      const { data: favorites, error: favError } = await supabase
        .from('favorites')
        .select('id, domain_name, auction_id, last_known_price')
        .eq('user_id', user.id);

      if (favError || !favorites?.length) return;

      const domainNames = favorites.map(f => f.domain_name);

      const { data: auctions, error: auctionError } = await supabase
        .from('auctions')
        .select('domain_name, end_time, price')
        .in('domain_name', domainNames);

      if (auctionError || !auctions) return;

      const auctionMap = new Map(auctions.map(a => [a.domain_name, a]));
      const now = Date.now();
      const thresholdMs = settings.alertThresholdMinutes * 60 * 1000;

      // Price drop detection + price tracking updates
      const priceUpdates: { id: string; price: number }[] = [];

      for (const fav of favorites) {
        const auction = auctionMap.get(fav.domain_name);
        if (!auction) continue;

        const currentPrice = Number(auction.price);
        const lastKnown = fav.last_known_price != null ? Number(fav.last_known_price) : null;

        // Track price for future comparison
        if (lastKnown === null || lastKnown !== currentPrice) {
          priceUpdates.push({ id: fav.id, price: currentPrice });
        }

        // Notify on price DROP (only if we had a previous price)
        if (lastKnown !== null && currentPrice < lastKnown) {
          const dropAmount = lastKnown - currentPrice;
          const dropPct = Math.round((dropAmount / lastKnown) * 100);
          const lastDropAlert = priceDropAlertedRef.current.get(fav.domain_name);

          // Throttle: once per hour per domain
          if (!lastDropAlert || (now - lastDropAlert) > 60 * 60 * 1000) {
            sendNotification(
              '📉 Price Drop!',
              `${fav.domain_name} dropped $${dropAmount.toFixed(0)} (${dropPct}%) → $${currentPrice.toFixed(0)}`,
              `price-drop-${fav.domain_name}`
            );
            priceDropAlertedRef.current.set(fav.domain_name, now);
          }
        }

        // Ending-soon alerts
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

      // Batch update last_known_price for changed prices
      if (priceUpdates.length > 0) {
        await Promise.all(
          priceUpdates.map(({ id, price }) =>
            supabase
              .from('favorites')
              .update({ last_known_price: price } as any)
              .eq('id', id)
          )
        );
      }

      // Clean up old entries
      const twoHoursAgo = now - 2 * 60 * 60 * 1000;
      alertedDomainsRef.current.forEach((timestamp, domain) => {
        if (timestamp < twoHoursAgo) alertedDomainsRef.current.delete(domain);
      });
      priceDropAlertedRef.current.forEach((timestamp, domain) => {
        if (timestamp < twoHoursAgo) priceDropAlertedRef.current.delete(domain);
      });

    } catch (error) {
      console.error('Error checking favorite auctions:', error);
    }
  }, [user, settings.enabled, settings.alertThresholdMinutes, sendNotification]);

  useEffect(() => {
    if (!user || !settings.enabled) return;

    checkFavoriteAuctions();
    const interval = setInterval(checkFavoriteAuctions, CHECK_INTERVAL);

    return () => clearInterval(interval);
  }, [user, settings.enabled, checkFavoriteAuctions, CHECK_INTERVAL]);

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
