import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface DomainRisk {
  checked_at: string;
  surbl: boolean;
  risk_level: "none" | "low" | "medium" | "high";
  details: string[];
}

interface UseDomainRiskReturn {
  checkDomainRisk: (domainName: string) => Promise<DomainRisk | null>;
  isChecking: boolean;
  error: string | null;
}

// Cache check results in-memory to avoid redundant API calls
const riskCache = new Map<string, DomainRisk>();

// How old a cached check can be before we re-check (7 days)
const CACHE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export function useDomainRisk(): UseDomainRiskReturn {
  const [isChecking, setIsChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkDomainRisk = useCallback(async (domainName: string): Promise<DomainRisk | null> => {
    // Check in-memory cache first
    const cached = riskCache.get(domainName);
    if (cached) {
      const cacheAge = Date.now() - new Date(cached.checked_at).getTime();
      if (cacheAge < CACHE_MAX_AGE_MS) {
        return cached;
      }
    }

    setIsChecking(true);
    setError(null);

    try {
      // First check if we have a cached result in the database
      const { data: auctionData, error: fetchError } = await supabase
        .from("auctions")
        .select("domain_risk")
        .eq("domain_name", domainName)
        .maybeSingle();

      if (fetchError) {
        console.error("Error fetching cached risk:", fetchError);
      }

      // If we have a recent cached result, use it
      if (auctionData?.domain_risk) {
        const dbRisk = auctionData.domain_risk as unknown as DomainRisk;
        const cacheAge = Date.now() - new Date(dbRisk.checked_at).getTime();
        
        if (cacheAge < CACHE_MAX_AGE_MS) {
          riskCache.set(domainName, dbRisk);
          setIsChecking(false);
          return dbRisk;
        }
      }

      // Call the edge function to perform fresh check
      const { data, error: invokeError } = await supabase.functions.invoke(
        "check-domain-risk",
        {
          body: { domain_name: domainName },
        }
      );

      if (invokeError) {
        throw new Error(invokeError.message);
      }

      const riskResult = data as DomainRisk;
      riskCache.set(domainName, riskResult);
      
      return riskResult;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to check domain risk";
      setError(message);
      console.error("Domain risk check failed:", message);
      return null;
    } finally {
      setIsChecking(false);
    }
  }, []);

  return {
    checkDomainRisk,
    isChecking,
    error,
  };
}
