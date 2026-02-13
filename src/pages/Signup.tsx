import { useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Mail, Lock, Globe, Loader2, User, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { PasswordStrengthIndicator } from "@/components/PasswordStrengthIndicator";
import { CloudflareTurnstile } from "@/components/CloudflareTurnstile";

export default function Signup() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleTurnstileVerify = useCallback((token: string) => {
    setTurnstileToken(token);
  }, []);

  const handleTurnstileExpire = useCallback(() => {
    setTurnstileToken(null);
  }, []);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    if (!turnstileToken) {
      toast.error("Please complete the security check");
      return;
    }
    setLoading(true);

    try {
      // Verify turnstile token server-side
      const { data: verifyData, error: verifyError } = await supabase.functions.invoke('verify-turnstile', {
        body: { token: turnstileToken },
      });

      if (verifyError || !verifyData?.success) {
        toast.error("Security verification failed. Please try again.");
        setTurnstileToken(null);
        setLoading(false);
        return;
      }

      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?next=/dashboard`,
          data: {
            full_name: fullName,
          },
        },
      });

      if (error) {
        toast.error(error.message);
      } else {
        supabase.functions.invoke('send-welcome-email', {
          body: { email, name: fullName },
        }).catch(err => console.error('Welcome email error:', err));

        toast.success("Account created! Please check your email to verify your account before signing in.", {
          duration: 10000,
        });
        navigate("/login");
      }
    } catch (err) {
      console.error("Signup error:", err);
      toast.error("Unable to create account. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden">
      <div className="absolute inset-0 pattern-grid opacity-10" />

      <div className="w-full max-w-md p-8 rounded-2xl bg-card border border-border relative z-10 animate-fade-in">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-6">
            <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
              <Globe className="w-6 h-6 text-primary-foreground" />
            </div>
          </Link>
          <h1 className="text-2xl font-bold mb-2">Create Account</h1>
          <p className="text-muted-foreground">Start monitoring domains for free</p>
        </div>

        <form onSubmit={handleSignup} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Full Name</Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="name"
                type="text"
                placeholder="John Doe"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="pl-10 bg-input border-border"
                required
              />
            </div>
          </div>

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
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10 pr-10 bg-input border-border"
                minLength={8}
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
            <PasswordStrengthIndicator password={password} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="confirmPassword"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="pl-10 bg-input border-border"
                minLength={8}
                required
              />
            </div>
          </div>

          <CloudflareTurnstile
            onVerify={handleTurnstileVerify}
            onExpire={handleTurnstileExpire}
          />

          <Button type="submit" variant="hero" className="w-full" disabled={loading || !turnstileToken}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create Account"}
          </Button>
        </form>

        <p className="mt-4 text-xs text-center text-muted-foreground">
          Free tier includes 5 search patterns. Upgrade anytime for more.
        </p>

        <div className="mt-6 text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link to="/login" className="text-primary hover:underline">
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
