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

// Fetch event - network first, minimal caching
self.addEventListener('fetch', (event) => {
  const { request } = event

  // Only handle offline page requests
  if (request.destination === 'document') {
    // For pages, always try network first, no caching
    event.respondWith(
      fetch(request).catch(() => {
        // Network failed, serve offline page
        return caches.match('/offline.html')
      })
    )
  }
  // Don't handle other request types - let browser handle them normally
})

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
