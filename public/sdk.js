/* ==========================================================================
   WebPush — Open Source Real-Time Push Engine
   Author: Shahil Ali (https://github.com/shahilali5)
   Top 5 Functions:
     1. Zero-Config CDN Script
     2. Native OS + In-Page Toasts with Dynamic Action Buttons
     3. Floating Notification Center Inbox Widget
     4. Web Audio API Chime Synthesizer (4 Presets)
     5. Real-Time Socket.IO Streaming & Click Telemetry
   ========================================================================== */

(function () {
  var s = document.currentScript || {};
  var API = s.src ? new URL(s.src).origin : window.location.origin;
  var KEY = (s.dataset && s.dataset.siteKey) || 'change-me-site';
  var userId = (s.dataset && s.dataset.userId) || '';
  var tags = ((s.dataset && s.dataset.tags) || '').split(',').filter(Boolean);
  var pos = (s.dataset && s.dataset.toast) || 'top-right';
  var swPath = (s.dataset && s.dataset.sw) || '/sw.js';
  var enableWidget = (s.dataset && s.dataset.widget) !== 'false';
  var soundEnabled = (s.dataset && s.dataset.sound) !== 'false';

  var shown = {};
  var socketInstance = null;
  var swRegistration = null;
  var HISTORY_KEY = 'webpush_inbox_history';

  // 1. Ensure Bootstrap Icons CDN
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

  // 2. Web Audio Synthesizer (4 Presets: chime, coin, alert, success)
  function playSound(type) {
    if (!soundEnabled) return;
    try {
      var ctx = new (window.AudioContext || window.webkitAudioContext)();
      var osc1 = ctx.createOscillator();
      var osc2 = ctx.createOscillator();
      var gain = ctx.createGain();

      var t = ctx.currentTime;
      if (type === 'coin') {
        osc1.frequency.setValueAtTime(987.77, t);
        osc1.frequency.setValueAtTime(1318.51, t + 0.08);
      } else if (type === 'alert') {
        osc1.frequency.setValueAtTime(440, t);
        osc1.frequency.setValueAtTime(330, t + 0.12);
      } else if (type === 'success') {
        osc1.frequency.setValueAtTime(523.25, t);
        osc1.frequency.setValueAtTime(659.25, t + 0.08);
        osc1.frequency.setValueAtTime(783.99, t + 0.16);
      } else {
        // default chime
        osc1.frequency.setValueAtTime(587.33, t);
        osc2.frequency.setValueAtTime(880.00, t + 0.08);
        osc2.connect(gain);
        osc2.start(t + 0.08);
        osc2.stop(t + 0.45);
      }

      gain.gain.setValueAtTime(0.18, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
      osc1.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(t);
      osc1.stop(t + 0.45);
    } catch (_) {}
  }

  // 3. Local Inbox History
  function getHistory() {
    try {
      return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
    } catch (_) {
      return [];
    }
  }

  function saveHistoryItem(item) {
    try {
      var history = getHistory();
      history.unshift({
        id: item.campaign_id || String(Date.now()),
        title: item.title,
        body: item.body,
        url: item.url || '/',
        icon: item.icon || '/test/bell.svg',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        read: false
      });
      if (history.length > 25) history = history.slice(0, 25);
      localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
      updateInboxBadge();
      renderInboxList();
    } catch (_) {}
  }

  function clearHistory() {
    localStorage.removeItem(HISTORY_KEY);
    updateInboxBadge();
    renderInboxList();
  }

  // 4. Floating Notification Center (Bell Inbox Widget)
  function createInboxWidget() {
    if (!enableWidget || document.getElementById('webpush-bell-widget')) return;

    var container = document.createElement('div');
    container.id = 'webpush-bell-widget';
    container.style.cssText = 'position:fixed;bottom:24px;left:24px;z-index:999990;font-family:system-ui,-apple-system,sans-serif;';

    container.innerHTML =
      '<button id="webpush-bell-btn" type="button" aria-label="Notification Center" style="width:48px;height:48px;border-radius:50%;background:#4f46e5;color:#fff;border:none;box-shadow:0 8px 24px rgba(79,70,229,0.45);cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:20px;position:relative;transition:all 0.2s cubic-bezier(0.34,1.56,0.64,1);outline:none;">' +
        '<i class="bi bi-bell-fill"></i>' +
        '<span id="webpush-badge-count" style="display:none;position:absolute;top:-4px;right:-4px;background:#ef4444;color:#fff;font-size:10px;font-weight:700;padding:2px 6px;border-radius:10px;border:2px solid #0a0d14;">0</span>' +
      '</button>' +
      '<div id="webpush-inbox-popover" style="display:none;position:absolute;bottom:60px;left:0;width:340px;max-height:440px;background:#0d111c;border:1px solid rgba(255,255,255,0.12);border-radius:16px;box-shadow:0 25px 50px rgba(0,0,0,0.6);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);overflow:hidden;flex-direction:column;animation:wp-popover 0.2s ease-out;">' +
        '<div style="padding:14px 16px;border-bottom:1px solid rgba(255,255,255,0.08);display:flex;align-items:center;justify-content:space-between;">' +
          '<span style="font-size:14px;font-weight:700;color:#fff;display:flex;align-items:center;gap:6px;"><i class="bi bi-bell-fill" style="color:#818cf8;"></i> Notifications</span>' +
          '<button id="webpush-clear-btn" type="button" style="background:none;border:none;color:#94a3b8;font-size:11px;font-weight:600;cursor:pointer;padding:2px 6px;border-radius:4px;">Clear All</button>' +
        '</div>' +
        '<div id="webpush-inbox-list" style="overflow-y:auto;max-height:360px;display:flex;flex-direction:column;"></div>' +
      '</div>';

    document.body.appendChild(container);

    var bellBtn = document.getElementById('webpush-bell-btn');
    var popover = document.getElementById('webpush-inbox-popover');
    var clearBtn = document.getElementById('webpush-clear-btn');

    bellBtn.onmouseenter = function () { this.style.transform = 'scale(1.08)'; };
    bellBtn.onmouseleave = function () { this.style.transform = 'scale(1)'; };

    bellBtn.onclick = function (e) {
      e.stopPropagation();
      var isVisible = popover.style.display === 'flex';
      popover.style.display = isVisible ? 'none' : 'flex';
      if (!isVisible) {
        // Mark items as read
        var history = getHistory();
        history.forEach(function (h) { h.read = true; });
        localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
        updateInboxBadge();
        renderInboxList();
      }
    };

    clearBtn.onclick = function (e) {
      e.stopPropagation();
      clearHistory();
    };

    document.addEventListener('click', function (e) {
      if (!container.contains(e.target)) {
        popover.style.display = 'none';
      }
    });

    updateInboxBadge();
    renderInboxList();
  }

  function updateInboxBadge() {
    var badge = document.getElementById('webpush-badge-count');
    if (!badge) return;
    var unread = getHistory().filter(function (h) { return !h.read; }).length;
    if (unread > 0) {
      badge.textContent = unread > 9 ? '9+' : unread;
      badge.style.display = 'block';
    } else {
      badge.style.display = 'none';
    }
  }

  function renderInboxList() {
    var list = document.getElementById('webpush-inbox-list');
    if (!list) return;
    var history = getHistory();

    if (!history.length) {
      list.innerHTML = '<div style="padding:32px 16px;text-align:center;color:#64748b;font-size:12px;"><i class="bi bi-inbox" style="font-size:24px;display:block;margin-bottom:8px;opacity:0.5;"></i>No notifications yet</div>';
      return;
    }

    list.innerHTML = history.map(function (item) {
      return '<div style="padding:12px 16px;border-bottom:1px solid rgba(255,255,255,0.05);cursor:pointer;display:flex;gap:12px;align-items:flex-start;transition:background 0.15s;" onmouseover="this.style.background=\'rgba(255,255,255,0.04)\'" onmouseout="this.style.background=\'none\'" onclick="window.open(\'' + (item.url || '/') + '\',\'_blank\')">' +
        '<img src="' + item.icon + '" style="width:34px;height:34px;border-radius:8px;object-fit:cover;flex-shrink:0;" alt="icon">' +
        '<div style="flex:1;min-width:0;">' +
          '<div style="font-size:13px;font-weight:600;color:#fff;line-height:1.3;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + item.title + '</div>' +
          '<div style="font-size:12px;color:#94a3b8;line-height:1.4;margin-top:2px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;">' + item.body + '</div>' +
          '<div style="font-size:10px;color:#64748b;margin-top:4px;">' + item.time + '</div>' +
        '</div>' +
      '</div>';
    }).join('');
  }

  // 5. Service Worker Registration
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

  // 6. Native OS Notification
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

  // 7. In-Page Interactive Toast
  function toast(n) {
    if (!n) return;
    if (typeof n === 'string') {
      try { n = JSON.parse(n); } catch (e) { n = { title: 'Notification', body: n }; }
    }

    if (n.campaign_id && n.campaign_id !== '0') {
      if (shown[n.campaign_id]) return;
      shown[n.campaign_id] = 1;
    }

    saveHistoryItem(n);
    playSound(n.sound || 'chime');

    var box = document.getElementById('wp-toasts');
    if (!box) {
      box = document.createElement('div');
      box.id = 'wp-toasts';
      var v = pos.indexOf('bottom') > -1 ? 'bottom:24px;' : 'top:24px;';
      var h = pos.indexOf('left') > -1 ? 'left:24px;' : 'right:24px;';
      box.style.cssText = 'position:fixed;z-index:999999;display:flex;flex-direction:column;gap:12px;max-width:390px;pointer-events:none;' + v + h;
      document.body.appendChild(box);
    }

    var t = document.createElement('div');
    t.className = 'wp-toast-item';
    t.style.cssText = 'background:#090d16;color:#f8fafc;border:1px solid rgba(255,255,255,0.12);border-radius:16px;padding:16px;box-shadow:0 25px 50px -12px rgba(0,0,0,0.7),0 0 20px rgba(99,102,241,0.2);font:14px system-ui,-apple-system,sans-serif;display:flex;flex-direction:column;gap:10px;pointer-events:auto;box-sizing:border-box;max-width:100%;animation:wp-fadein 0.3s ease-out;backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px)';

    var bannerHtml = n.image
      ? '<img src="' + n.image + '" style="width:100%;max-height:150px;object-fit:cover;border-radius:10px;margin-bottom:6px;" alt="Banner">'
      : '';

    var iconHtml = n.icon
      ? '<img src="' + n.icon + '" width="40" height="40" style="border-radius:10px;object-fit:cover;flex-shrink:0" alt="Logo">'
      : '<div style="width:40px;height:40px;border-radius:10px;background:rgba(99,102,241,0.2);color:#818cf8;display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:20px"><i class="bi bi-bell-fill"></i></div>';

    var headerRow = document.createElement('div');
    headerRow.style.cssText = 'display:flex;gap:12px;align-items:flex-start;';
    headerRow.innerHTML = iconHtml +
      '<div style="flex:1;min-width:0">' +
        '<b class="wp-title" style="display:block;font-size:15px;font-weight:700;line-height:1.3;color:#ffffff;margin-bottom:3px;word-break:break-word"></b>' +
        '<div class="wp-body" style="font-size:13px;line-height:1.45;color:#94a3b8;word-break:break-word"></div>' +
      '</div>';

    headerRow.querySelector('.wp-title').textContent = n.title || 'Notification';
    headerRow.querySelector('.wp-body').textContent = n.body || '';

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
      } else {
        b.style.cssText = 'background:rgba(255,255,255,0.08);color:#cbd5e1;border:1px solid rgba(255,255,255,0.15);border-radius:8px;padding:7px 14px;font-size:13px;font-weight:600;cursor:pointer;display:inline-flex;align-items:center;gap:6px;outline:none;transition:all 0.15s ease';
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

    if (bannerHtml) t.innerHTML = bannerHtml;
    t.appendChild(headerRow);
    t.appendChild(actionsContainer);

    box.appendChild(t);
    window.dispatchEvent(new CustomEvent('webpush:displayed', { detail: n }));
  }

  function handleIncomingNotification(n) {
    showNativeNotification(n);
    toast(n);
  }

  // 8. Socket.IO Real-Time Stream
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

  // 9. Subscribe Handler
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

  // 10. Send Custom
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
    playSound: playSound,
    openInbox: function () {
      var p = document.getElementById('webpush-inbox-popover');
      if (p) p.style.display = 'flex';
    },
    clearInbox: clearHistory,
    getSocket: function () { return socketInstance; }
  };

  ensureBootstrapIcons();
  initServiceWorker();
  initSocket();

  window.addEventListener('DOMContentLoaded', function () {
    createInboxWidget();
  });

  if (s.dataset && s.dataset.auto === 'true') {
    setTimeout(subscribe, 2500);
  }
})();
