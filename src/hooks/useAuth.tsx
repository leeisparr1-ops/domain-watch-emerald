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

const SESSION_CACHE_KEY = 'eh_session_cache';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    
    // Try to restore from cache immediately for instant UI
    try {
      const cached = sessionStorage.getItem(SESSION_CACHE_KEY);
      if (cached) {
        const { user: cachedUser, expiresAt } = JSON.parse(cached);
        // Only use cache if not expired (with 5 min buffer)
        if (expiresAt && Date.now() < expiresAt - 300000) {
          setUser(cachedUser);
          setLoading(false);
        }
      }
    } catch {
      // Ignore cache errors
    }

    // Safety timeout - never block UI for more than 2 seconds
    const safetyTimeout = setTimeout(() => {
      if (mounted && loading) {
        setLoading(false);
      }
    }, 2000);

    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        if (mounted) {
          setSession(newSession);
          setUser(newSession?.user ?? null);
          setLoading(false);
          
          // Cache for next page load
          if (newSession?.user) {
            try {
              sessionStorage.setItem(SESSION_CACHE_KEY, JSON.stringify({
                user: newSession.user,
                expiresAt: newSession.expires_at ? newSession.expires_at * 1000 : Date.now() + 3600000,
              }));
            } catch {
              // Ignore storage errors
            }
          } else {
            sessionStorage.removeItem(SESSION_CACHE_KEY);
          }
        }
      }
    );

    // Then get initial session with fast timeout
    const sessionPromise = supabase.auth.getSession();
    const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 1500));
    
    Promise.race([sessionPromise, timeoutPromise]).then((result) => {
      if (mounted && result && 'data' in result) {
        setSession(result.data.session);
        setUser(result.data.session?.user ?? null);
        
        // Cache for next page load
        if (result.data.session?.user) {
          try {
            sessionStorage.setItem(SESSION_CACHE_KEY, JSON.stringify({
              user: result.data.session.user,
              expiresAt: result.data.session.expires_at ? result.data.session.expires_at * 1000 : Date.now() + 3600000,
            }));
          } catch {
            // Ignore storage errors
          }
        }
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
