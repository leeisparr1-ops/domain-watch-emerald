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

        // If we already have a session, just continue.
        const existing = await supabase.auth.getSession();
        if (existing.data.session) {
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

        // Older-style links may include #access_token / #refresh_token
        const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
        const access_token = hash.get("access_token") || undefined;
        const refresh_token = hash.get("refresh_token") || undefined;

        if (access_token && refresh_token) {
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

        // Nothing usable in the URL.
        toast.error("This link is missing required authentication data. Please request a new email and try again.");
        navigate("/login", { replace: true });
      } catch (err) {
        console.error("AuthCallback error:", err);
        toast.error(err instanceof Error ? err.message : "Unable to complete authentication");
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
