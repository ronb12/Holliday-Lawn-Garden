const CACHE_VERSION = 'v16';
const CACHE_NAME = `holliday-cache-${CACHE_VERSION}`;
const MAX_CACHE_SIZE = 25 * 1024 * 1024; // Reduced to 25MB limit
const MAX_CACHE_ENTRIES = 10; // Reduced to 10 entries

// Storage cleanup - only removes old SW caches, never touches Firebase/IndexedDB
async function cleanupOldCaches() {
  try {
    const cacheNames = await caches.keys();
    await Promise.all(cacheNames.map(cacheName => {
      if (cacheName !== CACHE_NAME) {
        return caches.delete(cacheName);
      }
    }));
  } catch (error) {
    // Silent fail
  }
}

// Install event - cache essential assets, wait for existing SW to be replaced naturally
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      const essentialAssets = [
        './',
        './index.html',
        './assets/css/main.min.css',
        './assets/images/hollidays-logo.optimized-1280.png',
        './manifest.json',
        './offline.html'
      ];
      return Promise.all(
        essentialAssets.map(asset =>
          cache.add(asset).catch(() => Promise.resolve())
        )
      );
    }).catch(() => Promise.resolve())
  );
});

// Activate event - clean up old caches only
self.addEventListener('activate', event => {
  event.waitUntil(cleanupOldCaches());
});

// Fetch event - Network first, minimal caching
self.addEventListener('fetch', event => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  // Skip chrome-extension requests
  if (event.request.url.startsWith('chrome-extension://')) {
    return;
  }

  // Skip all Firebase and analytics requests to prevent storage issues
  if (event.request.url.includes('firebase') || 
      event.request.url.includes('google-analytics') ||
      event.request.url.includes('gstatic.com/firebasejs') ||
      event.request.url.includes('firebaseinstallations.googleapis.com') ||
      event.request.url.includes('analytics.google.com')) {
    return;
  }

  // Skip caching for dynamic content
  if (event.request.url.includes('?') || 
      event.request.url.includes('api/') ||
      event.request.url.includes('dashboard')) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Only cache successful HTML responses
        if (response.status === 200 && 
            response.headers.get('content-type')?.includes('text/html') &&
            !event.request.url.includes('dashboard')) {
          
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseClone).catch(err => {
              console.warn('Failed to cache response:', err);
            });
          });
        }
        
        return response;
      })
      .catch(() => {
        // Return cached version if network fails
        return caches.match(event.request).then(response => {
          if (response) {
            return response;
          }
          
          // Return offline page for HTML requests
          if (event.request.headers.get('accept')?.includes('text/html')) {
            return caches.match('./offline.html');
          }
          
          return new Response('Network error', {
            status: 503,
            statusText: 'Service Unavailable',
            headers: new Headers({
              'Content-Type': 'text/plain'
            })
          });
        });
      })
  );
});

