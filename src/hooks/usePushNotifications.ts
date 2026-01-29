import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export interface PushSubscriptionState {
  isSupported: boolean;
  isSubscribed: boolean;
  isLoading: boolean;
  permissionStatus: NotificationPermission | 'unsupported';
}

export function usePushNotifications() {
  const { user } = useAuth();
  const [state, setState] = useState<PushSubscriptionState>({
    isSupported: false,
    isSubscribed: false,
    isLoading: true,
    permissionStatus: 'unsupported',
  });

  // Check if push notifications are supported
  useEffect(() => {
    const checkSupport = async () => {
      const supported = 'serviceWorker' in navigator && 'PushManager' in window;
      const permission = supported ? Notification.permission : 'unsupported';
      
      setState(prev => ({
        ...prev,
        isSupported: supported,
        permissionStatus: permission as NotificationPermission | 'unsupported',
      }));

      if (supported && user) {
        await checkSubscription();
      } else {
        setState(prev => ({ ...prev, isLoading: false }));
      }
    };

    checkSupport();
  }, [user]);

  // Check if user has an active subscription
  const checkSubscription = useCallback(async () => {
    if (!user) {
      setState(prev => ({ ...prev, isLoading: false, isSubscribed: false }));
      return;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      
      if (subscription) {
        // Verify subscription exists in database
        const { data } = await supabase
          .from('push_subscriptions')
          .select('id')
          .eq('user_id', user.id)
          .eq('endpoint', subscription.endpoint)
          .single();

        setState(prev => ({
          ...prev,
          isSubscribed: !!data,
          isLoading: false,
        }));
      } else {
        setState(prev => ({ ...prev, isSubscribed: false, isLoading: false }));
      }
    } catch (error) {
      console.error('Error checking subscription:', error);
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, [user]);

  // Register service worker
  const registerServiceWorker = async (): Promise<ServiceWorkerRegistration> => {
    if (!('serviceWorker' in navigator)) {
      throw new Error('Service Worker not supported');
    }

    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
    });

    // Wait for the service worker to be ready
    await navigator.serviceWorker.ready;
    
    return registration;
  };

  // Subscribe to push notifications
  const subscribe = useCallback(async (): Promise<boolean> => {
    if (!user) {
      toast.error('Please log in to enable push notifications');
      return false;
    }

    setState(prev => ({ ...prev, isLoading: true }));

    try {
      // Check if we're in a TWA or standalone mode
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
                          (window.navigator as any).standalone === true ||
                          document.referrer.includes('android-app://');
      
      console.log('[Push] Environment:', { 
        isStandalone, 
        userAgent: navigator.userAgent,
        hasNotification: 'Notification' in window,
        hasPushManager: 'PushManager' in window,
        hasServiceWorker: 'serviceWorker' in navigator
      });

      // Request notification permission
      let permission: NotificationPermission;
      try {
        permission = await Notification.requestPermission();
        console.log('[Push] Permission result:', permission);
      } catch (permError) {
        console.error('[Push] Permission request failed:', permError);
        // On some TWA implementations, permission might already be granted
        permission = Notification.permission;
        console.log('[Push] Using existing permission:', permission);
      }
      
      setState(prev => ({ ...prev, permissionStatus: permission }));

      if (permission !== 'granted') {
        const msg = permission === 'denied' 
          ? 'Notifications blocked. Enable in browser/system settings.' 
          : 'Notification permission not granted';
        toast.error(msg);
        setState(prev => ({ ...prev, isLoading: false }));
        return false;
      }

      // Register service worker
      console.log('[Push] Registering service worker...');
      const registration = await registerServiceWorker();
      console.log('[Push] Service worker registered:', registration.scope);

      // Get VAPID public key from edge function
      console.log('[Push] Fetching VAPID key...');
      const { data: configData, error: vapidError } = await supabase.functions.invoke('get-vapid-key');
      
      if (vapidError) {
        console.error('[Push] VAPID fetch error:', vapidError);
        throw new Error(`Could not get VAPID key: ${vapidError.message}`);
      }
      
      if (!configData?.publicKey) {
        console.error('[Push] No publicKey in response:', configData);
        throw new Error('VAPID key not configured on server');
      }
      
      console.log('[Push] VAPID key received, subscribing to push manager...');

      // PushManager.subscribe requires the VAPID public key as a Uint8Array (not a string)
      const applicationServerKey = urlBase64ToUint8Array(String(configData.publicKey)) as unknown as BufferSource;

      // Subscribe to push with VAPID key
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey,
      });
      console.log('[Push] Subscription created:', subscription.endpoint.substring(0, 50) + '...');

      // Extract subscription details
      const subscriptionJson = subscription.toJSON();
      const keys = subscriptionJson.keys as { p256dh: string; auth: string };

      if (!keys?.p256dh || !keys?.auth) {
        throw new Error('Invalid subscription keys');
      }

      // Save to database
      console.log('[Push] Saving subscription to database...');
      const { error } = await supabase.from('push_subscriptions').upsert(
        {
          user_id: user.id,
          endpoint: subscription.endpoint,
          p256dh: keys.p256dh,
          auth: keys.auth,
        },
        { onConflict: 'user_id,endpoint' }
      );

      if (error) {
        console.error('[Push] Database save error:', error);
        throw error;
      }

      setState(prev => ({ ...prev, isSubscribed: true, isLoading: false }));
      toast.success('Push notifications enabled!');
      console.log('[Push] Successfully subscribed!');
      return true;
    } catch (error) {
      console.error('[Push] Error subscribing to push:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast.error(`Failed to enable push notifications: ${errorMessage.substring(0, 50)}`);
      setState(prev => ({ ...prev, isLoading: false }));
      return false;
    }
  }, [user]);

  // Unsubscribe from push notifications
  const unsubscribe = useCallback(async (): Promise<boolean> => {
    if (!user) return false;

    setState(prev => ({ ...prev, isLoading: true }));

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        // Unsubscribe from push manager
        await subscription.unsubscribe();

        // Remove from database
        await supabase
          .from('push_subscriptions')
          .delete()
          .eq('user_id', user.id)
          .eq('endpoint', subscription.endpoint);
      }

      setState(prev => ({ ...prev, isSubscribed: false, isLoading: false }));
      toast.success('Push notifications disabled');
      return true;
    } catch (error) {
      console.error('Error unsubscribing:', error);
      toast.error('Failed to disable push notifications');
      setState(prev => ({ ...prev, isLoading: false }));
      return false;
    }
  }, [user]);

  // Send a test notification
  const sendTestNotification = useCallback(async (): Promise<boolean> => {
    if (!user || !state.isSubscribed) {
      toast.error('Please enable push notifications first');
      return false;
    }

    try {
      const { data, error } = await supabase.functions.invoke('send-push-notification', {
        body: {
          user_id: user.id,
          payload: {
            title: '🔔 Test Notification',
            body: 'Push notifications are working! You will receive alerts for pattern matches.',
            icon: '/favicon.ico',
            tag: 'test',
            url: '/dashboard',
          },
        },
      });

      if (error) throw error;

      if (data?.success) {
        toast.success('Test notification sent!');
        return true;
      } else {
        toast.error(data?.message || 'Failed to send notification');
        return false;
      }
    } catch (error) {
      console.error('Error sending test notification:', error);
      toast.error('Failed to send test notification');
      return false;
    }
  }, [user, state.isSubscribed]);

  return {
    ...state,
    subscribe,
    unsubscribe,
    sendTestNotification,
    checkSubscription,
  };
}

// Helper function to convert VAPID key
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  // Use an explicit ArrayBuffer to avoid TS inferring ArrayBufferLike/SharedArrayBuffer
  const buffer = new ArrayBuffer(rawData.length);
  const outputArray = new Uint8Array(buffer);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
