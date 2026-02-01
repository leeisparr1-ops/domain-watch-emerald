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
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const lastCheckRef = useRef<number>(0);
  const CHECK_INTERVAL = 5 * 60 * 1000; // Check every 5 minutes

  // Initialize audio element
  useEffect(() => {
    audioRef.current = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2teleAsEONq+rHEqCCeH1OTRcjc2T3+6wq11NB5CeLrI2F8RAUphnbvafz4nRWC6xMGUUR8nVH2+z7ZfMB84TnG3xp1xQVQ2TXCkvraLWBwjN1Zus6SgaUgOGkVLaJiuo4BQIhYxPj9wqLO8bTcEI0BPXIS0uYxTIwgiPUlYf7C/q18wBxpCQExukb3Bd0AtCBQ8SEtqir7FgFQsCBI7SEZoir/KhFouCBE5SERkiL/Mg1stCBE5SERjiL/LglotCBE5SEVjh77KglktCBE5SUZjhr7JgVktCBI6SUZjhr7JgVktCBI6SUZjhr7JgVktCBI6SUZjhr7JgVktCBI6SUZjhr7JgVktCBI6SUZjhr7JgVktCBI6SUZjhr7JgVktCBI6SUZjhr7JgVktCBI6SUZjhr7JgVktCBI6SUZjhr7JgVkt');
  }, []);

  const playAlertSound = useCallback(() => {
    if (audioRef.current && settings.soundEnabled) {
      audioRef.current.volume = settings.soundVolume / 100;
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(console.error);
    }
  }, [settings.soundEnabled, settings.soundVolume]);

  const sendNotification = useCallback((match: PatternMatch) => {
    if (!settings.enabled) return;

    if (settings.soundEnabled) {
      playAlertSound();
    }

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
          label: "View",
          onClick: () => window.location.href = "/dashboard",
        },
      });
    }
  }, [settings, playAlertSound]);

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

  // Periodic pattern checking
  useEffect(() => {
    if (!user || !settings.enabled || enabledCount === 0) return;

    // Initial check after a delay
    const initialTimeout = setTimeout(runPatternCheck, 5000);

    // Periodic checks
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
