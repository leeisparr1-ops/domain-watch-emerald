import { useEffect, useRef, useCallback } from "react";
import { useAuth } from "./useAuth";
import { useNotificationSettings } from "./useNotificationSettings";
import type { PatternMatch } from "./useUserPatterns";
import { toast } from "sonner";

const NOTIFICATION_COOLDOWN_KEY = 'pattern-alert-last-notification';
const NOTIFICATION_COOLDOWN_MS = 6 * 60 * 60 * 1000; // 6 hours between in-app notifications

export type PatternAlertsDeps = {
  enabledCount: number;
  checkPatterns: () => Promise<{ matches: PatternMatch[]; newMatches: number }>;
};

export function usePatternAlerts(deps: PatternAlertsDeps) {
  const { user } = useAuth();
  const { settings } = useNotificationSettings();
  const { enabledCount, checkPatterns } = deps;
  const lastCheckRef = useRef<number>(0);
  const CHECK_INTERVAL = 5 * 60 * 1000; // Check every 5 minutes

  const sendNotification = useCallback((match: PatternMatch) => {
    if (!settings.enabled) return;

    const price = match.price ? `$${match.price.toLocaleString()}` : "Make offer";
    const message = `${match.domain_name} matches "${match.pattern_description}" - ${price}`;

    // Browser notification
    if (settings.browserNotifications && Notification.permission === "granted") {
      new Notification("🔔 Pattern Match Found!", {
        body: message,
        icon: "/favicon.ico",
        tag: match.auction_id,
        requireInteraction: true,
      });
    }

    // In-app toast
    if (settings.inAppToasts) {
      toast.success(`🎯 ${message}`, {
        duration: 10000,
        action: {
          label: "Analyze",
          onClick: () => window.location.href = `/tools?tab=advisor&domain=${encodeURIComponent(match.domain_name)}`,
        },
      });
    }
  }, [settings]);

  const runPatternCheck = useCallback(async () => {
    if (!user || !settings.enabled || enabledCount === 0) return;

    // Debounce checks
    const now = Date.now();
    if (now - lastCheckRef.current < 30000) return; // Min 30s between checks
    lastCheckRef.current = now;

    try {
      const result = await checkPatterns();
      
      if (result.newMatches > 0) {
        // Check rate limit for in-app notifications (6 hour cooldown)
        const lastNotification = parseInt(localStorage.getItem(NOTIFICATION_COOLDOWN_KEY) || '0', 10);
        const shouldNotify = now - lastNotification > NOTIFICATION_COOLDOWN_MS;
        
        if (shouldNotify) {
          // Notify for each new match (limit to first 3 to avoid spam)
          const matchesToNotify = result.matches.slice(0, 3);
          matchesToNotify.forEach((match: PatternMatch) => {
            sendNotification(match);
          });

          if (result.matches.length > 3) {
            toast.info(`+${result.matches.length - 3} more pattern matches found!`, {
              duration: 10000,
              action: {
                label: "View All",
                onClick: () => {
                  window.dispatchEvent(new CustomEvent('openPatternMatches'));
                },
              },
            });
          }
          
          // Update last notification time
          localStorage.setItem(NOTIFICATION_COOLDOWN_KEY, now.toString());
        } else {
          // Silently log that we found matches but skipped notification
          console.log(`Found ${result.newMatches} matches, but notification cooldown active (${Math.round((NOTIFICATION_COOLDOWN_MS - (now - lastNotification)) / 60000)} min remaining)`);
        }
      }
    } catch (error) {
      console.error("Error checking patterns:", error);
    }
  }, [user, settings.enabled, enabledCount, checkPatterns, sendNotification]);

  // Periodic pattern checking - deferred to avoid blocking initial page load
  useEffect(() => {
    if (!user || !settings.enabled || enabledCount === 0) return;

    // Delay initial check significantly to let the page load first
    const initialTimeout = setTimeout(runPatternCheck, 15000);

    // Periodic checks at longer intervals
    const interval = setInterval(runPatternCheck, CHECK_INTERVAL);

    return () => {
      clearTimeout(initialTimeout);
      clearInterval(interval);
    };
  }, [user, settings.enabled, enabledCount, runPatternCheck, CHECK_INTERVAL]);

  return {
    runPatternCheck,
    hasEnabledPatterns: enabledCount > 0,
  };
}
