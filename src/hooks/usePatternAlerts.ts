import { useEffect, useRef, useCallback } from "react";
import { useAuth } from "./useAuth";
import { useNotificationSettings } from "./useNotificationSettings";
import { useUserPatterns, PatternMatch } from "./useUserPatterns";
import { toast } from "sonner";

export function usePatternAlerts() {
  const { user } = useAuth();
  const { settings } = useNotificationSettings();
  const { patterns, checkPatterns, enabledCount } = useUserPatterns();
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
        // Notify for each new match (limit to first 5 to avoid spam)
        const matchesToNotify = result.matches.slice(0, 5);
        matchesToNotify.forEach((match: PatternMatch) => {
          sendNotification(match);
        });

        if (result.matches.length > 5) {
          toast.info(`+${result.matches.length - 5} more pattern matches found!`, {
            duration: 10000,
            action: {
              label: "View All",
              onClick: () => {
                // Dispatch a custom event to open the matches dialog
                window.dispatchEvent(new CustomEvent('openPatternMatches'));
              },
            },
          });
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
