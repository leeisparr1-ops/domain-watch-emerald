import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  consumeStoredAuthCallbackPayload,
  type StoredAuthCallbackPayload,
} from "@/lib/authCallbackBootstrap";

function getSupabaseAuthTokenStorageKey(): string | null {
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;
      if (key.startsWith("sb-") && key.endsWith("-auth-token")) return key;
    }
  } catch {
    // ignore
  }
  return null;
}

/**
 * Check if a JWT is signed by the Lovable OAuth broker (not GoTrue).
 * Broker tokens have long UUID-style kid values that GoTrue doesn't recognise.
 */
function isBrokerSignedJwt(jwt: string): boolean {
  try {
    const parts = jwt.split(".");
    if (parts.length !== 3) return false;
    const header = JSON.parse(atob(parts[0].replace(/-/g, "+").replace(/_/g, "/")));
    if (header.kid && header.kid.includes("-") && header.kid.length > 30) {
      return true;
    }
  } catch {
    // Not parseable — treat as not broker
  }
  return false;
}

function mergeCallbackParams(url: URL, storedPayload: StoredAuthCallbackPayload | null) {
  const searchParams = new URLSearchParams(storedPayload?.search ?? "");
  url.searchParams.forEach((value, key) => {
    if (!searchParams.has(key)) {
      searchParams.set(key, value);
    }
  });

  const hashParams = new URLSearchParams((storedPayload?.hash ?? "").replace(/^#/, ""));
  const currentHashParams = new URLSearchParams(url.hash.replace(/^#/, ""));
  currentHashParams.forEach((value, key) => {
    if (!hashParams.has(key)) {
      hashParams.set(key, value);
    }
  });

  return { hashParams, searchParams };
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

export default function AuthCallback() {
  const [showStatus, setShowStatus] = useState(false);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => setShowStatus(true), 400);

    return () => window.clearTimeout(timeoutId);
  }, []);

  useEffect(() => {
    let mounted = true;

    const redirect = (path: string) => {
      window.location.replace(path);
    };

    const clearPersistedSession = () => {
      const key = getSupabaseAuthTokenStorageKey();
      if (key) localStorage.removeItem(key);
    };

    const finalizeRedirect = (path: string) => {
      if (!mounted) return;
      redirect(path);
    };

    const run = async () => {
      try {
        const url = new URL(window.location.href);
        const storedPayload = consumeStoredAuthCallbackPayload();
        const { hashParams, searchParams } = mergeCallbackParams(url, storedPayload);
        const nextParam = url.searchParams.get("next") ?? searchParams.get("next");
        const next = nextParam?.startsWith("/") ? nextParam : "/dashboard";
        const code = searchParams.get("code");
        const callbackError =
          searchParams.get("error_description") ??
          searchParams.get("error") ??
          hashParams.get("error_description") ??
          hashParams.get("error");

        if (callbackError) {
          throw new Error(callbackError);
        }

        // Newer confirmation / recovery links use PKCE ?code=...
        if (code) {
          const { data, error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;

          if (!data.session) {
            throw new Error("Unable to complete sign-in.");
          }

          finalizeRedirect(next);
          return;
        }

        // Check for callback tokens in either the hash or query string.
        const access_token = hashParams.get("access_token") ?? searchParams.get("access_token") ?? undefined;
        const refresh_token = hashParams.get("refresh_token") ?? searchParams.get("refresh_token") ?? undefined;

        if (access_token && refresh_token) {
          clearPersistedSession();

          if (isBrokerSignedJwt(access_token)) {
            const { data, error } = await supabase.auth.refreshSession({
              refresh_token,
            } as Parameters<typeof supabase.auth.refreshSession>[0]);

            if (error) throw error;

            if (!data.session || isBrokerSignedJwt(data.session.access_token)) {
              throw new Error("Unable to complete sign-in.");
            }

            finalizeRedirect(next);
            return;
          }

          const { data, error } = await supabase.auth.setSession({ access_token, refresh_token });
          if (error) throw error;

          if (!data.session) {
            throw new Error("Unable to complete sign-in.");
          }

          finalizeRedirect(next);
          return;
        }

        // Nothing usable in the URL — just go to the target (session may have been set by the managed library already)
        const freshSession = await supabase.auth.getSession();
        if (freshSession.data.session && !isBrokerSignedJwt(freshSession.data.session.access_token)) {
          finalizeRedirect(next);
        } else {
          redirect("/login");
        }
      } catch (err) {
        console.error("AuthCallback error:", err);
        clearPersistedSession();
        sessionStorage.setItem("eh_auth_error", getReadableAuthError(err));
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
