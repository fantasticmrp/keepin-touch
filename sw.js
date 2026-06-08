const CACHE = 'kt-v3';
const ASSETS = ['./', './index.html', './manifest.json'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request).catch(() => caches.match('./index.html')))
  );
});

// ── PUSH NOTIFICATIONS ────────────────────────────────────────────────────────
self.addEventListener('push', e => {
  const data = e.data ? e.data.json() : {};
  e.waitUntil(
    self.registration.showNotification(data.title || 'Keepin Touch', {
      body: data.body || 'You have overdue contacts.',
      icon: './icon-192.png',
      badge: './icon-192.png',
      tag: 'kt-overdue',
      renotify: true,
      data: { url: self.location.origin + self.location.pathname.replace('sw.js','') }
    })
  );
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(clients.openWindow(e.notification.data.url || './'));
});

// ── PERIODIC CHECK (triggered by the app via postMessage) ─────────────────────
self.addEventListener('message', e => {
  if (e.data && e.data.type === 'CHECK_OVERDUE') {
    const contacts = e.data.contacts || [];
    const overdue = contacts.filter(c => {
      if (!c.lastContact) return true;
      const days = Math.floor((Date.now() - new Date(c.lastContact)) / 86400000);
      return days >= c.frequency;
    });
    if (overdue.length > 0) {
      const names = overdue.slice(0, 3).map(c => c.name).join(', ');
      const extra = overdue.length > 3 ? ' and ' + (overdue.length - 3) + ' more' : '';
      self.registration.showNotification('Keepin Touch \u2014 Time to reach out', {
        body: names + extra + (overdue.length === 1 ? ' is' : ' are') + ' overdue for a call.',
        icon: './icon-192.png',
        badge: './icon-192.png',
        tag: 'kt-overdue',
        renotify: true,
        data: { url: self.location.href.replace('sw.js', '') }
      });
    }
  }
});
