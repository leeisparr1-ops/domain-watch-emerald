// Service Worker for Web Push Notifications and Offline Support

// Bump this to force clients to refresh cached assets after a deploy
const CACHE_NAME = 'expiredhawk-v8';
const OFFLINE_URL = '/';

// IMPORTANT: In preview/dev, this service worker can interfere with Vite's module loading
// (cached /node_modules/.vite/* chunks) and cause "Invalid hook call" / blank screens.
// We disable caching (and unregister) in these environments.
const HOST = self.location.hostname;
const IS_PREVIEW_OR_DEV =
  HOST.startsWith('id-preview--') ||
  HOST.includes('lovableproject.com') ||
  HOST.includes('localhost') ||
  HOST.includes('127.0.0.1');

// Assets to cache for offline support
const STATIC_ASSETS = [
  '/',
  '/favicon.ico',
  '/favicon.png',
  '/icons/icon-192.png',
  '/icons/icon-512.png'
];

self.addEventListener('install', (event) => {
  console.log('[SW] Service Worker installed');

  // Don't cache anything in preview/dev to avoid stale React/Vite chunks.
  if (IS_PREVIEW_OR_DEV) {
    self.skipWaiting();
    return;
  }

  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Caching static assets');
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('[SW] Service Worker activated');
  event.waitUntil(
    (async () => {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map((name) => caches.delete(name)));

      // Unregister in preview/dev to prevent intercepting Vite module requests.
      if (IS_PREVIEW_OR_DEV) {
        try {
          await self.registration.unregister();
          console.log('[SW] Unregistered in preview/dev environment');
        } catch (e) {
          console.warn('[SW] Failed to unregister in preview/dev:', e);
        }
      }

      await clients.claim();
    })()
  );
});

// Fetch handler for offline support
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  // Skip cross-origin requests
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }

  // In preview/dev, never intercept requests.
  if (IS_PREVIEW_OR_DEV) {
    return;
  }

  // Network-first strategy for API calls
  if (event.request.url.includes('/functions/') || event.request.url.includes('/rest/')) {
    event.respondWith(
      fetch(event.request).catch(() => {
        return caches.match(event.request);
      })
    );
    return;
  }

  // Navigation requests (HTML pages) use network-first so new deploys take effect immediately
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          // Cache the latest HTML for offline fallback
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return networkResponse;
        })
        .catch(() => caches.match(OFFLINE_URL))
    );
    return;
  }

  // Cache-first strategy for static assets (JS, CSS, images)
  event.respondWith(
    caches.match(event.request).then((response) => {
      if (response) {
        return response;
      }
      return fetch(event.request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      });
    })
  );
});

self.addEventListener('push', (event) => {
  console.log('[SW v5] Push notification received at:', new Date().toISOString());
  
  // Use production domain for icon to ensure it displays correctly
  const iconUrl = 'https://expiredhawk.lovable.app/icons/icon-192.png';
  let data = {
    title: 'Domain Alert',
    body: 'You have a new pattern match!',
    icon: iconUrl,
    badge: iconUrl,
    image: iconUrl,
    tag: 'pattern-alert',
    url: '/dashboard'
  };

  try {
    if (event.data) {
      const payload = event.data.json();
      console.log('[SW v5] Push payload:', JSON.stringify(payload));
      data = { ...data, ...payload };
    }
  } catch (e) {
    console.error('[SW v5] Error parsing push data:', e);
  }

  const options = {
    body: data.body,
    icon: data.icon || iconUrl,
    badge: data.badge || iconUrl,
    // Android large image - this shows on the right side of notification
    image: data.image || iconUrl,
    tag: data.tag || 'default',
    requireInteraction: true,
    vibrate: [200, 100, 200],
    // Silent false ensures sound plays
    silent: false,
    data: {
      url: data.url || '/dashboard',
      timestamp: Date.now()
    },
    actions: [
      { action: 'view', title: 'View' },
      { action: 'dismiss', title: 'Dismiss' }
    ]
  };

  console.log('[SW v5] Showing notification with options:', JSON.stringify(options));

  event.waitUntil(
    self.registration.showNotification(data.title, options)
      .then(() => console.log('[SW v5] Notification shown successfully'))
      .catch((err) => console.error('[SW v5] Failed to show notification:', err))
  );
});

self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event);
  
  event.notification.close();

  if (event.action === 'dismiss') {
    return;
  }

  const urlToOpen = event.notification.data?.url || '/dashboard';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((windowClients) => {
        // Check if there's already a window open
        for (const client of windowClients) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            client.navigate(urlToOpen);
            return client.focus();
          }
        }
        // Open new window if none exists
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});

self.addEventListener('notificationclose', (event) => {
  console.log('[SW] Notification closed:', event);
});
