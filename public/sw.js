const CACHE_NAME = 'deepstack-v1'

// Detect environment based on host
const _isDev =
  self.location.hostname === 'localhost' ||
  self.location.hostname === '127.0.0.1' ||
  self.location.hostname === '0.0.0.0' ||
  (self.location.hostname.includes('.vercel.app') &&
    self.location.hostname.includes('-dev')) ||
  self.location.hostname.includes('-dev.vercel.app')

// Cache appropriate assets based on environment
const urlsToCache = ['/offline.html', '/icon-192.png', '/icon-512.png']

// Install event - cache static resources only
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        // Only cache essential static assets
        return cache.addAll(urlsToCache)
      })
      .catch((_error) => {})
  )
  // Skip waiting to activate immediately
  self.skipWaiting()
})

// Fetch event - COMPLETELY DISABLED to prevent auth interference
// self.addEventListener('fetch', (event) => {
//   // Service worker fetch handling disabled
//   // This prevents interference with Supabase auth and API calls
// })

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              return caches.delete(cacheName)
            }
          })
        )
      })
      .then(() => {
        // Take control of all clients immediately
        return self.clients.claim()
      })
  )
})
