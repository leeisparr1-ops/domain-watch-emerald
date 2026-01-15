import { useState, useEffect, useCallback } from 'react';

export interface NotificationSettings {
  enabled: boolean;
  alertThresholdMinutes: number;
  soundEnabled: boolean;
  soundVolume: number;
  browserNotifications: boolean;
  inAppToasts: boolean;
}

const DEFAULT_SETTINGS: NotificationSettings = {
  enabled: true,
  alertThresholdMinutes: 60, // 1 hour default
  soundEnabled: true,
  soundVolume: 50,
  browserNotifications: true,
  inAppToasts: true,
};

const STORAGE_KEY = 'auction-notification-settings';

export function useNotificationSettings() {
  const [settings, setSettings] = useState<NotificationSettings>(DEFAULT_SETTINGS);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load settings from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setSettings({ ...DEFAULT_SETTINGS, ...parsed });
      }
    } catch (error) {
      console.error('Error loading notification settings:', error);
    }
    setIsLoaded(true);
  }, []);

  // Save settings to localStorage whenever they change
  useEffect(() => {
    if (isLoaded) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
      } catch (error) {
        console.error('Error saving notification settings:', error);
      }
    }
  }, [settings, isLoaded]);

  const updateSettings = useCallback((updates: Partial<NotificationSettings>) => {
    setSettings(prev => ({ ...prev, ...updates }));
  }, []);

  const resetToDefaults = useCallback(() => {
    setSettings(DEFAULT_SETTINGS);
  }, []);

  return {
    settings,
    updateSettings,
    resetToDefaults,
    isLoaded,
  };
}
