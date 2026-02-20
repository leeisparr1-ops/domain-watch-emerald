/**
 * Force popup-based Google OAuth even on mobile / non-iframe contexts.
 *
 * The default @lovable.dev/cloud-auth-js library redirects the page when
 * running outside an iframe (i.e. on the published site). The redirect flow
 * returns tokens signed with a JWT kid that the Supabase project doesn't
 * recognise, causing setSession() to fail.
 *
 * The popup / web_message flow returns valid tokens. This module replicates
 * the library's popup logic so we can use it everywhere.
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
  const popupClosedPromise = new Promise<never>((_, reject) => {
    const interval = setInterval(() => {
      if (popup!.closed) {
        clearInterval(interval);
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

    // Set the session using the tokens from the web_message flow
    const { error } = await supabase.auth.setSession({
      access_token: data.access_token,
      refresh_token: data.refresh_token,
    });

    if (error) {
      return { error: new Error(`Session setup failed: ${error.message}`) };
    }

    return { error: null };
  } catch (e) {
    return { error: e instanceof Error ? e : new Error(String(e)) };
  } finally {
    window.removeEventListener("message", messageHandler);
    popup?.close();
  }
}
