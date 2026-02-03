import { useState, useEffect } from "react";
import { Mail, CheckCircle, XCircle, Loader2, User, CreditCard, Lock, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Navbar } from "@/components/layout/Navbar";
import { useAuth } from "@/hooks/useAuth";
import { Navigate, useSearchParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { NotificationSettingsPanel } from "@/components/settings/NotificationSettingsPanel";
import { useSubscription, PLAN_CONFIG } from "@/hooks/useSubscription";
import { useAdminRole } from "@/hooks/useAdminRole";
import { NamecheapCsvUpload } from "@/components/settings/NamecheapCsvUpload";

export default function Settings() {
  const { user, loading } = useAuth();
  const { plan, subscribed, subscriptionEnd, loading: subLoading, checkSubscription, openCustomerPortal } = useSubscription();
  const { isAdmin } = useAdminRole();
  const [resending, setResending] = useState(false);
  const [managingSubscription, setManagingSubscription] = useState(false);
  const [searchParams] = useSearchParams();
  
  // Password change state
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);
  
  // Email update state
  const [newEmail, setNewEmail] = useState("");
  const [updatingEmail, setUpdatingEmail] = useState(false);

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

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    
    setChangingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Password updated successfully!");
      setNewPassword("");
      setConfirmPassword("");
    }
    setChangingPassword(false);
  };

  const handleEmailUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newEmail || !newEmail.includes("@")) {
      toast.error("Please enter a valid email address");
      return;
    }
    
    if (newEmail === user.email) {
      toast.error("New email is the same as current email");
      return;
    }
    
    setUpdatingEmail(true);
    const { error } = await supabase.auth.updateUser({ email: newEmail });
    
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Confirmation email sent! Please check both your old and new email addresses.");
      setNewEmail("");
    }
    setUpdatingEmail(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-24 pb-12 px-4">
        <div className="container mx-auto max-w-2xl">
          <div className="mb-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h1 className="text-3xl font-bold">Account <span className="gradient-text">Settings</span></h1>
          </div>

          <div className="space-y-6 animate-in fade-in duration-500 delay-100">
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

            {/* Update Email */}
            <div className="p-6 rounded-xl glass border border-border">
              <div className="flex items-center gap-3 mb-4">
                <Pencil className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-semibold">Update Email</h2>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                Change the email address associated with your account. You'll need to verify the new email.
              </p>
              <form onSubmit={handleEmailUpdate} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="current-email">Current Email</Label>
                  <Input
                    id="current-email"
                    type="email"
                    value={user.email || ""}
                    disabled
                    className="bg-muted"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-email">New Email</Label>
                  <Input
                    id="new-email"
                    type="email"
                    placeholder="Enter new email address"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                  />
                </div>
                <Button type="submit" variant="outline" disabled={updatingEmail || !newEmail}>
                  {updatingEmail ? (
                    <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Updating...</>
                  ) : (
                    "Update Email"
                  )}
                </Button>
              </form>
            </div>

            {/* Change Password */}
            <div className="p-6 rounded-xl glass border border-border">
              <div className="flex items-center gap-3 mb-4">
                <Lock className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-semibold">Change Password</h2>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                Update your account password. Choose a strong password with at least 6 characters.
              </p>
              <form onSubmit={handlePasswordChange} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="new-password">New Password</Label>
                  <Input
                    id="new-password"
                    type="password"
                    placeholder="Enter new password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirm Password</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    placeholder="Confirm new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>
                <Button type="submit" variant="outline" disabled={changingPassword || !newPassword || !confirmPassword}>
                  {changingPassword ? (
                    <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Updating...</>
                  ) : (
                    "Change Password"
                  )}
                </Button>
              </form>
            </div>

            {/* Notification Settings */}
            <NotificationSettingsPanel />

            {/* Admin: Namecheap CSV Upload */}
            {isAdmin && <NamecheapCsvUpload />}

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
                  
                  {subscribed ? (
                    <div className="space-y-3">
                      <p className="text-sm text-muted-foreground">
                        Manage your subscription through the Stripe Customer Portal:
                      </p>
                      <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1 mb-4">
                        <li>View subscription details</li>
                        <li>Update payment method</li>
                        <li>Cancel or change your plan</li>
                        <li>View billing history</li>
                      </ul>
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
                    </div>
                  ) : (
                    <Link to="/pricing">
                      <Button variant="hero">Upgrade Plan</Button>
                    </Link>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
