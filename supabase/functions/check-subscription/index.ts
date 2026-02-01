import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Product ID to plan mapping
const PRODUCT_TO_PLAN: Record<string, string> = {
  "prod_Tq9uBfPZRydPoT": "basic",
  "prod_Tq9u0B65mJOkIU": "advanced",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CHECK-SUBSCRIPTION] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) throw new Error("No authorization header provided");

    // Create client with user's auth for JWT validation
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Validate JWT using getClaims
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabaseAuth.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      throw new Error(`Authentication error: Invalid token`);
    }

    const userId = claimsData.claims.sub as string;
    const userEmail = claimsData.claims.email as string;
    if (!userEmail) throw new Error("User email not available in token");
    logStep("User authenticated", { userId, email: userEmail });

    // Create service role client for database operations
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false }
    });

    // Create user object for compatibility with rest of code
    const user = { id: userId, email: userEmail };

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });

    if (customers.data.length === 0) {
      logStep("No Stripe customer found, user is on free plan");
      // Use upsert to handle case where user_settings doesn't exist yet
      // Enable email notifications by default for all users
      await supabaseClient
        .from("user_settings")
        .upsert({ 
          user_id: user.id, 
          subscription_plan: "free",
          email_notifications_enabled: true,
          notification_email: user.email,
        }, { 
          onConflict: "user_id" 
        });
      
      return new Response(JSON.stringify({ 
        subscribed: false,
        plan: "free",
        subscription_end: null
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const customerId = customers.data[0].id;
    logStep("Found Stripe customer", { customerId });

    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 1,
    });

    if (subscriptions.data.length === 0) {
      logStep("No active subscription found");
      // Use upsert to handle case where user_settings doesn't exist yet
      // Enable email notifications by default for all users
      await supabaseClient
        .from("user_settings")
        .upsert({ 
          user_id: user.id, 
          subscription_plan: "free",
          email_notifications_enabled: true,
          notification_email: user.email,
        }, { 
          onConflict: "user_id" 
        });
      
      return new Response(JSON.stringify({ 
        subscribed: false,
        plan: "free",
        subscription_end: null
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const subscription = subscriptions.data[0];
    // Handle timestamp - could be seconds or already a Date depending on Stripe SDK version
    let subscriptionEndTimestamp = subscription.current_period_end;
    let subscriptionEnd: string;
    try {
      // If it's a number (Unix timestamp in seconds), multiply by 1000
      if (typeof subscriptionEndTimestamp === 'number') {
        subscriptionEnd = new Date(subscriptionEndTimestamp * 1000).toISOString();
      } else {
        subscriptionEnd = new Date(subscriptionEndTimestamp).toISOString();
      }
    } catch (e) {
      logStep("Error parsing subscription end date, using fallback", { subscriptionEndTimestamp });
      // Fallback: 30 days from now
      subscriptionEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    }
    
    const productId = subscription.items.data[0].price.product as string;
    const plan = PRODUCT_TO_PLAN[productId] || "basic";
    
    logStep("Active subscription found", { subscriptionId: subscription.id, plan, subscriptionEnd, productId });

    // Use upsert to handle case where user_settings doesn't exist yet
    // Enable email notifications by default for all users
    const { error: upsertError } = await supabaseClient
      .from("user_settings")
      .upsert({ 
        user_id: user.id, 
        subscription_plan: plan,
        email_notifications_enabled: true,
        notification_email: user.email,
      }, { 
        onConflict: "user_id" 
      });
    
    if (upsertError) {
      logStep("Error upserting user_settings", { error: upsertError.message });
    } else {
      logStep("Successfully updated user_settings", { userId: user.id, plan });
    }

    return new Response(JSON.stringify({
      subscribed: true,
      plan,
      product_id: productId,
      subscription_end: subscriptionEnd
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
