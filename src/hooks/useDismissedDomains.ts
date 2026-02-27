import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

export function useDismissedDomains() {
  const { user } = useAuth();
  const [dismissedSet, setDismissedSet] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  // Fetch all dismissed domain names for the user
  const fetchDismissed = useCallback(async () => {
    if (!user) {
      setDismissedSet(new Set());
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("dismissed_domains")
        .select("domain_name")
        .eq("user_id", user.id);

      if (error) throw error;
      setDismissedSet(new Set((data || []).map(d => d.domain_name)));
    } catch (error) {
      console.error("Error fetching dismissed domains:", error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchDismissed();
  }, [fetchDismissed]);

  const isDismissed = useCallback((domainName: string) => {
    return dismissedSet.has(domainName);
  }, [dismissedSet]);

  const dismissDomain = useCallback(async (domainName: string) => {
    if (!user) return;
    try {
      const { error } = await supabase
        .from("dismissed_domains")
        .insert({ user_id: user.id, domain_name: domainName });

      // Ignore unique constraint violations (already dismissed)
      if (error && error.code === "23505") {
        // Already dismissed, just update local state
      } else if (error) throw error;

      setDismissedSet(prev => new Set([...prev, domainName]));
    } catch (error) {
      console.error("Error dismissing domain:", error);
      toast.error("Failed to dismiss domain");
    }
  }, [user]);

  const dismissMany = useCallback(async (domainNames: string[]) => {
    if (!user || domainNames.length === 0) return;
    try {
      const rows = domainNames.map(d => ({ user_id: user.id, domain_name: d }));
      const { error } = await supabase
        .from("dismissed_domains")
        .insert(rows);

      // Ignore unique constraint violations
      if (error && error.code !== "23505") throw error;
      setDismissedSet(prev => {
        const next = new Set(prev);
        domainNames.forEach(d => next.add(d));
        return next;
      });
      toast.success(`${domainNames.length} domain${domainNames.length > 1 ? 's' : ''} dismissed`);
    } catch (error) {
      console.error("Error dismissing domains:", error);
      toast.error("Failed to dismiss domains");
    }
  }, [user]);

  const undismiss = useCallback(async (domainName: string) => {
    if (!user) return;
    try {
      const { error } = await supabase
        .from("dismissed_domains")
        .delete()
        .eq("user_id", user.id)
        .eq("domain_name", domainName);

      if (error) throw error;
      setDismissedSet(prev => {
        const next = new Set(prev);
        next.delete(domainName);
        return next;
      });
    } catch (error) {
      console.error("Error un-dismissing domain:", error);
    }
  }, [user]);

  const dismissedCount = dismissedSet.size;
  const dismissedList = useMemo(() => Array.from(dismissedSet), [dismissedSet]);

  return {
    isDismissed,
    dismissDomain,
    dismissMany,
    undismiss,
    dismissedSet,
    dismissedList,
    dismissedCount,
    loading,
    refetch: fetchDismissed,
  };
}
