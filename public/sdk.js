/* ==========================================================================
   WebPush — Open Source Socket.IO Real-Time Push Notification Engine
   Author: Shahil Ali (https://github.com/shahilali5)
   Features: Zero Firebase, Dynamic Action Buttons, Custom Logos, Bootstrap Icons
   ========================================================================== */

(function () {
  var s = document.currentScript || {};
  var API = s.src ? new URL(s.src).origin : window.location.origin;
  var KEY = (s.dataset && s.dataset.siteKey) || 'change-me-site';
  var userId = (s.dataset && s.dataset.userId) || '';
  var tags = ((s.dataset && s.dataset.tags) || '').split(',').filter(Boolean);
  var pos = (s.dataset && s.dataset.toast) || 'top-right';
  var swPath = (s.dataset && s.dataset.sw) || '/sw.js';
  var shown = {};
  var socketInstance = null;
  var swRegistration = null;

  // 1. Inject Bootstrap Icons CDN if not already present
  function ensureBootstrapIcons() {
    if (!document.querySelector('link[href*="bootstrap-icons"]')) {
      var link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css';
      document.head.appendChild(link);
    }
  }

  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      if (document.querySelector('script[src="' + src + '"]')) return resolve();
      var el = document.createElement('script');
      el.src = src;
      el.onload = resolve;
      el.onerror = reject;
      document.head.appendChild(el);
    });
  }

  // 2. Service Worker Registration
  function initServiceWorker() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register(swPath).then(function (reg) {
        swRegistration = reg;
      }).catch(function (_) {});

      navigator.serviceWorker.addEventListener('message', function (event) {
        if (event.data && event.data.type === 'NOTIFICATION_BUTTON_CLICKED') {
          window.dispatchEvent(new CustomEvent('webpush:click', {
            detail: { action: event.data.action, data: event.data.data }
          }));
        }
      });
    }
  }

  // 3. System Native Notification with Custom Action Buttons
  function showNativeNotification(n) {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;

    var title = n.title || 'Thanks For Subscribing';
    var buttons = Array.isArray(n.buttons)
      ? n.buttons
      : (Array.isArray(n.actions) ? n.actions : [
          { action: 'close', title: 'Close' },
          { action: 'open', title: 'Open' }
        ]);

    var options = {
      body: n.body || 'You Will Receive Updates Even When Website Is Closed',
      icon: n.icon || '/test/bell.svg',
      badge: n.badge || n.icon || '/test/bell.svg',
      image: n.image || undefined,
      data: n,
      tag: n.campaign_id || 'push-' + Date.now(),
      renotify: true,
      requireInteraction: true,
      actions: buttons.map(function (b) {
        return { action: b.action, title: b.title };
      })
    };

    if (navigator.serviceWorker && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'SHOW_NOTIFICATION',
        payload: n
      });
    } else if (swRegistration && swRegistration.showNotification) {
      swRegistration.showNotification(title, options);
    } else {
      try {
        var notif = new Notification(title, options);
        notif.onclick = function () {
          window.focus();
          if (n.url) window.open(n.url, '_blank');
          notif.close();
        };
      } catch (e) {}
    }
  }

  // 4. In-Page Interactive Toast with Bootstrap Icons & Dynamic Buttons
  function toast(n) {
    if (!n) return;
    if (typeof n === 'string') {
      try { n = JSON.parse(n); } catch (e) { n = { title: 'Notification', body: n }; }
    }

    if (n.campaign_id && n.campaign_id !== '0') {
      if (shown[n.campaign_id]) return;
      shown[n.campaign_id] = 1;
    }

    var box = document.getElementById('wp-toasts');
    if (!box) {
      box = document.createElement('div');
      box.id = 'wp-toasts';
      var v = pos.indexOf('bottom') > -1 ? 'bottom:24px;' : 'top:24px;';
      var h = pos.indexOf('left') > -1 ? 'left:24px;' : 'right:24px;';
      box.style.cssText = 'position:fixed;z-index:999999;display:flex;flex-direction:column;gap:12px;max-width:400px;pointer-events:none;' + v + h;
      document.body.appendChild(box);
    }

    var t = document.createElement('div');
    t.className = 'wp-toast-item';
    t.style.cssText = 'background:#090d16;color:#f8fafc;border:1px solid rgba(255,255,255,0.12);border-radius:16px;padding:16px;box-shadow:0 25px 50px -12px rgba(0,0,0,0.7),0 0 20px rgba(99,102,241,0.2);font:14px system-ui,-apple-system,sans-serif;display:flex;flex-direction:column;gap:10px;pointer-events:auto;box-sizing:border-box;max-width:100%;animation:wp-fadein 0.3s ease-out;backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px)';

    // Optional Banner Image
    var bannerHtml = n.image
      ? '<img src="' + n.image + '" style="width:100%;max-height:160px;object-fit:cover;border-radius:10px;margin-bottom:6px;" alt="Banner">'
      : '';

    // Icon / Logo
    var iconHtml = n.icon
      ? '<img src="' + n.icon + '" width="42" height="42" style="border-radius:10px;object-fit:cover;flex-shrink:0" alt="Logo">'
      : '<div style="width:42px;height:42px;border-radius:10px;background:rgba(99,102,241,0.2);color:#818cf8;display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:20px"><i class="bi bi-bell-fill"></i></div>';

    var headerRow = document.createElement('div');
    headerRow.style.cssText = 'display:flex;gap:12px;align-items:flex-start;';
    headerRow.innerHTML = iconHtml +
      '<div style="flex:1;min-width:0">' +
        '<b class="wp-title" style="display:block;font-size:15px;font-weight:700;line-height:1.3;color:#ffffff;margin-bottom:3px;word-break:break-word"></b>' +
        '<div class="wp-body" style="font-size:13px;line-height:1.45;color:#94a3b8;word-break:break-word"></div>' +
      '</div>';

    headerRow.querySelector('.wp-title').textContent = n.title || 'Notification';
    headerRow.querySelector('.wp-body').textContent = n.body || '';

    // Dynamic Action Buttons
    var buttons = Array.isArray(n.buttons)
      ? n.buttons
      : (Array.isArray(n.actions) ? n.actions : [
          { action: 'close', title: 'Close', type: 'secondary' },
          { action: 'open', title: 'Open', url: n.url || '/', type: 'primary' }
        ]);

    var actionsContainer = document.createElement('div');
    actionsContainer.style.cssText = 'display:flex;gap:8px;margin-top:6px;justify-content:flex-end;flex-wrap:wrap;';

    var dismissTimer = setTimeout(function () {
      if (t.parentNode) t.remove();
    }, 14000);

    buttons.forEach(function (btn) {
      var b = document.createElement('button');
      b.type = 'button';
      var isPrimary = btn.type === 'primary' || btn.action === 'open';

      if (isPrimary) {
        b.style.cssText = 'background:#4f46e5;color:#ffffff;border:none;border-radius:8px;padding:7px 16px;font-size:13px;font-weight:600;cursor:pointer;display:inline-flex;align-items:center;gap:6px;outline:none;box-shadow:0 4px 12px rgba(79,70,229,0.4);transition:all 0.15s ease';
        b.onmouseenter = function () { this.style.background = '#4338ca'; this.style.transform = 'translateY(-1px)'; };
        b.onmouseleave = function () { this.style.background = '#4f46e5'; this.style.transform = 'translateY(0)'; };
      } else {
        b.style.cssText = 'background:rgba(255,255,255,0.08);color:#cbd5e1;border:1px solid rgba(255,255,255,0.15);border-radius:8px;padding:7px 14px;font-size:13px;font-weight:600;cursor:pointer;display:inline-flex;align-items:center;gap:6px;outline:none;transition:all 0.15s ease';
        b.onmouseenter = function () { this.style.background = 'rgba(255,255,255,0.16)'; };
        b.onmouseleave = function () { this.style.background = 'rgba(255,255,255,0.08)'; };
      }

      var iconClass = btn.icon || (btn.action === 'close' ? 'bi-x-lg' : (btn.action === 'open' ? 'bi-box-arrow-up-right' : ''));
      b.innerHTML = (iconClass ? '<i class="bi ' + iconClass + '"></i> ' : '') + (btn.title || 'Button');

      b.onclick = function (e) {
        if (e) e.stopPropagation();
        clearTimeout(dismissTimer);

        if (btn.action === 'close') {
          window.dispatchEvent(new CustomEvent('webpush:click', { detail: { action: 'close', button: btn, notification: n } }));
          if (t.parentNode) t.remove();
          return;
        }

        var targetUrl = btn.url || n.url || '/';
        window.dispatchEvent(new CustomEvent('webpush:click', { detail: { action: btn.action || 'open', button: btn, notification: n, url: targetUrl } }));

        if (window.open(targetUrl, '_blank') === null) {
          location.href = targetUrl;
        }
        if (t.parentNode) t.remove();
      };

      actionsContainer.appendChild(b);
    });

    if (bannerHtml) {
      t.innerHTML = bannerHtml;
    }
    t.appendChild(headerRow);
    t.appendChild(actionsContainer);

    box.appendChild(t);
    window.dispatchEvent(new CustomEvent('webpush:displayed', { detail: n }));
  }

  function handleIncomingNotification(n) {
    showNativeNotification(n);
    toast(n);
  }

  // 5. Real-Time Socket Connection
  function initSocket() {
    return loadScript(API + '/socket.io/socket.io.js').then(function () {
      socketInstance = io(API, {
        auth: { siteKey: KEY, user_id: userId, tags: tags }
      });

      socketInstance.on('connect', function () {
        window.dispatchEvent(new CustomEvent('webpush:connected', { detail: { id: socketInstance.id } }));
      });

      socketInstance.on('notify', function (payload) {
        handleIncomingNotification(payload);
      });

      return socketInstance;
    }).catch(function (err) {
      console.warn('[WebPush] Socket.IO connection note:', err.message);
    });
  }

  // 6. Subscription Handler
  function subscribe() {
    if (!('Notification' in window)) {
      alert('This browser does not support desktop notifications.');
      return Promise.resolve(false);
    }

    return Notification.requestPermission().then(function (permission) {
      window.dispatchEvent(new CustomEvent('webpush:permission', { detail: { permission: permission } }));

      if (permission !== 'granted') return false;

      initServiceWorker();

      if (socketInstance && socketInstance.connected) {
        socketInstance.emit('client_subscribe', {
          user_id: userId,
          tags: tags,
          subscribed_at: new Date().toISOString()
        });
      } else {
        setTimeout(function () {
          if (socketInstance && socketInstance.connected) {
            socketInstance.emit('client_subscribe', { user_id: userId, tags: tags });
          } else {
            handleIncomingNotification({
              title: 'Thanks For Subscribing',
              body: 'You Will Receive Updates Even When Website Is Closed',
              url: '/',
              buttons: [
                { action: 'close', title: 'Close', icon: 'bi-x-lg', type: 'secondary' },
                { action: 'open', title: 'Open', url: '/', icon: 'bi-box-arrow-up-right', type: 'primary' }
              ]
            });
          }
        }, 500);
      }

      return true;
    });
  }

  // 7. Custom Send / Dispatch API for external projects
  function sendCustomNotification(options) {
    if (socketInstance && socketInstance.connected) {
      socketInstance.emit('send_notification', options);
    } else {
      fetch(API + '/api/v1/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-site-key': KEY },
        body: JSON.stringify(options)
      }).catch(function () {
        handleIncomingNotification(options);
      });
    }
  }

  // Public Developer API
  window.WebPush = {
    subscribe: subscribe,
    toast: toast,
    notify: handleIncomingNotification,
    showNotification: handleIncomingNotification,
    send: sendCustomNotification,
    sendTest: sendCustomNotification,
    getSocket: function () { return socketInstance; }
  };

  ensureBootstrapIcons();
  initServiceWorker();
  initSocket();

  if (s.dataset && s.dataset.auto === 'true') {
    setTimeout(subscribe, 2500);
  }
})();
