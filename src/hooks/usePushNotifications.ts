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

  const getBrowserSubscription = useCallback(async () => {
    const registration = await navigator.serviceWorker.ready;
    return registration.pushManager.getSubscription();
  }, []);

  const getOrRegisterServiceWorker = useCallback(async (): Promise<ServiceWorkerRegistration> => {
    if (!('serviceWorker' in navigator)) {
      throw new Error('Service Worker not supported');
    }

    const existing = await navigator.serviceWorker.getRegistration('/');
    if (existing) {
      await navigator.serviceWorker.ready;
      return existing;
    }

    const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    await navigator.serviceWorker.ready;
    return registration;
  }, []);

  const fetchVapidPublicKey = useCallback(async () => {
    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData.session?.access_token;

    const { data: configData, error: vapidError } = await supabase.functions.invoke('get-vapid-key', {
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
    });

    if (vapidError) {
      throw new Error(`Could not get VAPID key: ${vapidError.message}`);
    }
    if (!configData?.publicKey) {
      throw new Error('VAPID key not configured on server');
    }

    return String(configData.publicKey);
  }, []);

  const createBrowserSubscription = useCallback(
    async (registration: ServiceWorkerRegistration) => {
      const vapidKey = await fetchVapidPublicKey();
      const applicationServerKey = urlBase64ToUint8Array(vapidKey) as unknown as BufferSource;

      return registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey,
      });
    },
    [fetchVapidPublicKey]
  );

  const saveSubscriptionToDb = useCallback(
    async (subscription: PushSubscription) => {
      if (!user) return false;

      const subscriptionJson = subscription.toJSON();
      const keys = subscriptionJson.keys as { p256dh?: string; auth?: string } | undefined;

      if (!keys?.p256dh || !keys?.auth) {
        throw new Error('Invalid subscription keys');
      }

      const { error } = await supabase.from('push_subscriptions').upsert(
        {
          user_id: user.id,
          endpoint: subscription.endpoint,
          p256dh: keys.p256dh,
          auth: keys.auth,
        },
        { onConflict: 'user_id,endpoint' }
      );

      if (error) throw error;
      return true;
    },
    [user]
  );

  // Check if user has an active subscription
  const checkSubscription = useCallback(async () => {
    if (!user) {
      setState(prev => ({ ...prev, isLoading: false, isSubscribed: false }));
      return;
    }

    const supported = 'serviceWorker' in navigator && 'PushManager' in window;
    const permission = supported && 'Notification' in window ? Notification.permission : 'unsupported';

    try {
      const browserSubscription = supported && permission === 'granted'
        ? await getBrowserSubscription()
        : null;

      // DB rows act as a "user intent" signal (they previously enabled push)
      const { data: dbRows, error: dbError } = await supabase
        .from('push_subscriptions')
        .select('id, endpoint')
        .eq('user_id', user.id)
        .limit(5);

      if (dbError) {
        // If the read fails transiently, don’t force-disable in UI.
        setState(prev => ({
          ...prev,
          isSubscribed: !!browserSubscription,
          isLoading: false,
        }));
        return;
      }

      const hasDbIntent = (dbRows?.length ?? 0) > 0;

      if (browserSubscription) {
        const hasMatchingDbRow = !!dbRows?.some(r => r.endpoint === browserSubscription.endpoint);

        // If we have a browser subscription but DB record is missing, self-heal by re-saving it.
        if (!hasMatchingDbRow) {
          try {
            await saveSubscriptionToDb(browserSubscription);
          } catch (e) {
            console.warn('[Push] Failed to self-heal subscription in DB:', e);
          }
        }

        setState(prev => ({
          ...prev,
          isSubscribed: true,
          isLoading: false,
        }));
        return;
      }

      // No browser subscription, but user had previously enabled push and permission is granted.
      // This can happen in TWA/PWA if the subscription is lost; auto-restore silently.
      if (hasDbIntent && supported && permission === 'granted') {
        try {
          const registration = await getOrRegisterServiceWorker();
          const restored = await createBrowserSubscription(registration);
          await saveSubscriptionToDb(restored);

          setState(prev => ({
            ...prev,
            isSubscribed: true,
            isLoading: false,
          }));
          return;
        } catch (e) {
          console.warn('[Push] Failed to auto-restore subscription:', e);
        }
      }

      setState(prev => ({ ...prev, isSubscribed: false, isLoading: false }));
    } catch (error) {
      console.error('Error checking subscription:', error);
      setState(prev => ({ ...prev, isLoading: false, isSubscribed: false }));
    }
  }, [createBrowserSubscription, getBrowserSubscription, getOrRegisterServiceWorker, saveSubscriptionToDb, user]);

  // Check if push notifications are supported
  useEffect(() => {
    const checkSupport = async () => {
      const supported = 'serviceWorker' in navigator && 'PushManager' in window;
      const permission = supported && 'Notification' in window ? Notification.permission : 'unsupported';
      
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
  }, [checkSubscription, user]);

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
      const registration = await getOrRegisterServiceWorker();
      console.log('[Push] Service worker registered:', registration.scope);

      console.log('[Push] Creating push subscription...');
      const subscription = await createBrowserSubscription(registration);
      console.log('[Push] Subscription created:', subscription.endpoint.substring(0, 50) + '...');

      // Extract subscription details
      const subscriptionJson = subscription.toJSON();
      const keys = subscriptionJson.keys as { p256dh: string; auth: string };

      if (!keys?.p256dh || !keys?.auth) {
        throw new Error('Invalid subscription keys');
      }

      // Save to database
      console.log('[Push] Saving subscription to database...');
      await saveSubscriptionToDb(subscription);

      setState(prev => ({ ...prev, isSubscribed: true, isLoading: false }));
      toast.success('Push notifications enabled!');
      console.log('[Push] Successfully subscribed!');
      return true;
    } catch (error) {
      console.error('[Push] Error subscribing to push:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast.error(`Failed to enable push notifications: ${errorMessage.substring(0, 140)}`);
      setState(prev => ({ ...prev, isLoading: false }));
      return false;
    }
  }, [createBrowserSubscription, getOrRegisterServiceWorker, saveSubscriptionToDb, user]);

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
      const invoke = () =>
        supabase.functions.invoke('send-push-notification', {
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

      let { data, error } = await invoke();

      // If backend says no subscriptions, we likely have a browser subscription but DB record is missing.
      // Self-heal and retry once.
      if (!error && data && !data.success && data.message === 'No subscriptions found') {
        try {
          const subscription = await getBrowserSubscription();
          if (subscription) {
            await saveSubscriptionToDb(subscription);
            ({ data, error } = await invoke());
          }
        } catch (e) {
          console.warn('[Push] Failed to self-heal before retrying test push:', e);
        }
      }

      if (error) throw error;

      if (data?.success) {
        toast.success('Test notification sent!');
        return true;
      }

      toast.error(data?.message || 'Failed to send notification');
      return false;
    } catch (error) {
      console.error('Error sending test notification:', error);
      toast.error('Failed to send test notification');
      return false;
    }
  }, [user, state.isSubscribed, getBrowserSubscription, saveSubscriptionToDb]);

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
