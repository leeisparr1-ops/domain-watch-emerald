import { useEffect, useState, createContext, useContext, ReactNode, useRef } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

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

/**
 * Detect broker-signed JWTs that GoTrue will reject.
 * These have a kid that doesn't belong to the project's signing keys.
 */
function isBrokerToken(jwt: string | undefined): boolean {
  if (!jwt) return false;
  try {
    const parts = jwt.split(".");
    if (parts.length !== 3) return false;
    const header = JSON.parse(atob(parts[0].replace(/-/g, "+").replace(/_/g, "/")));
    // The Lovable broker uses kid "b2d25ab4-..." which GoTrue doesn't recognise
    if (header.kid && header.kid.includes("-") && header.kid.length > 30) {
      return true;
    }
  } catch {
    // Not a valid JWT — let the normal flow handle it
  }
  return false;
}

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

  /**
   * If the stored session contains a broker-signed JWT (kid mismatch),
   * clear it immediately so it doesn't cause repeated 403s from GoTrue.
   */
  const clearBrokerTokensFromStorage = () => {
    try {
      const keys = Object.keys(localStorage);
      for (const key of keys) {
        if (key.startsWith("sb-") && key.endsWith("-auth-token")) {
          const raw = localStorage.getItem(key);
          if (!raw) continue;
          const parsed = JSON.parse(raw);
          const accessToken = parsed?.access_token ?? parsed?.currentSession?.access_token;
          if (isBrokerToken(accessToken)) {
            console.warn("[auth] Clearing stale broker token from localStorage");
            localStorage.removeItem(key);
            return true;
          }
        }
      }
    } catch {
      // ignore
    }
    return false;
  };

  useEffect(() => {
    let mounted = true;
    let hydrating = true;

    // Pre-flight: clear any stale broker tokens BEFORE Supabase tries to use them
    const hadBrokerToken = clearBrokerTokensFromStorage();

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

    const isBadJwtError = (err: unknown): boolean => {
      const msg = String(err).toLowerCase();
      return msg.includes("bad_jwt") || msg.includes("invalid jwt") || msg.includes("unrecognized jwt kid");
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
        // If we cleared a broker token, skip getSession — there's no valid session
        if (hadBrokerToken) {
          console.log("[auth] Skipped getSession — broker token was cleared");
          setAuthState(null);
          return;
        }

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

        // If getSession returned an error about bad JWT, clear the stored session
        if (result.error && isBadJwtError(result.error)) {
          console.warn("[auth] getSession returned bad JWT error — clearing stored session");
          clearPersistedSessionToken();
          setAuthState(null);
          return;
        }

        const currentSession = authEventVersionRef.current > hydrationVersion
          ? latestSessionRef.current
          : (latestSessionRef.current ?? result.data.session);

        console.log("[auth] getSession:", currentSession ? "found" : "none");

        if (!currentSession) {
          setAuthState(null);
          return;
        }

        // Final safety check: if the restored session has a broker token, discard it
        if (isBrokerToken(currentSession.access_token)) {
          console.warn("[auth] Restored session has broker token — discarding");
          clearPersistedSessionToken();
          setAuthState(null);
          return;
        }

        setAuthState(currentSession, currentSession.user ?? null);
        maybeApplyNonPersistentSessionPolicy(currentSession);
      } catch (error) {
        console.error("[auth] Initial session hydration failed:", error);

        // If the error is about an invalid JWT, clear the poisoned session
        if (isBadJwtError(error)) {
          console.warn("[auth] Clearing poisoned session from storage");
          clearPersistedSessionToken();
          setAuthState(null);
        } else if (isTransientError(error) && latestSessionRef.current) {
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
