import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export interface EmailSettings {
  enabled: boolean;
  email: string;
  frequencyHours: number;
}

export function useEmailNotifications() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<EmailSettings>({ enabled: false, email: '', frequencyHours: 2 });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Load settings from database
  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    const loadSettings = async () => {
      try {
        const { data, error } = await supabase
          .from('user_settings')
          .select('email_notifications_enabled, notification_email, notification_frequency_hours')
          .eq('user_id', user.id)
          .single();

        if (error && error.code !== 'PGRST116') {
          console.error('Error loading email settings:', error);
          return;
        }

        if (data) {
          setSettings({
            enabled: data.email_notifications_enabled || false,
            email: data.notification_email || user.email || '',
            frequencyHours: data.notification_frequency_hours || 2,
          });
        } else {
          // Default to user's auth email
          setSettings({
            enabled: false,
            email: user.email || '',
            frequencyHours: 2,
          });
        }
      } catch (error) {
        console.error('Error loading email settings:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();
  }, [user]);

  const updateSettings = useCallback(async (updates: Partial<EmailSettings>) => {
    if (!user) return;
    
    setIsSaving(true);
    const newSettings = { ...settings, ...updates };
    
    try {
      const { error } = await supabase
        .from('user_settings')
        .upsert({
          user_id: user.id,
          email_notifications_enabled: newSettings.enabled,
          notification_email: newSettings.email,
          notification_frequency_hours: newSettings.frequencyHours,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id',
        });

      if (error) throw error;

      setSettings(newSettings);
      toast.success('Email settings updated');
    } catch (error: any) {
      console.error('Error saving email settings:', error);
      toast.error('Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  }, [user, settings]);

  const sendTestEmail = useCallback(async () => {
    if (!user || !settings.email) {
      toast.error('Please enter an email address first');
      return;
    }

    setIsSaving(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-email-notification', {
        body: {
          type: 'test',
          email: settings.email,
          userId: user.id,
        },
      });

      if (error) throw error;
      
      toast.success('Test email sent! Check your inbox.');
    } catch (error: any) {
      console.error('Error sending test email:', error);
      toast.error('Failed to send test email');
    } finally {
      setIsSaving(false);
    }
  }, [user, settings.email]);

  return {
    settings,
    isLoading,
    isSaving,
    updateSettings,
    sendTestEmail,
  };
}
