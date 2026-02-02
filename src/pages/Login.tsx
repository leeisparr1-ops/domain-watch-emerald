import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Mail, Lock, Globe, Loader2, Eye, EyeOff, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { MaintenanceBanner } from "@/components/MaintenanceBanner";

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

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(() => {
    try {
      return localStorage.getItem("eh_remember_me") !== "0";
    } catch {
      return true;
    }
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [showResendSection, setShowResendSection] = useState(false);
  const [showMaintenance, setShowMaintenance] = useState(false);
  
  const navigate = useNavigate();

  function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const t = window.setTimeout(() => {
        reject(new Error(`${label} timed out after ${Math.round(ms / 1000)}s. Please try again.`));
      }, ms);

      promise
        .then((v) => {
          window.clearTimeout(t);
          resolve(v);
        })
        .catch((err) => {
          window.clearTimeout(t);
          reject(err);
        });
    });
  }

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!email || !password) {
      toast.error("Please enter email and password");
      return;
    }
    
    setLoading(true);
    setShowMaintenance(false);

    // Retry logic with exponential backoff for 504 gateway timeouts
    const maxRetries = 3;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const { data, error } = await withTimeout(
          supabase.auth.signInWithPassword({ email, password }),
          15000, // Increased to 15s
          "Sign-in"
        );

        if (error) {
          // Check if this is a timeout/gateway error that should be retried
          const msg = error.message.toLowerCase();
          const isRetryable = 
            msg.includes("504") || 
            msg.includes("timeout") ||
            msg.includes("gateway") ||
            msg.includes("network") ||
            msg.includes("upstream") ||
            msg.includes("deadline");

          if (isRetryable && attempt < maxRetries) {
            console.log(`Login attempt ${attempt} failed with retryable error, retrying...`);
            const delay = Math.min(1000 * Math.pow(2, attempt - 1), 4000);
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          }

          // If it's a timeout-related error after all retries, show maintenance banner
          if (isRetryable) {
            setShowMaintenance(true);
            toast.error("Service is temporarily unavailable. Please try again in a few minutes.");
            setLoading(false);
            return;
          }

          // Common case: user hasn't verified their email yet.
          if (msg.includes("confirm")) {
            setShowResendSection(true);
          }
          toast.error(error.message);
          setLoading(false);
          return;
        }

        if (!data.session) {
          toast.error("Signed in, but no session was returned. Please try again.");
          setLoading(false);
          return;
        }

        // Persist preference
        try {
          localStorage.setItem("eh_remember_me", rememberMe ? "1" : "0");
        } catch {
          // ignore
        }

        if (!rememberMe) {
          sessionStorage.setItem("eh_non_persistent_session", "1");
          const key = getSupabaseAuthTokenStorageKey();
          if (key) localStorage.removeItem(key);
        } else {
          sessionStorage.removeItem("eh_non_persistent_session");
        }
        
        toast.success("Welcome back!");
        navigate("/dashboard");
        return;
      } catch (err) {
        console.error(`Login attempt ${attempt} error:`, err);
        lastError = err instanceof Error ? err : new Error("Unknown error");

        const msg = lastError.message.toLowerCase();
        const isRetryable =
          msg.includes("timeout") ||
          msg.includes("504") ||
          msg.includes("gateway") ||
          msg.includes("network") ||
          msg.includes("upstream") ||
          msg.includes("deadline");
        
        if (isRetryable && attempt < maxRetries) {
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 4000);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
      }
    }

    // All retries failed - show maintenance banner
    setShowMaintenance(true);
    toast.error("Service is temporarily unavailable. Please try again in a few minutes.");
    setLoading(false);
  };

  const handleResendVerification = async () => {
    if (!email) {
      toast.error("Please enter your email address first");
      return;
    }

    setResendLoading(true);
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
      });

      if (error) {
        toast.error(error.message);
      } else {
        toast.success("Verification email sent! Please check your inbox.");
      }
    } catch (err) {
      console.error("Resend error:", err);
      toast.error("Failed to resend verification email");
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden">
      {/* Lightweight background pattern */}
      <div className="absolute inset-0 pattern-grid opacity-10" />

      <div className="w-full max-w-md p-8 rounded-2xl bg-card border border-border relative z-10 animate-fade-in">
        {/* Maintenance Banner */}
        {showMaintenance && (
          <MaintenanceBanner 
            onRetry={() => handleLogin()} 
            isRetrying={loading} 
          />
        )}

        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-6">
            <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
              <Globe className="w-6 h-6 text-primary-foreground" />
            </div>
          </Link>
          <h1 className="text-2xl font-bold mb-2">Welcome Back</h1>
          <p className="text-muted-foreground">Sign in to your account</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10 bg-input border-border"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              <Link to="/forgot-password" className="text-sm text-primary hover:underline">
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10 pr-10 bg-input border-border"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="remember"
              checked={rememberMe}
              onCheckedChange={(checked) => setRememberMe(checked === true)}
            />
            <Label htmlFor="remember" className="text-sm font-normal cursor-pointer">
              Remember me
            </Label>
          </div>

          <Button type="submit" variant="hero" className="w-full" disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Sign In"}
          </Button>
        </form>

        {/* Resend Verification Section */}
        <div className="mt-4 pt-4 border-t border-border">
          <button
            type="button"
            onClick={() => setShowResendSection(!showResendSection)}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors w-full text-center"
          >
            Didn't receive verification email?
          </button>
          
          {showResendSection && (
            <div className="mt-3 animate-in fade-in slide-in-from-top-2 duration-200">
              <p className="text-xs text-muted-foreground mb-2 text-center">
                Enter your email above and click below to resend
              </p>
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={handleResendVerification}
                disabled={resendLoading || !email}
              >
                {resendLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <RefreshCw className="w-4 h-4 mr-2" />
                )}
                Resend Verification Email
              </Button>
            </div>
          )}
        </div>

        <div className="mt-6 text-center text-sm text-muted-foreground">
          Don't have an account?{" "}
          <Link to="/signup" className="text-primary hover:underline">
            Sign up
          </Link>
        </div>
      </div>
    </div>
  );
}
