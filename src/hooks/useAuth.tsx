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

    // Set up auth state listener FIRST (Supabase best practice)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        if (!mounted) return;
        authEventVersionRef.current += 1;
        setAuthState(newSession);
        maybeApplyNonPersistentSessionPolicy(newSession);

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
        const result = await supabase.auth.getSession();
        if (!mounted) return;

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