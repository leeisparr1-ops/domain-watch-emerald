import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Mail, CheckCircle, XCircle, Loader2, User, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/layout/Navbar";
import { useAuth } from "@/hooks/useAuth";
import { Navigate, useSearchParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { NotificationSettingsPanel } from "@/components/settings/NotificationSettingsPanel";
import { useSubscription, PLAN_CONFIG } from "@/hooks/useSubscription";
export default function Settings() {
  const { user, loading } = useAuth();
  const { plan, subscribed, subscriptionEnd, loading: subLoading, checkSubscription, openCustomerPortal } = useSubscription();
  const [resending, setResending] = useState(false);
  const [managingSubscription, setManagingSubscription] = useState(false);
  const [searchParams] = useSearchParams();

  useEffect(() => {
    if (searchParams.get("success") === "true") {
      toast.success("Subscription activated! Your plan has been upgraded.");
      checkSubscription();
    }
  }, [searchParams, checkSubscription]);
  
  if (loading) return <div className="min-h-screen bg-background flex items-center justify-center"><div className="animate-pulse text-primary">Loading...</div></div>;
  if (!user) return <Navigate to="/login" />;

  const emailVerified = user.email_confirmed_at !== null;

  const resendVerification = async () => {
    setResending(true);
    const { error } = await supabase.auth.resend({ type: "signup", email: user.email! });
    if (error) toast.error(error.message);
    else toast.success("Verification email sent!");
    setResending(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-24 pb-12 px-4">
        <div className="container mx-auto max-w-2xl">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
            <h1 className="text-3xl font-bold">Account <span className="gradient-text">Settings</span></h1>
          </motion.div>

          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} className="space-y-6">
            <div className="p-6 rounded-xl glass border border-border">
              <div className="flex items-center gap-3 mb-4">
                <User className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-semibold">Profile</h2>
              </div>
              <div className="text-muted-foreground"><span className="text-foreground font-medium">{user.user_metadata?.full_name || "User"}</span></div>
            </div>

            <div className="p-6 rounded-xl glass border border-border">
              <div className="flex items-center gap-3 mb-4">
                <Mail className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-semibold">Email Verification</h2>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-mono text-foreground">{user.email}</div>
                  <div className="flex items-center gap-2 mt-1">
                    {emailVerified ? (
                      <><CheckCircle className="w-4 h-4 text-primary" /><span className="text-sm text-primary">Verified</span></>
                    ) : (
                      <><XCircle className="w-4 h-4 text-destructive" /><span className="text-sm text-destructive">Not verified</span></>
                    )}
                  </div>
                </div>
                {!emailVerified && (
                  <Button variant="outline" size="sm" onClick={resendVerification} disabled={resending}>
                    {resending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Resend Email"}
                  </Button>
                )}
              </div>
            </div>

            {/* Notification Settings */}
            <NotificationSettingsPanel />

            <div className="p-6 rounded-xl glass border border-border">
              <div className="flex items-center gap-3 mb-4">
                <CreditCard className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-semibold">Subscription</h2>
              </div>
              {subLoading ? (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Loading subscription...</span>
                </div>
              ) : (
                <>
                  <div className="mb-4">
                    <p className="text-muted-foreground">
                      You're on the{" "}
                      <span className="text-primary font-medium capitalize">{plan}</span> plan
                      {" "}({PLAN_CONFIG[plan].maxPatterns} patterns)
                    </p>
                    {subscribed && subscriptionEnd && (
                      <p className="text-sm text-muted-foreground mt-1">
                        Renews on {new Date(subscriptionEnd).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-3">
                    {subscribed ? (
                      <Button
                        variant="outline"
                        onClick={async () => {
                          setManagingSubscription(true);
                          try {
                            await openCustomerPortal();
                          } catch (error) {
                            toast.error("Failed to open subscription portal");
                          } finally {
                            setManagingSubscription(false);
                          }
                        }}
                        disabled={managingSubscription}
                      >
                        {managingSubscription ? (
                          <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Loading...</>
                        ) : (
                          "Manage Subscription"
                        )}
                      </Button>
                    ) : (
                      <Link to="/pricing">
                        <Button variant="hero">Upgrade Plan</Button>
                      </Link>
                    )}
                  </div>
                </>
              )}
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
