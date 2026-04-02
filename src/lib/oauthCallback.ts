/**
 * Process OAuth callback tokens that arrive via URL after a redirect-based
 * OAuth flow.
 *
 * Must run BEFORE React renders so the auth provider sees the restored
 * session on first hydration.
 */
import { supabase } from "@/integrations/supabase/client";
import {
  consumeStoredAuthCallbackPayload,
  type StoredAuthCallbackPayload,
} from "@/lib/authCallbackBootstrap";
import { clearPostAuthRedirect } from "@/lib/postAuthRedirect";

const AUTH_ERROR_STORAGE_KEY = "eh_auth_error";

function isBrokerSignedJwt(jwt: string | undefined): boolean {
  if (!jwt) return false;

  try {
    const parts = jwt.split(".");
    if (parts.length !== 3) return false;

    const header = JSON.parse(atob(parts[0].replace(/-/g, "+").replace(/_/g, "/")));
    return Boolean(header.kid && header.kid.includes("-") && header.kid.length > 30);
  } catch {
    return false;
  }
}

function getReadableAuthError(error: unknown) {
  const message = error instanceof Error ? error.message.trim() : "";
  const normalized = message.toLowerCase();

  if (!message || message === "{}" || normalized === "[object object]") {
    return "Sign-in failed. Please try again.";
  }

  if (normalized.includes("cancel")) {
    return "Sign-in was cancelled.";
  }

  if (
    normalized.includes("unrecognized jwt kid") ||
    normalized.includes("bad_jwt") ||
    normalized.includes("invalid jwt") ||
    normalized.includes("unable to establish")
  ) {
    return "Sign-in failed. Please try again.";
  }

  return message;
}

function getSupabaseAuthTokenStorageKey(): string | null {
  try {
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (!key) continue;
      if (key.startsWith("sb-") && key.endsWith("-auth-token")) {
        return key;
      }
    }
  } catch {
    // ignore
  }

  return null;
}

function clearPersistedSession() {
  const storageKey = getSupabaseAuthTokenStorageKey();
  if (storageKey) {
    localStorage.removeItem(storageKey);
  }
}

function redirectToLogin(url: URL) {
  const loginUrl = new URL("/login", url.origin);
  const previewToken = url.searchParams.get("__lovable_token");

  if (previewToken) {
    loginUrl.searchParams.set("__lovable_token", previewToken);
  }

  window.location.replace(loginUrl.toString());
}

function buildCallbackUrl(storedPayload: StoredAuthCallbackPayload | null) {
  const currentUrl = new URL(window.location.href);

  if (!storedPayload) {
    return currentUrl;
  }

  const callbackUrl = new URL(storedPayload.pathname || currentUrl.pathname, currentUrl.origin);
  callbackUrl.search = storedPayload.search;
  callbackUrl.hash = storedPayload.hash;

  return callbackUrl;
}

function extractTokens(url: URL): { access_token: string; refresh_token: string } | null {
  if (url.hash && url.hash.length > 1) {
    const hashParams = new URLSearchParams(url.hash.substring(1));
    const access = hashParams.get("access_token");
    const refresh = hashParams.get("refresh_token");

    if (access && refresh) {
      return { access_token: access, refresh_token: refresh };
    }
  }

  const queryParams = new URLSearchParams(url.search);
  const access = queryParams.get("access_token");
  const refresh = queryParams.get("refresh_token");

  if (access && refresh) {
    return { access_token: access, refresh_token: refresh };
  }

  return null;
}

function extractCallbackError(url: URL) {
  const hashParams = new URLSearchParams(url.hash.replace(/^#/, ""));

  return (
    url.searchParams.get("error_description") ??
    url.searchParams.get("error") ??
    hashParams.get("error_description") ??
    hashParams.get("error")
  );
}

export async function handleOAuthCallback(): Promise<boolean> {
  const currentUrl = new URL(window.location.href);
  const storedPayload = consumeStoredAuthCallbackPayload();
  const callbackUrl = buildCallbackUrl(storedPayload);
  const tokens = extractTokens(callbackUrl);
  const code = callbackUrl.searchParams.get("code");
  const callbackError = extractCallbackError(callbackUrl);

  if (!code && !callbackError && !tokens) {
    return false;
  }

  try {
    if (callbackError) {
      throw new Error(callbackError);
    }

    if (code) {
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);

      if (error) {
        throw error;
      }

      if (!data.session) {
        throw new Error("Unable to complete sign-in.");
      }

      return true;
    }

    if (!tokens) {
      return false;
    }

    clearPersistedSession();

    if (isBrokerSignedJwt(tokens.access_token)) {
      const { data, error } = await supabase.auth.refreshSession({
        refresh_token: tokens.refresh_token,
      } as Parameters<typeof supabase.auth.refreshSession>[0]);

      if (error) {
        throw error;
      }

      if (!data.session || isBrokerSignedJwt(data.session.access_token)) {
        throw new Error("Unable to complete sign-in.");
      }
    } else {
      const { data, error } = await supabase.auth.setSession(tokens);

      if (error) {
        throw error;
      }

      if (!data.session) {
        throw new Error("Unable to complete sign-in.");
      }

      if (isBrokerSignedJwt(data.session.access_token)) {
        throw new Error("Unable to complete sign-in.");
      }
    }

    return true;
  } catch (error) {
    console.error("[oauth] callback session setup failed:", error);
    clearPostAuthRedirect();
    clearPersistedSession();

    try {
      sessionStorage.setItem(AUTH_ERROR_STORAGE_KEY, getReadableAuthError(error));
    } catch {
      // ignore
    }

    redirectToLogin(currentUrl);
    return true;
  }
}
