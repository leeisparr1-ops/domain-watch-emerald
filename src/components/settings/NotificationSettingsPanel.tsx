import { useState, useEffect, useRef } from 'react';
import { Bell, BellOff, Volume2, VolumeX, Clock, RotateCcw, Smartphone, Send, Mail } from 'lucide-react';
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

export function NotificationSettingsPanel() {
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

          {/* Push Notifications (Mobile) */}
          {pushSupported && (
            <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <Smartphone className="w-4 h-4 text-primary" />
                    <Label className="text-base">Mobile Push Notifications</Label>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {pushSubscribed 
                      ? 'Receive alerts on your phone even when the browser is closed'
                      : 'Enable to receive alerts on your phone'}
                  </p>
                </div>
                <Switch
                  checked={pushSubscribed}
                  onCheckedChange={handlePushToggle}
                  disabled={pushLoading}
                />
              </div>
              
              {pushSubscribed && (
                <div className="mt-4 flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={sendTestNotification}
                    disabled={pushLoading}
                  >
                    <Send className="w-4 h-4 mr-2" />
                    Send Test Notification
                  </Button>
                </div>
              )}
            </div>
          )}

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
            <Switch
              checked={settings.inAppToasts}
              onCheckedChange={(checked) => updateSettings({ inAppToasts: checked })}
            />
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
