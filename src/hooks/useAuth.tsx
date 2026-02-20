import { useEffect, useState, createContext, useContext, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    // Set up auth state listener FIRST (Supabase best practice)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        if (!mounted) return;
        setSession(newSession);
        setUser(newSession?.user ?? null);
        setLoading(false);

        // If user opted out of "Remember me", clear localStorage token
        // so session doesn't persist across browser restarts
        if (sessionStorage.getItem("eh_non_persistent_session") === "1" && newSession) {
          try {
            for (let i = 0; i < localStorage.length; i++) {
              const key = localStorage.key(i);
              if (key?.startsWith("sb-") && key.endsWith("-auth-token")) {
                localStorage.removeItem(key);
                break;
              }
            }
          } catch {
            // ignore
          }
        }
      }
    );

    // Then get initial session and VALIDATE it
    supabase.auth.getSession().then(async (result) => {
      if (!mounted) return;

      if (result.data.session) {
        // Validate the stored session is actually accepted by the server.
        // Stale/invalid JWTs (e.g. from a failed OAuth attempt) can persist
        // in localStorage indefinitely, causing every page load to fail with
        // "invalid JWT: unable to parse or verify signature".
        const { error: userError } = await supabase.auth.getUser();
        if (userError) {
          console.warn("[auth] Stored session invalid, clearing:", userError.message);
          toast.info("Session expired — please sign in again.");
          await supabase.auth.signOut({ scope: 'local' });
          if (!mounted) return;
          setSession(null);
          setUser(null);
          setLoading(false);
          return;
        }
      }

      setSession(result.data.session);
      setUser(result.data.session?.user ?? null);
      setLoading(false);
    });

    // Safety timeout - never block UI for more than 3 seconds
    const safetyTimeout = setTimeout(() => {
      if (mounted) setLoading(false);
    }, 3000);

    return () => {
      mounted = false;
      clearTimeout(safetyTimeout);
      subscription.unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, session, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}