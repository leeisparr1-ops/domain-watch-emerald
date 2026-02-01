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
    let mounted = true;
    
    // Safety timeout - never block UI for more than 3 seconds
    const safetyTimeout = setTimeout(() => {
      if (mounted && loading) {
        console.warn('[Auth] Safety timeout - unblocking UI');
        setLoading(false);
      }
    }, 3000);

    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (mounted) {
          setSession(session);
          setUser(session?.user ?? null);
          setLoading(false);
        }
      }
    );

    // Then get initial session with fast timeout
    const sessionPromise = supabase.auth.getSession();
    const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 2000));
    
    Promise.race([sessionPromise, timeoutPromise]).then((result) => {
      if (mounted && result && 'data' in result) {
        setSession(result.data.session);
        setUser(result.data.session?.user ?? null);
      }
      if (mounted) setLoading(false);
    });

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
