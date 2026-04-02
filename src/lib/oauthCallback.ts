/**
 * Process OAuth callback tokens that arrive via URL after a redirect-based
 * OAuth flow.
 *
 * Must run BEFORE React renders so the auth provider sees the restored
 * session on first hydration.
 */
import { supabase } from "@/integrations/supabase/client";
import { clearPostAuthRedirect } from "@/lib/postAuthRedirect";

const AUTH_ERROR_STORAGE_KEY = "eh_auth_error";
const AUTH_PARAM_NAMES = new Set([
  "access_token",
  "refresh_token",
  "expires_at",
  "expires_in",
  "provider_token",
  "provider_refresh_token",
  "token_type",
  "state",
]);

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

function preserveNonAuthParams(params: URLSearchParams) {
  const nextParams = new URLSearchParams();

  params.forEach((value, key) => {
    if (!AUTH_PARAM_NAMES.has(key)) {
      nextParams.append(key, value);
    }
  });

  return nextParams;
}

function cleanupOAuthUrl(url: URL) {
  const cleanUrl = new URL(url.pathname, url.origin);
  const preservedSearch = preserveNonAuthParams(url.searchParams);
  const preservedHash = preserveNonAuthParams(new URLSearchParams(url.hash.replace(/^#/, "")));

  const search = preservedSearch.toString();
  const hash = preservedHash.toString();

  cleanUrl.search = search ? `?${search}` : "";
  cleanUrl.hash = hash ? `#${hash}` : "";

  window.history.replaceState({}, "", cleanUrl.toString());
}

function redirectToLogin(url: URL) {
  const loginUrl = new URL("/login", url.origin);
  const previewToken = url.searchParams.get("__lovable_token");

  if (previewToken) {
    loginUrl.searchParams.set("__lovable_token", previewToken);
  }

  window.location.replace(loginUrl.toString());
}

function extractTokens(): { access_token: string; refresh_token: string } | null {
  if (window.location.hash && window.location.hash.length > 1) {
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const access = hashParams.get("access_token");
    const refresh = hashParams.get("refresh_token");

    if (access && refresh) {
      return { access_token: access, refresh_token: refresh };
    }
  }

  const queryParams = new URLSearchParams(window.location.search);
  const access = queryParams.get("access_token");
  const refresh = queryParams.get("refresh_token");

  if (access && refresh) {
    return { access_token: access, refresh_token: refresh };
  }

  return null;
}

async function exchangeBrokerTokens(accessToken: string) {
  const { data, error } = await supabase.functions.invoke("exchange-oauth-token", {
    body: { access_token: accessToken },
  });

  if (error) {
    throw error;
  }

  if (!data?.hashed_token) {
    throw new Error(data?.error || "Unable to complete sign-in.");
  }

  const { data: verifyData, error: verifyError } = await supabase.auth.verifyOtp({
    token_hash: data.hashed_token,
    type: "magiclink",
  });

  if (verifyError) {
    throw verifyError;
  }

  if (!verifyData.session) {
    throw new Error("Unable to complete sign-in.");
  }

  return verifyData.session;
}

export async function handleOAuthCallback(): Promise<boolean> {
  const url = new URL(window.location.href);
  const tokens = extractTokens();

  if (!tokens) {
    return false;
  }

  try {
    if (isBrokerSignedJwt(tokens.access_token)) {
      await exchangeBrokerTokens(tokens.access_token);
    } else {
      const { data, error } = await supabase.auth.setSession(tokens);

      if (error) {
        throw error;
      }

      if (!data.session) {
        throw new Error("Unable to complete sign-in.");
      }
    }

    cleanupOAuthUrl(url);
    return true;
  } catch (error) {
    console.error("[oauth] callback session setup failed:", error);
    clearPostAuthRedirect();
    cleanupOAuthUrl(url);

    try {
      sessionStorage.setItem(AUTH_ERROR_STORAGE_KEY, getReadableAuthError(error));
    } catch {
      // ignore
    }

    redirectToLogin(url);
    return true;
  }
}
