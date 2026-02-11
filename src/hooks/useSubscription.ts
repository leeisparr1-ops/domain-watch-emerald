import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export type SubscriptionPlan = "free" | "basic" | "advanced";

interface SubscriptionState {
  plan: SubscriptionPlan;
  subscribed: boolean;
  subscriptionEnd: string | null;
  loading: boolean;
}

// Plan tier configuration
export const PLAN_CONFIG = {
  basic: {
    priceId: "price_1SsTamEaMKJga5fxylFENQ12",
    productId: "prod_Tq9uBfPZRydPoT",
    price: 4.99,
    maxPatterns: 60,
  },
  advanced: {
    priceId: "price_1SsTarEaMKJga5fxWBZIRakY",
    productId: "prod_Tq9u0B65mJOkIU",
    price: 9.99,
    maxPatterns: 120,
  },
  free: {
    priceId: null,
    productId: null,
    price: 0,
    maxPatterns: 30,
  },
} as const;

export function useSubscription() {
  const { user } = useAuth();
  const [state, setState] = useState<SubscriptionState>({
    plan: "free",
    subscribed: false,
    subscriptionEnd: null,
    loading: true,
  });

  const checkSubscription = useCallback(async () => {
    if (!user) {
      setState({ plan: "free", subscribed: false, subscriptionEnd: null, loading: false });
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setState({ plan: "free", subscribed: false, subscriptionEnd: null, loading: false });
        return;
      }

      const { data, error } = await supabase.functions.invoke("check-subscription", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (error) throw error;

      setState({
        plan: data.plan || "free",
        subscribed: data.subscribed || false,
        subscriptionEnd: data.subscription_end || null,
        loading: false,
      });
    } catch (error) {
      console.error("Error checking subscription:", error);
      setState(prev => ({ ...prev, loading: false }));
    }
  }, [user]);

  // Check subscription on mount and when user changes
  useEffect(() => {
    checkSubscription();
  }, [checkSubscription]);

  // Periodic refresh every 60 seconds
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(checkSubscription, 60000);
    return () => clearInterval(interval);
  }, [user, checkSubscription]);

  const createCheckout = async (plan: "basic" | "advanced") => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error("Not authenticated");

    const priceId = PLAN_CONFIG[plan].priceId;
    
    const { data, error } = await supabase.functions.invoke("create-checkout", {
      body: { priceId },
      headers: { Authorization: `Bearer ${session.access_token}` },
    });

    if (error) throw error;
    if (data.url) {
      window.open(data.url, "_blank");
    }
  };

  const openCustomerPortal = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error("Not authenticated");

    const { data, error } = await supabase.functions.invoke("customer-portal", {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });

    if (error) throw error;
    if (data.url) {
      window.open(data.url, "_blank");
    }
  };

  return {
    ...state,
    checkSubscription,
    createCheckout,
    openCustomerPortal,
    maxPatterns: PLAN_CONFIG[state.plan].maxPatterns,
  };
}
