import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useNotificationSettings } from './useNotificationSettings';
import { toast } from 'sonner';

export function useAuctionAlerts() {
  const { user } = useAuth();
  const { settings } = useNotificationSettings();
  const alertedDomainsRef = useRef<Map<string, number>>(new Map());
  const CHECK_INTERVAL = 60 * 1000; // Check every minute


  const sendNotification = useCallback((domain: string, timeRemaining: string) => {
    if (!settings.enabled) return;

    // Browser notification
    if (settings.browserNotifications && Notification.permission === 'granted') {
      new Notification('🔔 Auction Ending Soon!', {
        body: `${domain} is ending in ${timeRemaining}`,
        icon: '/favicon.ico',
        tag: domain,
        requireInteraction: true,
      });
    }

    // In-app toast
    if (settings.inAppToasts) {
      toast.warning(`⏰ ${domain} ending in ${timeRemaining}`, {
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
        .select('domain_name, auction_id')
        .eq('user_id', user.id);

      if (favError || !favorites?.length) return;

      const domainNames = favorites.map(f => f.domain_name);

      const { data: auctions, error: auctionError } = await supabase
        .from('auctions')
        .select('domain_name, end_time')
        .in('domain_name', domainNames)
        .not('end_time', 'is', null);

      if (auctionError || !auctions) return;

      const now = Date.now();
      const thresholdMs = settings.alertThresholdMinutes * 60 * 1000;

      auctions.forEach(auction => {
        if (!auction.end_time) return;

        const endTime = new Date(auction.end_time).getTime();
        const timeRemaining = endTime - now;

        if (timeRemaining > 0 && timeRemaining <= thresholdMs) {
          const lastAlerted = alertedDomainsRef.current.get(auction.domain_name);
          
          // Only alert once per 30 minutes for each domain
          if (!lastAlerted || (now - lastAlerted) > 30 * 60 * 1000) {
            const minutes = Math.floor(timeRemaining / (1000 * 60));
            const timeString = minutes >= 60 
              ? `${Math.floor(minutes / 60)}h ${minutes % 60}m`
              : `${minutes}m`;

            sendNotification(auction.domain_name, timeString);
            alertedDomainsRef.current.set(auction.domain_name, now);
          }
        }
      });

      // Clean up old entries
      const twoHoursAgo = now - 2 * 60 * 60 * 1000;
      alertedDomainsRef.current.forEach((timestamp, domain) => {
        if (timestamp < twoHoursAgo) {
          alertedDomainsRef.current.delete(domain);
        }
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
      // Redirect to settings for full control
      toast.info('Configure alerts in Settings', {
        action: {
          label: 'Open Settings',
          onClick: () => window.location.href = '/settings',
        },
      });
    }, []),
  };
}
