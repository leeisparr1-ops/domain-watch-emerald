import { useEffect, useRef, useCallback, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

interface AlertedAuction {
  domain: string;
  alertedAt: number;
}

export function useAuctionAlerts() {
  const { user } = useAuth();
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState<NotificationPermission>('default');
  const alertedDomainsRef = useRef<Map<string, number>>(new Map());
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const CHECK_INTERVAL = 60 * 1000; // Check every minute
  const ALERT_THRESHOLD = 60 * 60 * 1000; // 1 hour in milliseconds

  // Initialize audio element
  useEffect(() => {
    audioRef.current = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2teleAsEONq+rHEqCCeH1OTRcjc2T3+6wq11NB5CeLrI2F8RAUphnbvafz4nRWC6xMGUUR8nVH2+z7ZfMB84TnG3xp1xQVQ2TXCkvraLWBwjN1Zus6SgaUgOGkVLaJiuo4BQIhYxPj9wqLO8bTcEI0BPXIS0uYxTIwgiPUlYf7C/q18wBxpCQExukb3Bd0AtCBQ8SEtqir7FgFQsCBI7SEZoir/KhFouCBE5SURkiL/Mg1stCBE5SERjiL/LglotCBE5SEVjh77KglktCBE5SUZjhr7JgVktCBI6SUZjhr7JgVktCBI6SUZjhr7JgVktCBI6SUZjhr7JgVktCBI6SUZjhr7JgVktCBI6SUZjhr7JgVktCBI6SUZjhr7JgVktCBI6SUZjhr7JgVktCBI6SUZjhr7JgVktCBI6SUZjhr7JgVktCBI6SUZjhr7JgVkt');
    audioRef.current.volume = 0.5;
  }, []);

  // Check and update notification permission
  useEffect(() => {
    if ('Notification' in window) {
      setPermissionStatus(Notification.permission);
      setNotificationsEnabled(Notification.permission === 'granted');
    }
  }, []);

  const requestPermission = useCallback(async () => {
    if (!('Notification' in window)) {
      toast.error('Browser notifications are not supported');
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      setPermissionStatus(permission);
      setNotificationsEnabled(permission === 'granted');
      
      if (permission === 'granted') {
        toast.success('Notifications enabled! You\'ll be alerted when favorites are ending soon.');
      } else if (permission === 'denied') {
        toast.error('Notifications blocked. Please enable them in your browser settings.');
      }
      
      return permission === 'granted';
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return false;
    }
  }, []);

  const playAlertSound = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(console.error);
    }
  }, []);

  const sendNotification = useCallback((domain: string, timeRemaining: string) => {
    if (!notificationsEnabled) return;

    playAlertSound();

    // Browser notification
    if (Notification.permission === 'granted') {
      new Notification('🔔 Auction Ending Soon!', {
        body: `${domain} is ending in ${timeRemaining}`,
        icon: '/favicon.ico',
        tag: domain, // Prevents duplicate notifications for same domain
        requireInteraction: true,
      });
    }

    // Also show in-app toast
    toast.warning(`⏰ ${domain} ending in ${timeRemaining}`, {
      duration: 10000,
      action: {
        label: 'View',
        onClick: () => window.scrollTo({ top: 0, behavior: 'smooth' }),
      },
    });
  }, [notificationsEnabled, playAlertSound]);

  const checkFavoriteAuctions = useCallback(async () => {
    if (!user || !notificationsEnabled) return;

    try {
      // Get user's favorites
      const { data: favorites, error: favError } = await supabase
        .from('favorites')
        .select('domain_name, auction_id')
        .eq('user_id', user.id);

      if (favError || !favorites?.length) return;

      const domainNames = favorites.map(f => f.domain_name);

      // Get auctions for these domains
      const { data: auctions, error: auctionError } = await supabase
        .from('auctions')
        .select('domain_name, end_time')
        .in('domain_name', domainNames)
        .not('end_time', 'is', null);

      if (auctionError || !auctions) return;

      const now = Date.now();

      auctions.forEach(auction => {
        if (!auction.end_time) return;

        const endTime = new Date(auction.end_time).getTime();
        const timeRemaining = endTime - now;

        // Check if ending within 1 hour and not ended
        if (timeRemaining > 0 && timeRemaining <= ALERT_THRESHOLD) {
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

      // Clean up old entries (older than 2 hours)
      const twoHoursAgo = now - 2 * 60 * 60 * 1000;
      alertedDomainsRef.current.forEach((timestamp, domain) => {
        if (timestamp < twoHoursAgo) {
          alertedDomainsRef.current.delete(domain);
        }
      });

    } catch (error) {
      console.error('Error checking favorite auctions:', error);
    }
  }, [user, notificationsEnabled, sendNotification, ALERT_THRESHOLD]);

  // Periodic check for ending auctions
  useEffect(() => {
    if (!user || !notificationsEnabled) return;

    // Initial check
    checkFavoriteAuctions();

    // Set up interval
    const interval = setInterval(checkFavoriteAuctions, CHECK_INTERVAL);

    return () => clearInterval(interval);
  }, [user, notificationsEnabled, checkFavoriteAuctions, CHECK_INTERVAL]);

  return {
    notificationsEnabled,
    permissionStatus,
    requestPermission,
    toggleNotifications: useCallback(() => {
      if (notificationsEnabled) {
        setNotificationsEnabled(false);
        toast.info('Auction alerts disabled');
      } else {
        requestPermission();
      }
    }, [notificationsEnabled, requestPermission]),
  };
}
