/**
 * Process OAuth callback tokens that arrive via URL after a redirect-based
 * OAuth flow (used on mobile / non-iframe contexts).
 *
 * The Lovable OAuth broker redirects back to the app with tokens in either
 * the URL hash fragment or query parameters. This module detects them,
 * feeds them to supabase.auth.setSession(), and cleans up the URL.
 *
 * Must be called BEFORE React renders so the AuthProvider picks up the
 * session from onAuthStateChange.
 */
import { supabase } from "@/integrations/supabase/client";

function extractTokens(): { access_token: string; refresh_token: string } | null {
  // Try hash fragment first (#access_token=...&refresh_token=...)
  if (window.location.hash) {
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const access = hashParams.get("access_token");
    const refresh = hashParams.get("refresh_token");
    if (access && refresh) {
      return { access_token: access, refresh_token: refresh };
    }
  }

  // Try query parameters (?access_token=...&refresh_token=...)
  const queryParams = new URLSearchParams(window.location.search);
  const access = queryParams.get("access_token");
  const refresh = queryParams.get("refresh_token");
  if (access && refresh) {
    return { access_token: access, refresh_token: refresh };
  }

  return null;
}

export async function handleOAuthCallback(): Promise<boolean> {
  const tokens = extractTokens();
  if (!tokens) return false;

  console.log("[oauth-callback] Detected OAuth tokens in URL, setting session…");

  try {
    const { error } = await supabase.auth.setSession(tokens);
    if (error) {
      console.error("[oauth-callback] setSession failed:", error.message);
      return false;
    }

    console.log("[oauth-callback] Session established successfully");

    // Clean tokens from URL without triggering a reload
    const url = new URL(window.location.href);
    url.search = "";
    url.hash = "";
    window.history.replaceState({}, "", url.pathname);

    return true;
  } catch (e) {
    console.error("[oauth-callback] Unexpected error:", e);
    return false;
  }
}
