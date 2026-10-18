/* =========================================================
   WebPush Standalone Service Worker
   NO Firebase - 100% Native & Socket.IO compatible
   Author: Shahil Ali (https://github.com/shahilali5)
   ========================================================= */

self.addEventListener('install', event => {
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(self.clients.claim());
});

// Display notification when instructed by client or background push
function showNotificationPayload(data) {
  const d = data || {};
  const title = d.title || 'Thanks For Subscribing';

  // Dynamic buttons or default Close/Open
  const actions = Array.isArray(d.buttons)
    ? d.buttons.map(b => ({ action: b.action, title: b.title }))
    : (Array.isArray(d.actions) ? d.actions : [
        { action: 'close', title: 'Close' },
        { action: 'open', title: 'Open' }
      ]);

  const options = {
    body: d.body || 'You Will Receive Updates Even When Website Is Closed',
    icon: d.icon || '/test/bell.svg',
    badge: d.badge || d.icon || '/test/bell.svg',
    image: d.image || undefined,
    data: d,
    tag: d.campaign_id || 'push-notification',
    renotify: true,
    requireInteraction: true,
    actions: actions
  };

  return self.registration.showNotification(title, options);
}

// Receive messages from foreground tab / Socket.IO client
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
    event.waitUntil(showNotificationPayload(event.data.payload));
  }
});

// Fallback for native push events
self.addEventListener('push', event => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (_) {
    data = { body: event.data ? event.data.text() : '' };
  }
  event.waitUntil(showNotificationPayload(data));
});

// Handle notification button clicks (Dynamic Close, Open, and Custom Action URLs)
self.addEventListener('notificationclick', event => {
  event.notification.close();
  const d = (event.notification && event.notification.data) || {};

  // If user clicked the "Close" button, dismiss without opening
  if (event.action === 'close') {
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      clientList.forEach(client => {
        client.postMessage({ type: 'NOTIFICATION_BUTTON_CLICKED', action: 'close', data: d });
      });
    });
    return;
  }

  // Resolve target URL from specific button or notification
  let targetUrl = d.url || '/';
  if (Array.isArray(d.buttons)) {
    const matchedBtn = d.buttons.find(b => b.action === event.action);
    if (matchedBtn && matchedBtn.url) {
      targetUrl = matchedBtn.url;
    }
  }

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url.indexOf(targetUrl) > -1 && 'focus' in client) {
          client.postMessage({ type: 'NOTIFICATION_BUTTON_CLICKED', action: event.action || 'open', data: d, url: targetUrl });
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
