import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { quickValuation } from "@/lib/domainValuation";
import { differenceInDays, parseISO } from "date-fns";

export interface PortfolioDomain {
  id: string;
  user_id: string;
  domain_name: string;
  tld: string | null;
  purchase_price: number;
  purchase_date: string | null;
  purchase_source: string | null;
  sale_price: number | null;
  sale_date: string | null;
  renewal_cost_yearly: number;
  next_renewal_date: string | null;
  status: string;
  tags: string[];
  notes: string | null;
  auto_valuation: number | null;
  valuation_updated_at: string | null;
  created_at: string;
  updated_at: string;
}

export type PortfolioInsert = Omit<PortfolioDomain, "id" | "user_id" | "auto_valuation" | "valuation_updated_at" | "created_at" | "updated_at">;

export interface PortfolioStats {
  totalDomains: number;
  totalInvested: number;
  totalCurrentValue: number;
  totalRenewalCosts: number;
  totalSold: number;
  totalSaleRevenue: number;
  realizedPnL: number;
  unrealizedPnL: number;
  overallROI: number;
  expiringSoon: number;
}

export function usePortfolio() {
  const { user } = useAuth();
  const [domains, setDomains] = useState<PortfolioDomain[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDomains = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from("portfolio_domains")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      setDomains(data ?? []);
    } catch (err: any) {
      console.error("Error fetching portfolio:", err);
      toast.error("Failed to load portfolio");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchDomains();
  }, [fetchDomains]);

  const addDomain = async (input: Partial<PortfolioInsert>) => {
    if (!user) return;
    const domainName = input.domain_name ?? "";
    const tld = domainName.includes(".") ? domainName.split(".").pop() ?? null : null;

    // Auto-compute valuation
    let autoVal: number | null = null;
    try {
      const result = quickValuation(domainName);
      autoVal = Math.round((result.valueMin + result.valueMax) / 2);
    } catch { /* ignore valuation errors */ }

    const { error } = await (supabase as any)
      .from("portfolio_domains")
      .insert({
        user_id: user.id,
        domain_name: domainName,
        tld,
        purchase_price: input.purchase_price ?? 0,
        purchase_date: input.purchase_date ?? null,
        purchase_source: input.purchase_source ?? null,
        status: input.status ?? "holding",
        tags: input.tags ?? [],
        notes: input.notes ?? null,
        renewal_cost_yearly: input.renewal_cost_yearly ?? 0,
        next_renewal_date: input.next_renewal_date ?? null,
        sale_price: input.sale_price ?? null,
        sale_date: input.sale_date ?? null,
        auto_valuation: autoVal,
        valuation_updated_at: autoVal ? new Date().toISOString() : null,
      });

    if (error) {
      toast.error("Failed to add domain");
      console.error(error);
      return;
    }
    toast.success(`${domainName} added to portfolio`);
    await fetchDomains();
  };

  const updateDomain = async (id: string, updates: Partial<PortfolioDomain>) => {
    const { error } = await (supabase as any)
      .from("portfolio_domains")
      .update(updates)
      .eq("id", id);
    if (error) {
      toast.error("Failed to update domain");
      return;
    }
    toast.success("Domain updated");
    await fetchDomains();
  };

  const deleteDomain = async (id: string) => {
    const { error } = await (supabase as any)
      .from("portfolio_domains")
      .delete()
      .eq("id", id);
    if (error) {
      toast.error("Failed to delete domain");
      return;
    }
    toast.success("Domain removed from portfolio");
    await fetchDomains();
  };

  const refreshValuation = async (domain: PortfolioDomain) => {
    try {
      const result = quickValuation(domain.domain_name);
      const autoVal = Math.round((result.valueMin + result.valueMax) / 2);
      await updateDomain(domain.id, {
        auto_valuation: autoVal,
        valuation_updated_at: new Date().toISOString(),
      });
    } catch {
      toast.error("Valuation refresh failed");
    }
  };

  const bulkAddDomains = async (
    rows: Array<{ domain_name: string; purchase_price?: number; purchase_date?: string; purchase_source?: string; status?: string; renewal_cost_yearly?: number; tags?: string[] }>
  ) => {
    if (!user || rows.length === 0) return { added: 0, errors: 0 };

    const records = rows.map((r) => {
      const domainName = r.domain_name.trim().toLowerCase();
      const tld = domainName.includes(".") ? domainName.split(".").pop() ?? null : null;
      let autoVal: number | null = null;
      try {
        const result = quickValuation(domainName);
        autoVal = Math.round((result.valueMin + result.valueMax) / 2);
      } catch { /* ignore */ }

      return {
        user_id: user.id,
        domain_name: domainName,
        tld,
        purchase_price: r.purchase_price ?? 0,
        purchase_date: r.purchase_date || null,
        purchase_source: r.purchase_source || null,
        status: r.status || "holding",
        tags: r.tags ?? [],
        renewal_cost_yearly: r.renewal_cost_yearly ?? 0,
        auto_valuation: autoVal,
        valuation_updated_at: autoVal ? new Date().toISOString() : null,
      };
    });

    // Insert in batches of 50
    let added = 0;
    let errors = 0;
    for (let i = 0; i < records.length; i += 50) {
      const batch = records.slice(i, i + 50);
      const { error } = await (supabase as any).from("portfolio_domains").insert(batch);
      if (error) {
        console.error("Bulk insert error:", error);
        errors += batch.length;
      } else {
        added += batch.length;
      }
    }

    if (added > 0) toast.success(`${added} domain${added !== 1 ? "s" : ""} imported`);
    if (errors > 0) toast.error(`${errors} domain${errors !== 1 ? "s" : ""} failed to import`);
    await fetchDomains();
    return { added, errors };
  };

  const stats: PortfolioStats = (() => {
    const holding = domains.filter((d) => d.status !== "sold");
    const sold = domains.filter((d) => d.status === "sold");

    const totalInvested = domains.reduce((s, d) => s + Number(d.purchase_price), 0);
    const totalCurrentValue = holding.reduce((s, d) => s + (Number(d.auto_valuation) || 0), 0);
    const totalRenewalCosts = holding.reduce((s, d) => s + Number(d.renewal_cost_yearly), 0);
    const totalSaleRevenue = sold.reduce((s, d) => s + (Number(d.sale_price) || 0), 0);
    const soldCostBasis = sold.reduce((s, d) => s + Number(d.purchase_price), 0);
    const realizedPnL = totalSaleRevenue - soldCostBasis;
    const holdingCostBasis = holding.reduce((s, d) => s + Number(d.purchase_price), 0);
    const unrealizedPnL = totalCurrentValue - holdingCostBasis;
    const expiringSoon = holding.filter((d) => {
      if (!d.next_renewal_date) return false;
      const days = differenceInDays(parseISO(d.next_renewal_date), new Date());
      return days <= 30;
    }).length;
    const overallROI = totalInvested > 0 ? ((realizedPnL + unrealizedPnL) / totalInvested) * 100 : 0;

    return {
      totalDomains: domains.length,
      totalInvested,
      totalCurrentValue,
      totalRenewalCosts,
      totalSold: sold.length,
      totalSaleRevenue,
      realizedPnL,
      unrealizedPnL,
      expiringSoon,
      overallROI,
    };
  })();

  return { domains, loading, stats, addDomain, updateDomain, deleteDomain, refreshValuation, bulkAddDomains, refetch: fetchDomains };
}
