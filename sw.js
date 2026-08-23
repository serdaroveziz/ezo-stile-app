// EZO STİLE Lock Screen & Background Push Service Worker v1.0.53
const CACHE_NAME = 'ezo-stile-v1.0.53';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => caches.delete(cacheName))
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('push', (event) => {
  let data = { title: 'EZO STİLE - VIP Berber', body: 'Randevu onayı bekliyor!' };
  if (event.data) {
    try {
      data = event.data.json();
    } catch(e) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body || 'Randevu onayı bekliyor',
    icon: './icon-512.png',
    badge: './icon-512.png',
    vibrate: [300, 100, 300, 100, 300],
    tag: 'randevu-onayi-' + Date.now(),
    renotify: true,
    requireInteraction: true,
    data: { url: self.location.origin }
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'EZO STİLE', options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      if (clientList.length > 0) {
        return clientList[0].focus();
      }
      return clients.openWindow('/');
    })
  );
});
