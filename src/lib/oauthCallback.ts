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

// Temporary diagnostic flag - surfaces debug info via toast notifications
// so the user can report what they see on mobile (no dev tools).
const DIAG = true;

/** Queue diagnostic messages to show AFTER React mounts (sonner needs the DOM). */
const diagMessages: string[] = [];

function diag(msg: string) {
  if (!DIAG) return;
  console.log(`[oauth-diag] ${msg}`);
  diagMessages.push(msg);
}

/** Call from React to flush queued diagnostics as toasts. */
export function flushDiagnostics() {
  if (!DIAG || diagMessages.length === 0) return;
  // Dynamic import so this module can be used before React mounts
  import("sonner").then(({ toast }) => {
    const summary = diagMessages.join(" → ");
    toast.info(`🔍 OAuth debug: ${summary}`, { duration: 15000 });
    diagMessages.length = 0;
  });
}

function extractTokens(): { access_token: string; refresh_token: string } | null {
  // Try hash fragment first (#access_token=...&refresh_token=...)
  if (window.location.hash && window.location.hash.length > 1) {
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const access = hashParams.get("access_token");
    const refresh = hashParams.get("refresh_token");
    if (access && refresh) {
      diag("Tokens found in hash");
      return { access_token: access, refresh_token: refresh };
    }
    // Log what IS in the hash
    const hashKeys = Array.from(hashParams.keys());
    if (hashKeys.length > 0) {
      diag(`Hash has keys: ${hashKeys.join(",")}`);
    }
  }

  // Try query parameters (?access_token=...&refresh_token=...)
  const queryParams = new URLSearchParams(window.location.search);
  const access = queryParams.get("access_token");
  const refresh = queryParams.get("refresh_token");
  if (access && refresh) {
    diag("Tokens found in query params");
    return { access_token: access, refresh_token: refresh };
  }

  // Log what IS in the query params (excluding __lovable_token which is the preview token)
  const queryKeys = Array.from(queryParams.keys()).filter(k => k !== "__lovable_token");
  if (queryKeys.length > 0) {
    diag(`Query has keys: ${queryKeys.join(",")}`);
  }

  return null;
}

export async function handleOAuthCallback(): Promise<boolean> {
  // Log the current URL state for diagnostics
  const url = new URL(window.location.href);
  const path = url.pathname;
  const hasHash = url.hash.length > 1;
  const hasQuery = url.search.length > 1;
  const queryKeys = Array.from(url.searchParams.keys()).filter(k => k !== "__lovable_token");

  // Only log diagnostics if there's something interesting in the URL
  if (hasHash || queryKeys.length > 0) {
    diag(`path=${path} hash=${hasHash} qkeys=${queryKeys.join(",")}`);
  }

  // Also check for existing session in localStorage
  let hasLocalSession = false;
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith("sb-") && key.endsWith("-auth-token")) {
        hasLocalSession = true;
        break;
      }
    }
  } catch { /* ignore */ }

  if (hasLocalSession && (hasHash || queryKeys.length > 0)) {
    diag("Found existing sb-auth-token in localStorage");
  }

  const tokens = extractTokens();
  if (!tokens) {
    if (hasHash || queryKeys.length > 0) {
      diag("No access_token/refresh_token found");
    }
    return false;
  }

  diag("Calling setSession…");

  try {
    const { data, error } = await supabase.auth.setSession(tokens);
    if (error) {
      diag(`setSession error: ${error.message}`);
      return false;
    }

    diag(`Session OK: ${data.user?.email ?? "no email"}`);

    // Clean tokens from URL without triggering a reload
    url.search = "";
    url.hash = "";
    window.history.replaceState({}, "", url.pathname);

    return true;
  } catch (e) {
    diag(`setSession exception: ${e}`);
    return false;
  }
}
