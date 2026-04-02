import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { consumePostAuthRedirect } from "@/lib/postAuthRedirect";

const AUTH_ERROR_STORAGE_KEY = "eh_auth_error";

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

function getSupabaseAuthTokenStorageKey(): string | null {
  try {
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (!key) continue;
      if (key.startsWith("sb-") && key.endsWith("-auth-token")) return key;
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

async function exchangeBrokerTokenForSession(accessToken: string) {
  const { data: exchangeData, error: exchangeError } = await supabase.functions.invoke(
    "exchange-oauth-token",
    {
      body: { access_token: accessToken },
    }
  );

  if (exchangeError) {
    throw exchangeError;
  }

  if (!exchangeData?.hashed_token) {
    throw new Error(exchangeData?.error || "Token exchange returned no session");
  }

  const { error: otpError } = await supabase.auth.verifyOtp({
    token_hash: exchangeData.hashed_token,
    type: "magiclink",
  });

  if (otpError) {
    throw otpError;
  }
}

function getSafeRedirectPath(url: URL) {
  const nextParam = url.searchParams.get("next");

  if (nextParam?.startsWith("/")) {
    return nextParam;
  }

  return consumePostAuthRedirect() ?? "/dashboard";
}

export default function AuthCallback() {
  const [showStatus, setShowStatus] = useState(false);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => setShowStatus(true), 400);

    return () => window.clearTimeout(timeoutId);
  }, []);

  useEffect(() => {
    let mounted = true;

    const redirect = (path: string) => {
      const currentUrl = new URL(window.location.href);
      const destinationUrl = new URL(path, currentUrl.origin);
      const previewToken = currentUrl.searchParams.get("__lovable_token");

      if (previewToken && !destinationUrl.searchParams.has("__lovable_token")) {
        destinationUrl.searchParams.set("__lovable_token", previewToken);
      }

      window.location.replace(destinationUrl.toString());
    };

    const finalizeRedirect = (path: string) => {
      if (!mounted) return;
      redirect(path);
    };

    const run = async () => {
      try {
        const url = new URL(window.location.href);
        const hashParams = new URLSearchParams(url.hash.replace(/^#/, ""));
        const next = getSafeRedirectPath(url);
        const code = url.searchParams.get("code");
        const callbackError =
          url.searchParams.get("error_description") ??
          url.searchParams.get("error") ??
          hashParams.get("error_description") ??
          hashParams.get("error");

        if (callbackError) {
          throw new Error(callbackError);
        }

        // Newer confirmation / recovery links use PKCE ?code=...
        if (code) {
          clearPersistedSession();

          const { data, error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;

          if (!data.session) {
            throw new Error("Unable to complete sign-in.");
          }

          finalizeRedirect(next);
          return;
        }

        // Redirect-based social auth can return tokens in either the hash or query string.
        const access_token =
          hashParams.get("access_token") ?? url.searchParams.get("access_token") ?? undefined;
        const refresh_token =
          hashParams.get("refresh_token") ?? url.searchParams.get("refresh_token") ?? undefined;

        if (access_token && refresh_token) {
          clearPersistedSession();

          if (isBrokerSignedJwt(access_token)) {
            await exchangeBrokerTokenForSession(access_token);
          } else {
            const { data, error } = await supabase.auth.setSession({ access_token, refresh_token });
            if (error) throw error;

            if (!data.session) {
              throw new Error("Unable to complete sign-in.");
            }
          }

          finalizeRedirect(next);
          return;
        }

        // Nothing usable in the URL — just go to the target (session may have been set by the managed library already)
        const freshSession = await supabase.auth.getSession();
        if (freshSession.data.session) {
          finalizeRedirect(next);
        } else {
          redirect("/login");
        }
      } catch (err) {
        console.error("AuthCallback error:", err);
        clearPersistedSession();
        sessionStorage.setItem(AUTH_ERROR_STORAGE_KEY, getReadableAuthError(err));
        redirect("/login");
      }
    };

    run();

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      {showStatus ? (
        <div className="flex items-center gap-3 text-muted-foreground" aria-live="polite">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm">Signing you in…</span>
        </div>
      ) : (
        <span className="sr-only">Signing you in…</span>
      )}
    </div>
  );
}
