import { useState, useEffect, useRef, useCallback } from 'react';
import { Bell, BellOff, Volume2, VolumeX, Clock, RotateCcw, Smartphone, Send, Mail, AlertTriangle, RefreshCw, Bug } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useNotificationSettings } from '@/hooks/useNotificationSettings';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useEmailNotifications } from '@/hooks/useEmailNotifications';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

const THRESHOLD_OPTIONS = [
  { value: '15', label: '15 minutes' },
  { value: '30', label: '30 minutes' },
  { value: '60', label: '1 hour' },
  { value: '120', label: '2 hours' },
  { value: '240', label: '4 hours' },
  { value: '360', label: '6 hours' },
  { value: '720', label: '12 hours' },
  { value: '1440', label: '24 hours' },
];

const FREQUENCY_OPTIONS = [
  { value: '2', label: 'Every 2 hours' },
  { value: '4', label: 'Every 4 hours' },
  { value: '6', label: 'Every 6 hours' },
];

export function NotificationSettingsPanel() {
  const { user } = useAuth();
  const { settings, updateSettings, resetToDefaults, isLoaded } = useNotificationSettings();
  const { 
    isSupported: pushSupported, 
    isSubscribed: pushSubscribed, 
    isLoading: pushLoading,
    permissionStatus: pushPermission,
    subscribe: subscribePush,
    unsubscribe: unsubscribePush,
    sendTestNotification 
  } = usePushNotifications();
  const {
    settings: emailSettings,
    isLoading: emailLoading,
    isSaving: emailSaving,
    updateSettings: updateEmailSettings,
    sendTestEmail,
  } = useEmailNotifications();
  const [permissionStatus, setPermissionStatus] = useState<NotificationPermission>('default');
  const [emailInput, setEmailInput] = useState('');
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [diagnostics, setDiagnostics] = useState<{
    swStatus: string;
    permissionStatus: string;
    browserSubscription: string;
    dbSubscriptionCount: number;
    endpoint: string;
  } | null>(null);
  const [isLoadingDiagnostics, setIsLoadingDiagnostics] = useState(false);

  const loadDiagnostics = useCallback(async () => {
    if (!user) return;
    setIsLoadingDiagnostics(true);
    try {
      // Check service worker
      let swStatus = 'Not supported';
      let browserSub = 'None';
      let endpoint = '';
      
      if ('serviceWorker' in navigator) {
        const reg = await navigator.serviceWorker.getRegistration('/');
        swStatus = reg ? `Active (scope: ${reg.scope})` : 'Not registered';
        
        if (reg && 'pushManager' in reg) {
          const sub = await (reg as any).pushManager.getSubscription();
          if (sub) {
            browserSub = 'Active';
            endpoint = sub.endpoint.substring(0, 60) + '...';
          } else {
            browserSub = 'Not subscribed';
          }
        }
      }

      // Check permission
      const perm = 'Notification' in window ? Notification.permission : 'unsupported';

      // Check DB
      const { data, error } = await supabase
        .from('push_subscriptions')
        .select('id, endpoint')
        .eq('user_id', user.id);

      setDiagnostics({
        swStatus,
        permissionStatus: perm,
        browserSubscription: browserSub,
        dbSubscriptionCount: error ? -1 : (data?.length ?? 0),
        endpoint,
      });
    } catch (e) {
      console.error('Diagnostics error:', e);
    } finally {
      setIsLoadingDiagnostics(false);
    }
  }, [user]);

  const handleResubscribe = async () => {
    // If we're already subscribed, clear old state first.
    if (pushSubscribed) {
      await unsubscribePush();
      // Wait a moment for cleanup
      await new Promise((r) => setTimeout(r, 500));
    }

    await subscribePush();
    await loadDiagnostics();
  };

  useEffect(() => {
    if (emailSettings.email) {
      setEmailInput(emailSettings.email);
    }
  }, [emailSettings.email]);

  useEffect(() => {
    if ('Notification' in window) {
      setPermissionStatus(Notification.permission);
    }
    // Initialize audio for preview
    audioRef.current = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2teleAsEONq+rHEqCCeH1OTRcjc2T3+6wq11NB5CeLrI2F8RAUphnbvafz4nRWC6xMGUUR8nVH2+z7ZfMB84TnG3xp1xQVQ2TXCkvraLWBwjN1Zus6SgaUgOGkVLaJiuo4BQIhYxPj9wqLO8bTcEI0BPXIS0uYxTIwgiPUlYf7C/q18wBxpCQExukb3Bd0AtCBQ8SEtqir7FgFQsCBI7SEZoir/KhFouCBE5SERkiL/Mg1stCBE5SERjiL/LglotCBE5SEVjh77KglktCBE5SUZjhr7JgVktCBI6SUZjhr7JgVktCBI6SUZjhr7JgVktCBI6SUZjhr7JgVktCBI6SUZjhr7JgVktCBI6SUZjhr7JgVktCBI6SUZjhr7JgVktCBI6SUZjhr7JgVktCBI6SUZjhr7JgVktCBI6SUZjhr7JgVkt');
  }, []);

  const requestBrowserPermission = async () => {
    if (!('Notification' in window)) {
      toast.error('Browser notifications are not supported');
      return;
    }

    const permission = await Notification.requestPermission();
    setPermissionStatus(permission);

    if (permission === 'granted') {
      updateSettings({ browserNotifications: true });
      toast.success('Browser notifications enabled!');
    } else if (permission === 'denied') {
      updateSettings({ browserNotifications: false });
      toast.error('Notifications blocked. Enable in browser settings.');
    }
  };

  const playTestSound = () => {
    if (audioRef.current) {
      audioRef.current.volume = settings.soundVolume / 100;
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(console.error);
    }
  };

  const handleReset = () => {
    resetToDefaults();
    toast.success('Settings reset to defaults');
  };

  const handlePushToggle = async () => {
    if (pushSubscribed) {
      await unsubscribePush();
    } else {
      await subscribePush();
    }
  };

  if (!isLoaded) {
    return (
      <div className="p-6 rounded-xl glass border border-border animate-pulse">
        <div className="h-6 bg-muted rounded w-48 mb-4"></div>
        <div className="space-y-4">
          <div className="h-10 bg-muted rounded"></div>
          <div className="h-10 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 rounded-xl glass border border-border">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Bell className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold">Auction Alerts</h2>
        </div>
        <Button variant="ghost" size="sm" onClick={handleReset}>
          <RotateCcw className="w-4 h-4 mr-2" />
          Reset
        </Button>
      </div>

      <div className="space-y-6">
        {/* Master Enable/Disable */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label className="text-base">Enable Alerts</Label>
            <p className="text-sm text-muted-foreground">
              Get notified when favorite auctions are ending soon
            </p>
          </div>
          <Switch
            checked={settings.enabled}
            onCheckedChange={(checked) => updateSettings({ enabled: checked })}
          />
        </div>

        <div className={`space-y-6 ${!settings.enabled ? 'opacity-50 pointer-events-none' : ''}`}>
          {/* Alert Threshold */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <Label>Alert Threshold</Label>
            </div>
            <p className="text-sm text-muted-foreground mb-2">
              Get alerted when auctions are ending within this time
            </p>
            <Select
              value={String(settings.alertThresholdMinutes)}
              onValueChange={(value) => updateSettings({ alertThresholdMinutes: parseInt(value) })}
            >
              <SelectTrigger className="w-full bg-background">
                <SelectValue placeholder="Select threshold" />
              </SelectTrigger>
              <SelectContent className="bg-background border border-border">
                {THRESHOLD_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Notification Frequency */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <Label>Notification Frequency</Label>
            </div>
            <p className="text-sm text-muted-foreground mb-2">
              Maximum frequency for email and push notifications
            </p>
            <Select
              value={String(emailSettings.frequencyHours)}
              onValueChange={(value) => updateEmailSettings({ frequencyHours: parseInt(value) })}
              disabled={emailLoading || emailSaving}
            >
              <SelectTrigger className="w-full bg-background">
                <SelectValue placeholder="Select frequency" />
              </SelectTrigger>
              <SelectContent className="bg-background border border-border">
                {FREQUENCY_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Push Notifications (Mobile) */}
          <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-primary" />
                  <Label className="text-base">Mobile Push Notifications</Label>
                </div>
                <p className="text-sm text-muted-foreground">
                  {!pushSupported
                    ? 'Not supported on this device/browser.'
                    : pushSubscribed
                      ? 'Receive alerts on your phone even when the browser is closed'
                      : 'Enable to receive alerts on your phone'}
                </p>
              </div>
              <Switch
                checked={pushSubscribed}
                onCheckedChange={handlePushToggle}
                disabled={pushLoading || !pushSupported}
              />
            </div>

            {/* Always show Diagnostics / Recovery tools (even if not subscribed yet) */}
            <div className="mt-4 space-y-3">
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={sendTestNotification}
                  disabled={pushLoading || !pushSubscribed}
                >
                  <Send className="w-4 h-4 mr-2" />
                  Test Push
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleResubscribe}
                  disabled={pushLoading || !pushSupported}
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  {pushSubscribed ? 'Re-subscribe' : 'Subscribe'}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowDiagnostics(!showDiagnostics);
                    if (!showDiagnostics) loadDiagnostics();
                  }}
                  disabled={!pushSupported}
                >
                  <Bug className="w-4 h-4 mr-2" />
                  {showDiagnostics ? 'Hide' : 'Diagnostics'}
                </Button>
              </div>

              {!pushSubscribed && pushSupported && (
                <p className="text-xs text-muted-foreground">
                  Turn on the toggle above to enable “Test Push”. If the toggle flips back off, hit “Subscribe”.
                </p>
              )}

                  {showDiagnostics && (
                    <div className="p-3 rounded-lg bg-muted/50 border border-border text-xs space-y-1.5">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-medium text-sm">Push Diagnostics</span>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-6 px-2"
                          onClick={loadDiagnostics}
                          disabled={isLoadingDiagnostics}
                        >
                          <RefreshCw className={`w-3 h-3 ${isLoadingDiagnostics ? 'animate-spin' : ''}`} />
                        </Button>
                      </div>
                      {diagnostics ? (
                        <>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Service Worker:</span>
                            <span className={diagnostics.swStatus.includes('Active') ? 'text-primary' : 'text-muted-foreground'}>
                              {diagnostics.swStatus.includes('Active') ? 'Active' : diagnostics.swStatus}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Permission:</span>
                            <span className={diagnostics.permissionStatus === 'granted' ? 'text-primary' : 'text-destructive'}>
                              {diagnostics.permissionStatus}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Browser Subscription:</span>
                            <span className={diagnostics.browserSubscription === 'Active' ? 'text-primary' : 'text-muted-foreground'}>
                              {diagnostics.browserSubscription}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">DB Subscriptions:</span>
                            <span className={diagnostics.dbSubscriptionCount > 0 ? 'text-primary' : 'text-muted-foreground'}>
                              {diagnostics.dbSubscriptionCount}
                            </span>
                          </div>
                          {diagnostics.endpoint && (
                            <div className="pt-1 border-t border-border">
                              <span className="text-muted-foreground">Endpoint:</span>
                              <div className="font-mono text-[10px] break-all text-muted-foreground/70">
                                {diagnostics.endpoint}
                              </div>
                            </div>
                          )}
                          <div className="pt-2 border-t border-border mt-2">
                            <p className="text-muted-foreground leading-relaxed">
                              <AlertTriangle className="w-3 h-3 inline mr-1 text-muted-foreground" />
                              If all checks are green but notifications don't arrive, check your <strong>Android Settings → Apps → ExpiredHawk → Notifications</strong> and ensure they're enabled.
                            </p>
                          </div>
                        </>
                      ) : (
                        <span className="text-muted-foreground">Loading...</span>
                      )}
                    </div>
                  )}
            </div>
          </div>

          {/* Email Notifications */}
          <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-primary" />
                  <Label className="text-base">Email Notifications</Label>
                </div>
                <p className="text-sm text-muted-foreground">
                  {emailSettings.enabled 
                    ? 'Receive pattern match alerts via email'
                    : 'Enable to get pattern alerts in your inbox'}
                </p>
              </div>
              <Switch
                checked={emailSettings.enabled}
                onCheckedChange={(checked) => updateEmailSettings({ enabled: checked })}
                disabled={emailLoading || emailSaving}
              />
            </div>
            
            {emailSettings.enabled && (
              <div className="mt-4 space-y-3">
                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground">Email Address</Label>
                  <div className="flex gap-2">
                    <Input
                      type="email"
                      placeholder="your@email.com"
                      value={emailInput}
                      onChange={(e) => setEmailInput(e.target.value)}
                      className="flex-1 bg-background"
                    />
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => updateEmailSettings({ email: emailInput })}
                      disabled={emailSaving || emailInput === emailSettings.email}
                    >
                      Save
                    </Button>
                  </div>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={sendTestEmail}
                  disabled={emailSaving || !emailSettings.email}
                >
                  <Send className="w-4 h-4 mr-2" />
                  Send Test Email
                </Button>
              </div>
            )}
          </div>

          {/* Browser Notifications */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-base">Browser Notifications</Label>
              <p className="text-sm text-muted-foreground">
                {permissionStatus === 'granted'
                  ? 'Show system notifications'
                  : permissionStatus === 'denied'
                  ? 'Blocked - enable in browser settings'
                  : 'Requires permission'}
              </p>
            </div>
            {permissionStatus === 'granted' ? (
              <Switch
                checked={settings.browserNotifications}
                onCheckedChange={(checked) => updateSettings({ browserNotifications: checked })}
              />
            ) : (
              <Button variant="outline" size="sm" onClick={requestBrowserPermission}>
                {permissionStatus === 'denied' ? (
                  <><BellOff className="w-4 h-4 mr-2" />Blocked</>
                ) : (
                  <>Enable</>
                )}
              </Button>
            )}
          </div>

          {/* In-App Toasts */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-base">In-App Notifications</Label>
              <p className="text-sm text-muted-foreground">
                Show toast notifications in the app
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => {
                  toast.success('🎯 Test: domain.com matches "pattern" - $99', {
                    duration: 10000,
                    action: {
                      label: 'View',
                      onClick: () => {},
                    },
                  });
                }}
                disabled={!settings.inAppToasts}
              >
                Test
              </Button>
              <Switch
                checked={settings.inAppToasts}
                onCheckedChange={(checked) => updateSettings({ inAppToasts: checked })}
              />
            </div>
          </div>

          {/* Sound Settings */}
          <div className="space-y-4 pt-4 border-t border-border">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {settings.soundEnabled ? (
                  <Volume2 className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <VolumeX className="w-4 h-4 text-muted-foreground" />
                )}
                <Label className="text-base">Sound Alerts</Label>
              </div>
              <Switch
                checked={settings.soundEnabled}
                onCheckedChange={(checked) => updateSettings({ soundEnabled: checked })}
              />
            </div>

            {settings.soundEnabled && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm text-muted-foreground">Volume</Label>
                  <span className="text-sm font-medium">{settings.soundVolume}%</span>
                </div>
                <div className="flex items-center gap-4">
                  <Slider
                    value={[settings.soundVolume]}
                    onValueChange={([value]) => updateSettings({ soundVolume: value })}
                    max={100}
                    step={5}
                    className="flex-1"
                  />
                  <Button variant="outline" size="sm" onClick={playTestSound}>
                    Test
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
