import { useAuctionAlerts } from "@/hooks/useAuctionAlerts";
import { useUserPatterns } from "@/hooks/useUserPatterns";
import { usePatternAlerts } from "@/hooks/usePatternAlerts";

/**
 * App-wide alert listener — runs pattern & auction checks
 * regardless of which page the user is on.
 */
export function GlobalAlerts() {
  useAuctionAlerts();
  const { checkPatterns, enabledCount } = useUserPatterns();
  usePatternAlerts({ enabledCount, checkPatterns });
  return null; // renders nothing
}
