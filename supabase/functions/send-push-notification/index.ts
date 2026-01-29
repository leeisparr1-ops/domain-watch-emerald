import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import * as webpush from "jsr:@negrel/webpush@0.5.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
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

type SendResult = {
  ok: boolean;
  shouldDelete: boolean;
  status?: number;
  error?: string;
};

let appServerPromise: Promise<webpush.ApplicationServer> | null = null;

function base64UrlToBytes(base64Url: string): Uint8Array {
  const padding = "=".repeat((4 - (base64Url.length % 4)) % 4);
  const base64 = (base64Url + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  const base64 = btoa(binary);
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

async function getAppServer(vapidPublicKey: string, vapidPrivateKey: string) {
  if (appServerPromise) return appServerPromise;

  appServerPromise = (async () => {
    // VAPID keys are usually stored as URL-safe base64 strings:
    // - public: 65 bytes uncompressed EC point (0x04 || X(32) || Y(32))
    // - private: 32 bytes
    const pub = base64UrlToBytes(vapidPublicKey);
    const priv = base64UrlToBytes(vapidPrivateKey);

    if (pub.length !== 65 || pub[0] !== 4) {
      throw new Error(`Unexpected VAPID public key format (len=${pub.length})`);
    }
    if (priv.length !== 32) {
      throw new Error(`Unexpected VAPID private key format (len=${priv.length})`);
    }

    const x = bytesToBase64Url(pub.slice(1, 33));
    const y = bytesToBase64Url(pub.slice(33, 65));
    const d = bytesToBase64Url(priv);

    const publicJwk: JsonWebKey = {
      kty: "EC",
      crv: "P-256",
      x,
      y,
      ext: true,
    };

    const privateJwk: JsonWebKey = {
      ...publicJwk,
      d,
    };

    const publicKey = await crypto.subtle.importKey(
      "jwk",
      publicJwk,
      { name: "ECDSA", namedCurve: "P-256" },
      true,
      ["verify"],
    );

    const privateKey = await crypto.subtle.importKey(
      "jwk",
      privateJwk,
      { name: "ECDSA", namedCurve: "P-256" },
      true,
      ["sign"],
    );

    const vapidKeys: CryptoKeyPair = { publicKey, privateKey };

    return await webpush.ApplicationServer.new({
      contactInformation: "mailto:support@expiredhawk.com",
      vapidKeys,
    });
  })();

  return appServerPromise;
}

// Send push notification using the @negrel/webpush library.
// The library expects p256dh and auth as base64url strings.
async function sendPushToSubscription(
  subscription: PushSubscription,
  payload: PushPayload
): Promise<SendResult> {
  try {
    console.log(`Sending web push to endpoint: ${subscription.endpoint.substring(0, 50)}...`);
    console.log(`[Push Debug] p256dh (${subscription.p256dh.length} chars): ${subscription.p256dh.substring(0, 20)}...`);
    console.log(`[Push Debug] auth (${subscription.auth.length} chars): ${subscription.auth}`);
    
    const appServer = await getAppServer(
      Deno.env.get("VAPID_PUBLIC_KEY") || "",
      Deno.env.get("VAPID_PRIVATE_KEY") || "",
    );

    // Log decoded byte lengths to verify format
    const p256dhBytes = base64UrlToBytes(subscription.p256dh);
    const authBytes = base64UrlToBytes(subscription.auth);
    console.log(`[Push Debug] p256dh decoded to ${p256dhBytes.length} bytes (expected 65), auth decoded to ${authBytes.length} bytes (expected 16)`);

    const sub = appServer.subscribe({
      endpoint: subscription.endpoint,
      keys: {
        p256dh: subscription.p256dh,
        auth: subscription.auth,
      },
    });

    await sub.pushTextMessage(JSON.stringify(payload), {
      ttl: 86400,
      urgency: webpush.Urgency.High,
    });

    return { ok: true, shouldDelete: false, status: 201 };
  } catch (error) {
    const maybeResponse = (error as any)?.response;
    const status = maybeResponse?.status;
    const message = (error as any)?.message ? String((error as any).message) : String(error);
    const stack = (error as any)?.stack || '';

    let shouldDelete = false;
    try {
      if (typeof (error as any)?.isGone === "function") {
        shouldDelete = Boolean((error as any).isGone());
      }
    } catch {
      // ignore
    }

    if (status === 410 || status === 404) shouldDelete = true;

    console.error("Error sending web push:", { status, message, shouldDelete, stack: stack.substring(0, 500) });
    return { ok: false, shouldDelete, status, error: message };
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

    if (!vapidPublicKey || !vapidPrivateKey) {
      return new Response(
        JSON.stringify({ success: false, message: "VAPID keys are not configured" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Ensure the app server is initialized (and keys are valid)
    await getAppServer(vapidPublicKey, vapidPrivateKey);

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { user_id, payload }: PushRequest = await req.json();

    console.log("Sending push notification for user:", user_id);
    console.log("Payload:", JSON.stringify(payload));

    // Rate limit: Use user's configured frequency preference for pattern matches
    if (user_id && payload.tag === "pattern-match") {
      // Get user's notification frequency preference
      const { data: userSettings } = await supabase
        .from("user_settings")
        .select("notification_frequency_hours")
        .eq("user_id", user_id)
        .maybeSingle();
      
      const frequencyHours = userSettings?.notification_frequency_hours || 2;
      const frequencyAgo = new Date(Date.now() - frequencyHours * 60 * 60 * 1000).toISOString();
      
      const { data: recentAlerts } = await supabase
        .from("pattern_alerts")
        .select("alerted_at")
        .eq("user_id", user_id)
        .gte("alerted_at", frequencyAgo)
        .order("alerted_at", { ascending: false })
        .limit(1);

      if (recentAlerts && recentAlerts.length > 0) {
        const lastAlertTime = new Date(recentAlerts[0].alerted_at).getTime();
        const oneMinuteAgo = Date.now() - 60 * 1000;
        
        // If the most recent alert is older than 1 minute, we already sent a push in this window
        if (lastAlertTime < oneMinuteAgo) {
          console.log(`Rate limited: User ${user_id} already received push within ${frequencyHours} hours`);
          return new Response(
            JSON.stringify({ success: false, message: `Rate limited - push already sent within ${frequencyHours} hours` }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }
    }

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
        sendPushToSubscription(sub, payload)
      )
    );

    const successCount = results.filter((r) => r.ok).length;
    console.log(`Sent ${successCount}/${subscriptions.length} notifications`);

    const failures = results
      .map((r, i) => ({ ...r, subId: (subscriptions[i] as PushSubscription).id }))
      .filter((r) => !r.ok);

    // Clean up expired subscriptions (410/404 only)
    for (let i = 0; i < results.length; i++) {
      if (results[i]?.shouldDelete) {
        const sub = subscriptions[i] as PushSubscription;
        console.log("Removing failed subscription:", sub.id);
        await supabase
          .from("push_subscriptions")
          .delete()
          .eq("id", sub.id);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        sent: successCount,
        total: subscriptions.length,
        failures: failures.slice(0, 3),
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
