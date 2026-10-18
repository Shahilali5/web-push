importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

const API = self.location.origin;
const urlParams = new URL(self.location).searchParams;
const KEY = urlParams.get('key') || '';

try {
  const firebaseConfig = urlParams.get('firebase') ? JSON.parse(decodeURIComponent(urlParams.get('firebase'))) : (self.__FIREBASE_CONFIG__ || null);
  if (firebaseConfig && !firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
  }
} catch (_) {}

let messaging;
try {
  messaging = firebase.messaging();
} catch (_) {}

if (messaging) {
  messaging.onBackgroundMessage(p => {
    const d = p.data || {};
    self.registration.showNotification(d.title, {
      body: d.body,
      icon: d.icon || undefined,
      image: d.image || undefined,
      data: d,
      actions: [
        { action: 'open', title: 'Open' },
        { action: 'close', title: 'Close' }
      ]
    });
  });
} else {
  self.addEventListener('push', e => {
    if (!e.data) return;
    try {
      const p = e.data.json();
      const d = p.data || p;
      if (d && d.title) {
        e.waitUntil(
          self.registration.showNotification(d.title, {
            body: d.body,
            icon: d.icon || undefined,
            image: d.image || undefined,
            data: d,
            actions: [
              { action: 'open', title: 'Open' },
              { action: 'close', title: 'Close' }
            ]
          })
        );
      }
    } catch (_) {}
  });
}

self.addEventListener('notificationclick', e => {
  e.notification.close();
  if (e.action === 'close') return;

  const d = e.notification.data || {};
  const siteKey = (d && d.site_key) || KEY;
  e.waitUntil((async () => {
    try {
      await fetch(API + '/api/click', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(siteKey ? { 'x-site-key': siteKey } : {})
        },
        body: JSON.stringify({ campaign_id: d.campaign_id }),
        keepalive: true
      });
    } catch (_) {}
    await clients.openWindow(d.url || '/');
  })());
});
