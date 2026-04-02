import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

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

    const finalizeRedirect = (path: string) => {
      if (!mounted) return;
      redirect(path);
    };

    const run = async () => {
      try {
        const url = new URL(window.location.href);
        const hashParams = new URLSearchParams(url.hash.replace(/^#/, ""));
        const nextParam = url.searchParams.get("next");
        const next = nextParam?.startsWith("/") ? nextParam : "/dashboard";
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
          const { data, error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;

          if (!data.session) {
            throw new Error("Unable to complete sign-in.");
          }

          finalizeRedirect(next);
          return;
        }

        // Check for tokens in hash (legacy flows)
        const access_token = hashParams.get("access_token") ?? undefined;
        const refresh_token = hashParams.get("refresh_token") ?? undefined;

        if (access_token && refresh_token) {
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
        if (freshSession.data.session) {
          finalizeRedirect(next);
        } else {
          redirect("/login");
        }
      } catch (err) {
        console.error("AuthCallback error:", err);
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
