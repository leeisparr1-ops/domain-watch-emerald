import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";
import { validateRegexSafety } from "@/lib/regexSecurity";

export interface UserPattern {
  id: string;
  user_id: string;
  pattern: string;
  pattern_type: "regex" | "structure" | "pronounceable" | "length" | "words";
  description: string | null;
  max_price: number | null;
  min_price: number;
  tld_filter: string | null;
  min_length: number | null;
  max_length: number | null;
  min_age: number | null;
  max_age: number | null;
  enabled: boolean;
  last_matched_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface PatternMatch {
  auction_id: string;
  domain_name: string;
  price: number;
  end_time: string | null;
  pattern_id: string;
  pattern_description: string;
}

// Plan limits for pattern counts — must match PLAN_CONFIG in useSubscription.ts
export const PLAN_LIMITS = {
  free: 30,
  basic: 60,
  advanced: 120,
};

export function useUserPatterns() {
  const { user } = useAuth();
  const [patterns, setPatterns] = useState<UserPattern[]>([]);
  const [matches, setMatches] = useState<PatternMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [userPlan, setUserPlan] = useState<keyof typeof PLAN_LIMITS>('free');
  
  // Fetch user's subscription plan
  const fetchUserPlan = useCallback(async () => {
    if (!user) {
      setUserPlan('free');
      return;
    }

    try {
      const { data, error } = await supabase
        .from("user_settings")
        .select("subscription_plan")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;
      
      const plan = (data?.subscription_plan as keyof typeof PLAN_LIMITS) || 'free';
      setUserPlan(plan);
    } catch (error) {
      console.error("Error fetching user plan:", error);
      setUserPlan('free');
    }
  }, [user]);

  const maxPatterns = PLAN_LIMITS[userPlan];

  // Fetch patterns from database
  const fetchPatterns = useCallback(async () => {
    if (!user) {
      setPatterns([]);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("user_patterns")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setPatterns((data || []) as UserPattern[]);
    } catch (error) {
      console.error("Error fetching patterns:", error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Add a new pattern
  const addPattern = useCallback(async (pattern: {
    pattern: string;
    pattern_type: "regex" | "structure" | "pronounceable" | "length" | "words";
    description?: string;
    max_price?: number | null;
    min_price?: number;
    tld_filter?: string | null;
    min_length?: number | null;
    max_length?: number | null;
    min_age?: number | null;
    max_age?: number | null;
  }) => {
    if (!user) {
      toast.error("Please sign in to save patterns");
      return null;
    }

    // Check pattern limit
    if (patterns.length >= maxPatterns) {
      toast.error(`You can only have ${maxPatterns} patterns on your current plan. Upgrade for more!`);
      return null;
    }

    // Validate regex for safety (ReDoS prevention)
    const validation = validateRegexSafety(pattern.pattern);
    if (!validation.safe) {
      toast.error(validation.reason || "Invalid regex pattern");
      return null;
    }

    try {
      const { data, error } = await supabase
        .from("user_patterns")
        .insert({
          user_id: user.id,
          pattern: pattern.pattern,
          pattern_type: pattern.pattern_type,
          description: pattern.description || null,
          max_price: pattern.max_price ?? null,
          min_price: pattern.min_price ?? 0,
          tld_filter: pattern.tld_filter ?? null,
          min_length: pattern.min_length ?? null,
          max_length: pattern.max_length ?? null,
          min_age: pattern.min_age ?? null,
          max_age: pattern.max_age ?? null,
          enabled: true,
        })
        .select()
        .single();

      if (error) throw error;

      setPatterns(prev => [data as UserPattern, ...prev]);
      toast.success("Pattern saved! You'll be notified when matching domains appear.");
      return data;
    } catch (error) {
      console.error("Error adding pattern:", error);
      toast.error("Failed to save pattern");
      return null;
    }
  }, [user, patterns.length, maxPatterns]);

  // Remove a pattern
  const removePattern = useCallback(async (id: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from("user_patterns")
        .delete()
        .eq("id", id)
        .eq("user_id", user.id);

      if (error) throw error;

      setPatterns(prev => prev.filter(p => p.id !== id));
      toast.success("Pattern removed");
    } catch (error) {
      console.error("Error removing pattern:", error);
      toast.error("Failed to remove pattern");
    }
  }, [user]);

  // Rename a pattern (update description)
  const renamePattern = useCallback(async (id: string, newDescription: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from("user_patterns")
        .update({ description: newDescription })
        .eq("id", id)
        .eq("user_id", user.id);

      if (error) throw error;

      setPatterns(prev => prev.map(p => 
        p.id === id ? { ...p, description: newDescription } : p
      ));
      toast.success("Pattern renamed");
    } catch (error) {
      console.error("Error renaming pattern:", error);
      toast.error("Failed to rename pattern");
    }
  }, [user]);

  // Update pattern with all fields
  // IMPORTANT: When filter criteria change, we clear old pattern_alerts so they get re-matched
  const updatePattern = useCallback(async (id: string, updates: {
    pattern?: string;
    pattern_type?: "regex" | "structure" | "pronounceable" | "length" | "words";
    description?: string | null;
    max_price?: number | null;
    min_price?: number;
    tld_filter?: string | null;
    min_length?: number | null;
    max_length?: number | null;
    min_age?: number | null;
    max_age?: number | null;
  }) => {
    if (!user) return false;

    // Validate regex for safety if pattern is being updated
    if (updates.pattern) {
      const validation = validateRegexSafety(updates.pattern);
      if (!validation.safe) {
        toast.error(validation.reason || "Invalid regex pattern");
        return false;
      }
    }

    try {
      // Check if any filter criteria are being changed (not just description)
      const filterFieldsChanged = 
        updates.max_price !== undefined ||
        updates.min_price !== undefined ||
        updates.tld_filter !== undefined ||
        updates.min_length !== undefined ||
        updates.max_length !== undefined ||
        updates.min_age !== undefined ||
        updates.max_age !== undefined ||
        updates.pattern !== undefined;

      // If filter criteria changed, delete old alerts for this pattern
      // so they get re-evaluated with new filters on next check
      if (filterFieldsChanged) {
        const { error: deleteError } = await supabase
          .from("pattern_alerts")
          .delete()
          .eq("pattern_id", id)
          .eq("user_id", user.id);

        if (deleteError) {
          console.error("Error clearing old pattern alerts:", deleteError);
          // Continue with update even if delete fails
        }
      }

      const { error } = await supabase
        .from("user_patterns")
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .eq("user_id", user.id);

      if (error) throw error;

      setPatterns(prev => prev.map(p => 
        p.id === id ? { ...p, ...updates } : p
      ));
      
      if (filterFieldsChanged) {
        toast.success("Pattern updated - matches will refresh on next sync");
      } else {
        toast.success("Pattern updated");
      }
      return true;
    } catch (error) {
      console.error("Error updating pattern:", error);
      toast.error("Failed to update pattern");
      return false;
    }
  }, [user]);

  // Toggle pattern enabled/disabled
  const togglePattern = useCallback(async (id: string, enabled: boolean) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from("user_patterns")
        .update({ enabled })
        .eq("id", id)
        .eq("user_id", user.id);

      if (error) throw error;

      setPatterns(prev => prev.map(p => 
        p.id === id ? { ...p, enabled } : p
      ));
    } catch (error) {
      console.error("Error toggling pattern:", error);
      toast.error("Failed to update pattern");
    }
  }, [user]);

  // Check patterns for matches
  const checkPatterns = useCallback(async () => {
    if (!user || patterns.filter(p => p.enabled).length === 0) {
      return { matches: [], newMatches: 0 };
    }

    setChecking(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error("No session");
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/check-pattern-alerts`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to check patterns");
      }

      const result = await response.json();
      setMatches(result.matches || []);
      return result;
    } catch (error) {
      console.error("Error checking patterns:", error);
      return { matches: [], newMatches: 0 };
    } finally {
      setChecking(false);
    }
  }, [user, patterns]);

  // Clear all patterns
  const clearPatterns = useCallback(async () => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from("user_patterns")
        .delete()
        .eq("user_id", user.id);

      if (error) throw error;

      setPatterns([]);
      toast.success("All patterns cleared");
    } catch (error) {
      console.error("Error clearing patterns:", error);
      toast.error("Failed to clear patterns");
    }
  }, [user]);

  // Match domain against local patterns (for filtering display)
  const matchesDomain = useCallback((domainName: string): boolean => {
    const enabledPatterns = patterns.filter(p => p.enabled);
    if (enabledPatterns.length === 0) return true;

    const domainParts = domainName.split(".");
    const nameOnly = domainParts.slice(0, -1).join(".").toLowerCase();

    return enabledPatterns.some(p => {
      try {
        const regex = new RegExp(p.pattern, "i");
        return regex.test(nameOnly);
      } catch {
        return false;
      }
    });
  }, [patterns]);

  // Load patterns and plan on mount
  useEffect(() => {
    fetchPatterns();
    fetchUserPlan();
  }, [fetchPatterns, fetchUserPlan]);

  return {
    patterns,
    matches,
    loading,
    checking,
    addPattern,
    removePattern,
    togglePattern,
    renamePattern,
    updatePattern,
    clearPatterns,
    checkPatterns,
    matchesDomain,
    hasPatterns: patterns.length > 0,
    enabledCount: patterns.filter(p => p.enabled).length,
    refetch: fetchPatterns,
    maxPatterns,
    isAtLimit: patterns.length >= maxPatterns,
  };
}