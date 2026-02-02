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

// Supabase-js persists the session under a localStorage key like:
// sb-<project_ref>-auth-token
// We avoid hardcoding the project ref by scanning for that pattern.
function getSupabaseAuthTokenStorageKey(): string | null {
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;
      if (key.startsWith("sb-") && key.endsWith("-auth-token")) return key;
    }
  } catch {
    // Ignore storage errors
  }
  return null;
}

function tryHydrateSessionFromLocalStorage(): { user: User; session: Session } | null {
  try {
    const key = getSupabaseAuthTokenStorageKey();
    if (!key) return null;
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;

    // Stored shape is typically { access_token, refresh_token, expires_at, user, ... }
    if (!parsed || typeof parsed !== "object") return null;
    const record = parsed as Record<string, unknown>;
    const user = record.user as User | undefined;
    const expiresAt = typeof record.expires_at === "number" ? record.expires_at : undefined;

    // If it looks valid and not expired (5 min buffer), hydrate immediately.
    if (user && expiresAt && Date.now() < expiresAt * 1000 - 300000) {
      return { user, session: record as unknown as Session };
    }
  } catch {
    // Ignore parse errors
  }
  return null;
}

function enforceNonPersistentSessionIfEnabled() {
  try {
    const isNonPersistent = sessionStorage.getItem("eh_non_persistent_session") === "1";
    if (!isNonPersistent) return;
    const key = getSupabaseAuthTokenStorageKey();
    if (!key) return;
    localStorage.removeItem(key);
  } catch {
    // Ignore
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

     // If the user opted out of persistence (“Remember me” unchecked),
     // ensure we don’t resurrect a prior localStorage session.
     enforceNonPersistentSessionIfEnabled();

     // Fast path: hydrate from Supabase localStorage token to avoid slow network/session checks.
     // This prevents ProtectedRoute from redirecting to /login while the auth service is slow.
     const hydrated = tryHydrateSessionFromLocalStorage();
     if (hydrated) {
       setUser(hydrated.user);
       setSession(hydrated.session);
       setLoading(false);
     }
    
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

    // Safety timeout - never block UI for more than 2 seconds.
    // IMPORTANT: only drop loading if we failed to hydrate a session.
    const safetyTimeout = setTimeout(() => {
      if (!mounted) return;
      if (hydrated) return;
      setLoading(false);
    }, 2000);

    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        if (mounted) {
          setSession(newSession);
          setUser(newSession?.user ?? null);
          setLoading(false);

          // Keep localStorage cleared if “Remember me” is OFF.
          enforceNonPersistentSessionIfEnabled();
          
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

    // Then get initial session (no short timeout here—timeouts cause redirect loops on slow auth).
    supabase.auth.getSession().then((result) => {
      if (!mounted) return;
      setSession(result.data.session);
      setUser(result.data.session?.user ?? null);

      // Keep localStorage cleared if “Remember me” is OFF.
      enforceNonPersistentSessionIfEnabled();

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

      setLoading(false);
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
