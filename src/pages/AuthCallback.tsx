import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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

export default function AuthCallback() {
  const [message, setMessage] = useState("Finishing sign-in…");

  useEffect(() => {
    let mounted = true;

    const redirect = (path: string) => {
      window.location.replace(path);
    };

    const clearPersistedSession = () => {
      const key = getSupabaseAuthTokenStorageKey();
      if (key) localStorage.removeItem(key);
    };

    const finalizeRedirect = (path: string, isNonPersistent: boolean) => {
      if (isNonPersistent) {
        clearPersistedSession();
      }

      if (!mounted) return;
      redirect(path);
    };

    const run = async () => {
      try {
        const url = new URL(window.location.href);
        const nextParam = url.searchParams.get("next");
        const next = nextParam?.startsWith("/") ? nextParam : "/dashboard";
        const code = url.searchParams.get("code");

        // If the user chose a non-persistent session, ensure we keep localStorage cleared.
        const isNonPersistent = sessionStorage.getItem("eh_non_persistent_session") === "1";

        // If we already have a valid session, just continue.
        const existing = await supabase.auth.getSession();
        if (existing.data.session && !isBrokerSignedJwt(existing.data.session.access_token)) {
          finalizeRedirect(next, isNonPersistent);
          return;
        }

        // Newer confirmation / recovery links use PKCE ?code=...
        if (code) {
          setMessage("Verifying link…");
          const { data, error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;

          const establishedSession = data.session ?? (await supabase.auth.getSession()).data.session;
          if (!establishedSession) {
            throw new Error("Unable to create a session from this link");
          }

          finalizeRedirect(next, isNonPersistent);
          return;
        }

        // Check for callback tokens in either the hash or query string.
        const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
        const access_token = hash.get("access_token") ?? url.searchParams.get("access_token") ?? undefined;
        const refresh_token = hash.get("refresh_token") ?? url.searchParams.get("refresh_token") ?? undefined;

        if (access_token && refresh_token) {
          if (isBrokerSignedJwt(access_token)) {
            setMessage("Starting secure session…");
            clearPersistedSession();

            const { data, error } = await supabase.auth.refreshSession({
              refresh_token,
            });

            if (error) throw error;

            const establishedSession = data.session ?? (await supabase.auth.getSession()).data.session;
            if (!establishedSession || isBrokerSignedJwt(establishedSession.access_token)) {
              throw new Error("Unable to establish a valid session");
            }

            finalizeRedirect(next, isNonPersistent);
            return;
          }

          setMessage("Starting session…");
          const { data, error } = await supabase.auth.setSession({ access_token, refresh_token });
          if (error) throw error;

          const establishedSession = data.session ?? (await supabase.auth.getSession()).data.session;
          if (!establishedSession) {
            throw new Error("Unable to establish a session");
          }

          finalizeRedirect(next, isNonPersistent);
          return;
        }

        // Nothing usable in the URL — just go to the target (session may have been set by the managed library already)
        const freshSession = await supabase.auth.getSession();
        if (freshSession.data.session && !isBrokerSignedJwt(freshSession.data.session.access_token)) {
          finalizeRedirect(next, isNonPersistent);
        } else {
          redirect("/login");
        }
      } catch (err) {
        console.error("AuthCallback error:", err);
        const errMsg = err instanceof Error ? err.message : "";
        // Don't show broker JWT errors to users — they're internal
        if (errMsg.includes("unrecognized JWT kid") || errMsg.includes("bad_jwt")) {
          console.warn("[AuthCallback] Suppressing broker JWT error, redirecting to login");
          clearPersistedSession();
        } else {
          toast.error(errMsg || "Unable to complete authentication");
        }
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
      <div className="flex items-center gap-3 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span className="text-sm">{message}</span>
      </div>
    </div>
  );
}
