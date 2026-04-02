/**
 * Force popup-based Google OAuth even on mobile / non-iframe contexts,
 * then exchange broker tokens for a valid session via edge function.
 *
 * The Lovable OAuth broker's redirect flow returns tokens signed with a
 * JWT kid that GoTrue doesn't recognise. The popup/web_message flow
 * returns the same problematic tokens. So after receiving them we send
 * them to our exchange-oauth-token edge function which creates a valid
 * session via the admin API.
 */

import { supabase } from "@/integrations/supabase/client";

const OAUTH_BROKER_URL = "/~oauth/initiate";
const SUPPORTED_ORIGINS = ["https://oauth.lovable.app"];
const EXPECTED_MESSAGE_TYPE = "authorization_response";

function generateState(): string {
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    return [...crypto.getRandomValues(new Uint8Array(16))]
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

export async function signInWithGooglePopup(): Promise<{ error: Error | null }> {
  const state = generateState();
  const redirectUri = window.location.origin;

  const params = new URLSearchParams({
    provider: "google",
    redirect_uri: redirectUri,
    state,
    response_mode: "web_message",
  });

  const url = `${OAUTH_BROKER_URL}?${params.toString()}`;

  // Set up postMessage listener BEFORE opening the popup
  let resolveMessage: (data: any) => void;
  const messagePromise = new Promise<any>((resolve) => {
    resolveMessage = resolve;
  });

  const messageHandler = (e: MessageEvent) => {
    const isValidOrigin = SUPPORTED_ORIGINS.some((o) => e.origin === o);
    if (!isValidOrigin) return;
    const data = e.data;
    if (!data || typeof data !== "object") return;
    if (data.type !== EXPECTED_MESSAGE_TYPE) return;
    resolveMessage(data.response);
  };

  window.addEventListener("message", messageHandler);

  // Open popup — on mobile use _blank (new tab), on desktop use sized popup
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  let popup: Window | null;

  if (isMobile) {
    popup = window.open(url, "_blank");
  } else {
    const width = Math.round(window.outerWidth * 0.5);
    const height = Math.round(window.outerHeight * 0.5);
    const left = Math.round(window.screenX + (window.outerWidth - width) / 2);
    const top = Math.round(window.screenY + (window.outerHeight - height) / 2);
    popup = window.open(
      url,
      "oauth",
      `width=${width},height=${height},left=${left},top=${top}`
    );
  }

  if (!popup) {
    window.removeEventListener("message", messageHandler);
    return { error: new Error("Popup was blocked. Please allow popups and try again.") };
  }

  // Detect if user closes the popup
  let popupCheckInterval: ReturnType<typeof setInterval>;
  const popupClosedPromise = new Promise<never>((_, reject) => {
    popupCheckInterval = setInterval(() => {
      if (popup!.closed) {
        clearInterval(popupCheckInterval);
        reject(new Error("Sign in was cancelled"));
      }
    }, 500);
  });

  try {
    const data: any = await Promise.race([messagePromise, popupClosedPromise]);

    if (data.error) {
      if (data.error === "legacy_flow") {
        return {
          error: new Error(
            "This flow is not supported. Please try again or use email/password."
          ),
        };
      }
      return { error: new Error(data.error_description ?? "Sign in failed") };
    }

    if (data.state !== state) {
      return { error: new Error("Security state mismatch. Please try again.") };
    }

    if (!data.access_token || !data.refresh_token) {
      return { error: new Error("No tokens received from sign in") };
    }

    // Exchange broker tokens for a valid session via our edge function
    const { data: exchangeData, error: exchangeError } =
      await supabase.functions.invoke("exchange-oauth-token", {
        body: { access_token: data.access_token },
      });

    if (exchangeError) {
      return {
        error: new Error(`Token exchange failed: ${exchangeError.message}`),
      };
    }

    if (!exchangeData?.hashed_token) {
      return {
        error: new Error(
          exchangeData?.error || "Token exchange returned no session"
        ),
      };
    }

    // Use the hashed token to establish a valid session
    const { error: otpError } = await supabase.auth.verifyOtp({
      token_hash: exchangeData.hashed_token,
      type: "magiclink",
    });

    if (otpError) {
      return {
        error: new Error(`Session verification failed: ${otpError.message}`),
      };
    }

    return { error: null };
  } catch (e) {
    return { error: e instanceof Error ? e : new Error(String(e)) };
  } finally {
    clearInterval(popupCheckInterval!);
    window.removeEventListener("message", messageHandler);
    popup?.close();
  }
}
