import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
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
  const navigate = useNavigate();
  const [message, setMessage] = useState("Finishing sign-in…");

  useEffect(() => {
    let mounted = true;

    const run = async () => {
      try {
        const url = new URL(window.location.href);
        const next = url.searchParams.get("next") || "/dashboard";
        const code = url.searchParams.get("code");

        // If the user chose a non-persistent session, ensure we keep localStorage cleared.
        const isNonPersistent = sessionStorage.getItem("eh_non_persistent_session") === "1";

        // If we already have a valid session, just continue.
        const existing = await supabase.auth.getSession();
        if (existing.data.session && !isBrokerSignedJwt(existing.data.session.access_token)) {
          if (isNonPersistent) {
            const key = getSupabaseAuthTokenStorageKey();
            if (key) localStorage.removeItem(key);
          }
          if (!mounted) return;
          navigate(next, { replace: true });
          return;
        }

        // Newer confirmation / recovery links use PKCE ?code=...
        if (code) {
          setMessage("Verifying link…");
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;

          if (isNonPersistent) {
            const key = getSupabaseAuthTokenStorageKey();
            if (key) localStorage.removeItem(key);
          }

          if (!mounted) return;
          navigate(next, { replace: true });
          return;
        }

        // Check for hash tokens (#access_token / #refresh_token)
        const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
        const access_token = hash.get("access_token") || undefined;
        const refresh_token = hash.get("refresh_token") || undefined;

        if (access_token && refresh_token) {
          // If these are broker-signed tokens, DON'T try to set them directly —
          // GoTrue will reject them. Redirect to home and let the managed
          // @lovable.dev/cloud-auth-js library handle the token exchange.
          if (isBrokerSignedJwt(access_token)) {
            console.warn("[AuthCallback] Broker-signed tokens detected — redirecting to home for managed exchange");
            // Clean the URL and redirect to home so the managed library can process
            window.location.replace(
              `${window.location.origin}/#access_token=${access_token}&refresh_token=${refresh_token}`
            );
            return;
          }

          setMessage("Starting session…");
          const { error } = await supabase.auth.setSession({ access_token, refresh_token });
          if (error) throw error;

          if (isNonPersistent) {
            const key = getSupabaseAuthTokenStorageKey();
            if (key) localStorage.removeItem(key);
          }

          if (!mounted) return;
          navigate(next, { replace: true });
          return;
        }

        // Nothing usable in the URL — just go to the target (session may have been set by the managed library already)
        const freshSession = await supabase.auth.getSession();
        if (freshSession.data.session) {
          navigate(next, { replace: true });
        } else {
          navigate("/login", { replace: true });
        }
      } catch (err) {
        console.error("AuthCallback error:", err);
        const errMsg = err instanceof Error ? err.message : "";
        // Don't show broker JWT errors to users — they're internal
        if (errMsg.includes("unrecognized JWT kid") || errMsg.includes("bad_jwt")) {
          console.warn("[AuthCallback] Suppressing broker JWT error, redirecting to login");
        } else {
          toast.error(errMsg || "Unable to complete authentication");
        }
        navigate("/login", { replace: true });
      }
    };

    run();

    return () => {
      mounted = false;
    };
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex items-center gap-3 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span className="text-sm">{message}</span>
      </div>
    </div>
  );
}
