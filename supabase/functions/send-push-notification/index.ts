import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  tag?: string;
  url?: string;
}

interface PushRequest {
  user_id?: string;
  payload: PushPayload;
}

interface PushSubscription {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
}

// Send push notification using web-push compatible approach
async function sendPushToSubscription(
  subscription: PushSubscription,
  payload: PushPayload,
  vapidPublicKey: string,
  vapidPrivateKey: string
): Promise<boolean> {
  try {
    console.log(`Sending push to endpoint: ${subscription.endpoint.substring(0, 50)}...`);
    
    // For now, use a simple POST to the push service
    // In production, you'd want to use proper web-push encryption
    const payloadString = JSON.stringify(payload);
    
    // Create authorization header with VAPID
    const url = new URL(subscription.endpoint);
    const audience = `${url.protocol}//${url.host}`;
    
    // Simple VAPID header (for testing)
    const authHeader = `vapid t=eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9, k=${vapidPublicKey}`;
    
    const response = await fetch(subscription.endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "TTL": "86400",
        "Urgency": "high",
      },
      body: payloadString,
    });

    console.log(`Push response: ${response.status} ${response.statusText}`);

    if (response.status === 201 || response.status === 200) {
      return true;
    }

    // 410 Gone means subscription is no longer valid
    if (response.status === 410) {
      console.log("Subscription expired, should be removed");
      return false;
    }

    return false;
  } catch (error) {
    console.error("Error sending push:", error);
    return false;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY") || "";
    const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY") || "";

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { user_id, payload }: PushRequest = await req.json();

    console.log("Sending push notification for user:", user_id);
    console.log("Payload:", JSON.stringify(payload));

    // Get user's push subscriptions
    let query = supabase.from("push_subscriptions").select("*");
    
    if (user_id) {
      query = query.eq("user_id", user_id);
    }

    const { data: subscriptions, error } = await query;

    if (error) {
      console.error("Error fetching subscriptions:", error);
      throw error;
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.log("No push subscriptions found for user");
      return new Response(
        JSON.stringify({ success: false, message: "No subscriptions found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Found ${subscriptions.length} subscriptions`);

    // Send to all subscriptions
    const results = await Promise.all(
      (subscriptions as PushSubscription[]).map((sub) =>
        sendPushToSubscription(sub, payload, vapidPublicKey, vapidPrivateKey)
      )
    );

    const successCount = results.filter(Boolean).length;
    console.log(`Sent ${successCount}/${subscriptions.length} notifications`);

    return new Response(
      JSON.stringify({
        success: true,
        sent: successCount,
        total: subscriptions.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error in send-push-notification:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
