/* AlumniConnect service worker.
 * Caches the application shell and static assets so the installed app opens
 * offline. API responses are never cached: stale account data would be worse
 * than an honest network error.
 */
const VERSION = 'ac-shell-v3'
const SHELL = ['/', '/manifest.webmanifest', '/icon-192.png', '/icon-512.png']

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(VERSION).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting()))
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== VERSION).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const request = event.request
  if (request.method !== 'GET') return
  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return
  if (url.pathname.startsWith('/api/')) return

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone()
          caches.open(VERSION).then((cache) => cache.put('/', copy)).catch(() => {})
          return response
        })
        .catch(() => caches.match('/').then((cached) => cached ?? Response.error())),
    )
    return
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached
      return fetch(request)
        .then((response) => {
          if (response.ok && (url.pathname.startsWith('/assets/') || url.pathname.endsWith('.png') || url.pathname.endsWith('.webmanifest'))) {
            const copy = response.clone()
            caches.open(VERSION).then((cache) => cache.put(request, copy)).catch(() => {})
          }
          return response
        })
        .catch(() => caches.match('/').then((shell) => shell ?? Response.error()))
    }),
  )
})

/* Web Push: payloads are produced by the API's notify() helper. */
self.addEventListener('push', (event) => {
  let payload = {}
  try {
    payload = event.data ? event.data.json() : {}
  } catch {
    payload = {}
  }
  const title = typeof payload.title === 'string' && payload.title ? payload.title : 'AlumniConnect'
  const url = typeof payload.url === 'string' && payload.url.startsWith('/') ? payload.url : '/'
  event.waitUntil(
    self.registration.showNotification(title, {
      body: typeof payload.body === 'string' ? payload.body : '',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: typeof payload.tag === 'string' ? payload.tag : 'alumniconnect',
      data: { url },
    }),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification.data && typeof event.notification.data.url === 'string' ? event.notification.data.url : '/'
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      for (const client of windows) {
        if ('focus' in client) {
          await client.focus()
          if ('navigate' in client) await client.navigate(url)
          return
        }
      }
      if (self.clients.openWindow) await self.clients.openWindow(url)
    })(),
  )
})
