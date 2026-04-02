import { useEffect, useState, createContext, useContext, ReactNode, useRef } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { flushDiagnostics } from "@/lib/oauthCallback";

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
  const latestSessionRef = useRef<Session | null>(null);
  const authEventVersionRef = useRef(0);

  const setAuthState = (nextSession: Session | null, nextUser: User | null = nextSession?.user ?? null) => {
    latestSessionRef.current = nextSession;
    setSession(nextSession);
    setUser(nextUser);
  };

  const clearPersistedSessionToken = () => {
    try {
      const keys = Object.keys(localStorage);
      for (const key of keys) {
        if (key.startsWith("sb-") && key.endsWith("-auth-token")) {
          localStorage.removeItem(key);
          break;
        }
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    let mounted = true;
    let hydrating = true;

    const maybeApplyNonPersistentSessionPolicy = (nextSession: Session | null) => {
      if (sessionStorage.getItem("eh_non_persistent_session") === "1" && nextSession) {
        clearPersistedSessionToken();
      }
    };

    const isTransientError = (err: unknown): boolean => {
      const msg = String(err).toLowerCase();
      return (
        msg.includes("timeout") ||
        msg.includes("timed out") ||
        msg.includes("deadline exceeded") ||
        msg.includes("failed to fetch") ||
        msg.includes("network") ||
        msg.includes("503") ||
        msg.includes("504")
      );
    };

    // Set up auth state listener FIRST (Supabase best practice)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        if (!mounted) return;
        authEventVersionRef.current += 1;

        // If the event clears the session but we suspect it's a transient backend
        // issue (e.g. refresh token timeout), keep the existing session in state
        // so users aren't kicked out of protected routes during brief outages.
        if (!newSession && latestSessionRef.current && _event !== "SIGNED_OUT") {
          console.warn("[auth] onAuthStateChange sent null session during non-signout event, preserving current session");
        } else {
          setAuthState(newSession);
        }

        maybeApplyNonPersistentSessionPolicy(newSession ?? latestSessionRef.current);

        // Avoid ending loading state before initial getSession() hydration completes.
        if (!hydrating) {
          setLoading(false);
        }
      }
    );

    // Then get initial session and VALIDATE it
    void (async () => {
      try {
        // Flush any OAuth diagnostic messages now that React is mounted
        flushDiagnostics();

        const hydrationVersion = authEventVersionRef.current;
        let result: { data: { session: Session | null }; error: any } | null = null;

        // Retry getSession up to 2 times on transient backend errors
        for (let attempt = 1; attempt <= 2; attempt++) {
          try {
            result = await supabase.auth.getSession();
            break;
          } catch (err) {
            if (attempt < 2 && isTransientError(err)) {
              console.warn(`[auth] getSession attempt ${attempt} failed (transient), retrying…`);
              await new Promise(r => setTimeout(r, attempt * 1500));
            } else {
              throw err;
            }
          }
        }

        if (!mounted || !result) return;

        const currentSession = authEventVersionRef.current > hydrationVersion
          ? latestSessionRef.current
          : (latestSessionRef.current ?? result.data.session);

        console.log("[auth] getSession:", currentSession ? "found" : "none");

        if (!currentSession) {
          setAuthState(null);
          return;
        }

        setAuthState(currentSession, currentSession.user ?? null);
        maybeApplyNonPersistentSessionPolicy(currentSession);
      } catch (error) {
        console.error("[auth] Initial session hydration failed:", error);
        // On transient errors, don't wipe an existing local session
        if (isTransientError(error) && latestSessionRef.current) {
          console.warn("[auth] Keeping existing session despite hydration error");
        }
      } finally {
        hydrating = false;
        if (mounted) {
          setLoading(false);
        }
      }
    })();

    return () => {
      mounted = false;
      hydrating = false;
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