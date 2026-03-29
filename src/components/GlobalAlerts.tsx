import { useAuctionAlerts } from "@/hooks/useAuctionAlerts";
import { useUserPatterns } from "@/hooks/useUserPatterns";
import { usePatternAlerts } from "@/hooks/usePatternAlerts";
import { useLocation } from "react-router-dom";

/**
 * App-wide alert listener — runs pattern & auction checks
 * regardless of which page the user is on.
 */
function GlobalAlertsWorker() {
  useAuctionAlerts();
  const { checkPatterns, enabledCount } = useUserPatterns();
  usePatternAlerts({ enabledCount, checkPatterns });
  return null; // renders nothing
}

export function GlobalAlerts() {
  const { pathname } = useLocation();

  // Dashboard already mounts heavy pattern/favorites hooks;
  // skip global duplicate listeners there to reduce contention.
  if (pathname.startsWith("/dashboard")) return null;

  return <GlobalAlertsWorker />;
}
