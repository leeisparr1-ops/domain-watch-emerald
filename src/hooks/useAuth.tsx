import { useEffect, useState, createContext, useContext, ReactNode, useRef } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

/**
 * Detect broker-signed JWTs that GoTrue will reject with bad_jwt.
 * These have a kid that doesn't belong to this project's GoTrue instance.
 */
function isBrokerJwt(accessToken: string | undefined): boolean {
  if (!accessToken) return false;
  try {
    const parts = accessToken.split(".");
    if (parts.length !== 3) return false;
    const header = JSON.parse(atob(parts[0].replace(/-/g, "+").replace(/_/g, "/")));
    // Broker JWTs use ES256 with an external kid; GoTrue uses HS256 with no kid
    if (header.alg === "ES256" && header.kid) return true;
  } catch {
    // ignore
  }
  return false;
}

interface AuthContextType { user: User | null; session: Session | null; loading: boolean; }

const AuthContext = createContext<AuthContextType>({ user: null, session: null, loading: true });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        if (!mounted) return;
        setSession(newSession);
        setUser(newSession?.user ?? null);
        setLoading(false);
      }
    );

    // Get initial session
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      if (!mounted) return;

      // If the stored token is a broker-signed JWT, GoTrue will reject it.
      // Clear it so the user can sign in fresh.
      if (s && isBrokerJwt(s.access_token)) {
        console.warn("[auth] Clearing stale broker-signed JWT");
        supabase.auth.signOut().then(() => {
          if (!mounted) return;
          setSession(null);
          setUser(null);
          setLoading(false);
        });
      } else {
        setSession(s);
        setUser(s?.user ?? null);
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
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
