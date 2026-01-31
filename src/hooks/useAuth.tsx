import { useEffect, useState, createContext, useContext, ReactNode } from "react";
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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Safety net: if the auth backend is slow/unreachable (timeouts), don't leave the app
    // stuck in a perpetual loading state.
    const safetyTimeout = window.setTimeout(() => {
      setLoading(false);
    }, 8000);

    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        window.clearTimeout(safetyTimeout);
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    // Then get initial session
    supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        window.clearTimeout(safetyTimeout);
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      })
      .catch(() => {
        window.clearTimeout(safetyTimeout);
        setSession(null);
        setUser(null);
        setLoading(false);
      });

    return () => {
      window.clearTimeout(safetyTimeout);
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
