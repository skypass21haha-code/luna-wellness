const CACHE_NAME = 'luna-shell-v1'
const APP_SHELL = ['/', '/manifest.webmanifest']

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)))
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return
  event.respondWith(fetch(event.request).catch(() => caches.match(event.request)))
})

self.addEventListener('message', (event) => {
  if (event.data?.type !== 'SHOW_LUNA_REMINDER') return
  event.waitUntil(self.registration.showNotification('LUNA • Medication Reminder', {
    body: 'Time to take your medication',  
    tag: event.data.tag || 'luna-medication-reminder',
    data: { url: event.data.url || '/' },
    actions: [{ action: 'open', title: 'Open LUNA' }],
  }))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const target = event.notification.data?.url || '/'
  event.waitUntil(clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windows) => {
    const existing = windows.find((client) => 'focus' in client)
    if (existing) return existing.focus()
    return clients.openWindow(target)
  }))
})
