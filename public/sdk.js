/* ==========================================================================
   WebPush — Zero-Cloud Socket.IO Client SDK
   Author: Shahil Ali (https://github.com/Shahilali5)
   Features:
     - 1-line script embed
     - Razorpay-style smooth bottom/center half-screen modal drawer
     - Site-isolated WebSocket connections (only visitors of your site receive)
     - In-page push sending via WebPush.send({ ... })
     - Floating Bell / Message icon trigger with unread counter
     - Web Audio Synthesizer (chime, coin, alert, success)
     - Native Service Worker OS banners with action buttons
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

  var socketInstance = null;
  var swRegistration = null;
  var HISTORY_KEY = 'webpush_inbox_' + KEY;

  function ensureStylesAndIcons() {
    if (!document.querySelector('link[href*="bootstrap-icons"]')) {
      var link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css';
      document.head.appendChild(link);
    }

    if (!document.getElementById('webpush-sdk-keyframes')) {
      var style = document.createElement('style');
      style.id = 'webpush-sdk-keyframes';
      style.innerHTML = 
        '@keyframes wpFadeIn { from { opacity: 0; } to { opacity: 1; } }' +
        '@keyframes wpSlideUp { from { transform: translate(-50%, 40px) scale(0.96); opacity: 0; } to { transform: translate(-50%, 0) scale(1); opacity: 1; } }' +
        '@keyframes wpSlideDownMobile { from { transform: translateY(100%); } to { transform: translateY(0); } }' +
        '@keyframes wpPulseRing { 0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(99, 102, 241, 0.7); } 70% { transform: scale(1); box-shadow: 0 0 0 14px rgba(99, 102, 241, 0); } 100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(99, 102, 241, 0); } }' +
        '.wp-inbox-item:hover { background: rgba(255, 255, 255, 0.05) !important; transform: translateX(3px); }' +
        '@media (max-width: 640px) {' +
        '  #webpush-inbox-modal { width: 100% !important; max-width: 100% !important; height: 75vh !important; max-height: 85vh !important; border-radius: 24px 24px 0 0 !important; bottom: 0 !important; top: auto !important; left: 0 !important; transform: none !important; animation: wpSlideDownMobile 0.35s cubic-bezier(0.16, 1, 0.3, 1) !important; }' +
        '}';
      document.head.appendChild(style);
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

  // Web Audio Synthesizer
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

  // Local Storage Inbox
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
        id: item.campaign_id || Date.now(),
        title: item.title || 'Notification',
        body: item.body || '',
        url: item.url || '/',
        icon: item.icon || '/test/bell.svg',
        image: item.image || null,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        date: new Date().toLocaleDateString([], { month: 'short', day: 'numeric' }),
        read: false
      });
      if (history.length > 50) history.pop();
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

  // Razorpay-Style Half-Screen Modal / Sheet
  function createInboxWidget() {
    if (!enableWidget || document.getElementById('webpush-inbox-widget')) return;

    // 1. Floating trigger button (Floating message / bell launcher)
    var launcher = document.createElement('div');
    launcher.id = 'webpush-inbox-widget';
    launcher.style.cssText = 'position:fixed;bottom:24px;right:24px;z-index:999990;font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;';

    var bellBtn = document.createElement('button');
    bellBtn.id = 'webpush-bell-button';
    bellBtn.setAttribute('aria-label', 'Open notification center');
    bellBtn.style.cssText = 'width:56px;height:56px;border-radius:28px;background:linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);color:#fff;border:none;box-shadow:0 10px 28px rgba(79,70,229,0.5),0 2px 6px rgba(0,0,0,0.3);cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:24px;transition:all 0.25s cubic-bezier(0.16,1,0.3,1);position:relative;outline:none;';
    bellBtn.innerHTML = '<i class="bi bi-chat-left-dots-fill"></i>';

    var badge = document.createElement('span');
    badge.id = 'webpush-badge-count';
    badge.style.cssText = 'position:absolute;top:-4px;right:-4px;background:#ef4444;color:#fff;font-size:11px;font-weight:700;padding:2px 7px;border-radius:10px;border:2px solid #090d16;display:none;box-shadow:0 2px 6px rgba(239,68,68,0.5);';
    bellBtn.appendChild(badge);

    launcher.appendChild(bellBtn);
    document.body.appendChild(launcher);

    // 2. Full-Screen Backdrop & Half-Screen Modal (Razorpay Style)
    var backdrop = document.createElement('div');
    backdrop.id = 'webpush-inbox-backdrop';
    backdrop.style.cssText = 'display:none;position:fixed;inset:0;background:rgba(5,9,18,0.72);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);z-index:999998;animation:wpFadeIn 0.25s ease-out;align-items:center;justify-content:center;';

    var modal = document.createElement('div');
    modal.id = 'webpush-inbox-modal';
    modal.style.cssText = 'width:480px;max-width:92vw;height:560px;max-height:85vh;background:#0d1322;border:1px solid rgba(255,255,255,0.12);border-radius:24px;box-shadow:0 30px 70px rgba(0,0,0,0.8),0 0 30px rgba(99,102,241,0.25);position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);z-index:999999;display:none;flex-direction:column;overflow:hidden;animation:wpSlideUp 0.3s cubic-bezier(0.16,1,0.3,1);font-family:system-ui,-apple-system,sans-serif;';

    modal.innerHTML = 
      '<!-- Header -->' +
      '<div style="padding:18px 22px;background:linear-gradient(180deg, rgba(255,255,255,0.04) 0%, transparent 100%);border-bottom:1px solid rgba(255,255,255,0.08);display:flex;align-items:center;justify-content:space-between;flex-shrink:0;">' +
        '<div style="display:flex;align-items:center;gap:12px;">' +
          '<div style="width:40px;height:40px;border-radius:12px;background:linear-gradient(135deg, #4f46e5, #7c3aed);display:flex;align-items:center;justify-content:center;font-size:20px;color:#fff;box-shadow:0 4px 14px rgba(79,70,229,0.4);"><i class="bi bi-bell-fill"></i></div>' +
          '<div>' +
            '<div style="font-size:16px;font-weight:700;color:#fff;letter-spacing:-0.01em;">Notifications</div>' +
            '<div style="font-size:12px;color:#94a3b8;" id="webpush-inbox-subtitle">Updates &amp; Announcements</div>' +
          '</div>' +
        '</div>' +
        '<div style="display:flex;align-items:center;gap:8px;">' +
          '<button id="webpush-clear-inbox" title="Clear all notifications" style="background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);color:#94a3b8;font-size:12px;cursor:pointer;padding:6px 12px;border-radius:8px;display:flex;align-items:center;gap:5px;transition:all 0.15s ease;">' +
            '<i class="bi bi-trash3"></i> Clear' +
          '</button>' +
          '<button id="webpush-close-modal" title="Close" style="width:34px;height:34px;border-radius:10px;background:rgba(255,255,255,0.08);border:none;color:#cbd5e1;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:18px;transition:all 0.15s ease;outline:none;">' +
            '<i class="bi bi-x-lg"></i>' +
          '</button>' +
        '</div>' +
      '</div>' +

      '<!-- Content List -->' +
      '<div id="webpush-inbox-list" style="overflow-y:auto;flex:1;display:flex;flex-direction:column;padding:10px;"></div>' +

      '<!-- Razorpay-style Footer -->' +
      '<div style="padding:12px 20px;background:rgba(5,9,18,0.6);border-top:1px solid rgba(255,255,255,0.06);display:flex;align-items:center;justify-content:space-between;flex-shrink:0;font-size:11px;color:#64748b;">' +
        '<div style="display:flex;align-items:center;gap:6px;">' +
          '<span style="width:7px;height:7px;border-radius:50%;background:#10b981;display:inline-block;"></span> Connected via Pure WebSocket' +
        '</div>' +
        '<div style="color:#818cf8;font-weight:600;">WebPush Engine</div>' +
      '</div>';

    document.body.appendChild(backdrop);
    document.body.appendChild(modal);

    // Launcher interactions
    bellBtn.onmouseenter = function () { this.style.transform = 'scale(1.08)'; };
    bellBtn.onmouseleave = function () { this.style.transform = 'scale(1)'; };

    bellBtn.onclick = function (e) {
      e.stopPropagation();
      openInboxModal();
    };

    document.getElementById('webpush-close-modal').onclick = function (e) {
      e.stopPropagation();
      closeInboxModal();
    };

    backdrop.onclick = function () {
      closeInboxModal();
    };

    document.getElementById('webpush-clear-inbox').onclick = function (e) {
      e.stopPropagation();
      clearHistory();
    };

    updateInboxBadge();
    renderInboxList();
  }

  function openInboxModal() {
    var backdrop = document.getElementById('webpush-inbox-backdrop');
    var modal = document.getElementById('webpush-inbox-modal');
    if (!backdrop || !modal) return;

    backdrop.style.display = 'block';
    modal.style.display = 'flex';

    var history = getHistory();
    history.forEach(function (h) { h.read = true; });
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    updateInboxBadge();
    renderInboxList();
  }

  function closeInboxModal() {
    var backdrop = document.getElementById('webpush-inbox-backdrop');
    var modal = document.getElementById('webpush-inbox-modal');
    if (backdrop) backdrop.style.display = 'none';
    if (modal) modal.style.display = 'none';
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
    var subtitle = document.getElementById('webpush-inbox-subtitle');
    if (!list) return;
    var history = getHistory();

    if (subtitle) {
      subtitle.textContent = history.length ? history.length + ' message' + (history.length > 1 ? 's' : '') : 'No notifications yet';
    }

    if (!history.length) {
      list.innerHTML = 
        '<div style="padding:60px 24px;text-align:center;color:#64748b;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;margin:auto;">' +
          '<div style="width:64px;height:64px;border-radius:20px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);display:flex;align-items:center;justify-content:center;font-size:28px;color:#818cf8;opacity:0.8;"><i class="bi bi-inbox"></i></div>' +
          '<div style="font-size:15px;font-weight:600;color:#94a3b8;">All Caught Up!</div>' +
          '<div style="font-size:12px;color:#64748b;max-width:240px;line-height:1.5;">You will receive real-time updates and announcements right here.</div>' +
        '</div>';
      return;
    }

    list.innerHTML = history.map(function (item) {
      var bannerHtml = item.image 
        ? '<img src="' + item.image + '" style="width:100%;height:100px;object-fit:cover;border-radius:10px;margin-top:8px;" alt="Banner">' 
        : '';

      return '<div class="wp-inbox-item" style="padding:14px 16px;margin-bottom:8px;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.05);border-radius:14px;cursor:pointer;display:flex;gap:14px;align-items:flex-start;transition:all 0.2s cubic-bezier(0.16,1,0.3,1);" onclick="window.open(\'' + (item.url || '/') + '\',\'_blank\')">' +
        '<img src="' + item.icon + '" style="width:40px;height:40px;border-radius:10px;object-fit:cover;flex-shrink:0;background:rgba(255,255,255,0.05);box-shadow:0 4px 10px rgba(0,0,0,0.3);" alt="icon">' +
        '<div style="flex:1;min-width:0;">' +
          '<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;">' +
            '<div style="font-size:14px;font-weight:700;color:#fff;line-height:1.3;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + item.title + '</div>' +
            '<span style="font-size:11px;color:#64748b;white-space:nowrap;">' + (item.time || '') + '</span>' +
          '</div>' +
          '<div style="font-size:12px;color:#94a3b8;line-height:1.45;margin-top:4px;">' + item.body + '</div>' +
          bannerHtml +
          '<div style="margin-top:8px;display:flex;align-items:center;gap:6px;font-size:11px;color:#818cf8;font-weight:600;">' +
            '<span>Open Link</span> <i class="bi bi-arrow-up-right"></i>' +
          '</div>' +
        '</div>' +
      '</div>';
    }).join('');
  }

  // Service Worker
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

  // OS Notification
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

    if (swRegistration && swRegistration.showNotification) {
      swRegistration.showNotification(title, options);
    } else {
      try {
        var nativeNotification = new Notification(title, options);
        nativeNotification.onclick = function (e) {
          e.preventDefault();
          window.focus();
          window.open(n.url || '/', '_blank');
        };
      } catch (_) {}
    }
  }

  // In-Page Toast
  function toast(n) {
    playSound('chime');
    saveHistoryItem(n);

    var box = document.getElementById('webpush-toast-box');
    if (!box) {
      box = document.createElement('div');
      box.id = 'webpush-toast-box';
      box.style.cssText = 'position:fixed;' +
        (pos.indexOf('top') >= 0 ? 'top:20px;' : 'bottom:20px;') +
        (pos.indexOf('left') >= 0 ? 'left:20px;' : 'right:20px;') +
        'z-index:999999;display:flex;flex-direction:column;gap:12px;width:380px;max-width:calc(100vw - 32px);pointer-events:none;';
      document.body.appendChild(box);
    }

    var t = document.createElement('div');
    t.className = 'wp-toast-item';
    t.style.cssText = 'background:#090d16;color:#f8fafc;border:1px solid rgba(255,255,255,0.12);border-radius:16px;padding:16px;box-shadow:0 25px 50px -12px rgba(0,0,0,0.7),0 0 20px rgba(99,102,241,0.2);font:14px system-ui,sans-serif;display:flex;flex-direction:column;gap:10px;pointer-events:auto;box-sizing:border-box;max-width:100%;backdrop-filter:blur(16px);';

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
        b.style.cssText = 'background:#4f46e5;color:#ffffff;border:none;border-radius:8px;padding:7px 16px;font-size:13px;font-weight:600;cursor:pointer;display:inline-flex;align-items:center;gap:6px;outline:none;';
      } else {
        b.style.cssText = 'background:rgba(255,255,255,0.08);color:#cbd5e1;border:1px solid rgba(255,255,255,0.15);border-radius:8px;padding:7px 14px;font-size:13px;font-weight:600;cursor:pointer;display:inline-flex;align-items:center;gap:6px;outline:none;';
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
        window.open(targetUrl, '_blank');
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

  // Socket.IO Connection
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
      console.warn('[WebPush] Socket note:', err.message);
    });
  }

  // Permission & Subscription
  function subscribe() {
    if (!('Notification' in window)) {
      alert('This browser does not support notifications.');
      return Promise.resolve(false);
    }

    return Notification.requestPermission().then(function (permission) {
      window.dispatchEvent(new CustomEvent('webpush:permission', { detail: { permission: permission } }));

      if (permission !== 'granted') return false;

      initServiceWorker();

      if (socketInstance && socketInstance.connected) {
        socketInstance.emit('client_subscribe', { user_id: userId, tags: tags });
      } else {
        setTimeout(function () {
          if (socketInstance && socketInstance.connected) {
            socketInstance.emit('client_subscribe', { user_id: userId, tags: tags });
          } else {
            handleIncomingNotification({
              title: 'Thanks For Subscribing',
              body: 'You Will Receive Updates Even When Website Is Closed',
              url: '/'
            });
          }
        }, 500);
      }

      return true;
    });
  }

  // In-Page Notification Sender
  function sendPush(options) {
    var payload = Object.assign({
      site_key: KEY,
      title: 'Update',
      body: 'New notification',
      url: '/',
      target: 'all'
    }, options);

    if (socketInstance && socketInstance.connected) {
      socketInstance.emit('send_notification', payload);
      return Promise.resolve({ sent: true, mode: 'websocket' });
    } else {
      return fetch(API + '/api/v1/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-site-key': KEY },
        body: JSON.stringify(payload)
      }).then(function (r) { return r.json(); });
    }
  }

  // Public Developer API
  window.WebPush = {
    subscribe: subscribe,
    notify: handleIncomingNotification,
    showNotification: handleIncomingNotification,
    send: sendPush,
    sendNotification: sendPush,
    playSound: playSound,
    openInbox: openInboxModal,
    closeInbox: closeInboxModal,
    clearInbox: clearHistory,
    getSocket: function () { return socketInstance; },
    getSiteKey: function () { return KEY; }
  };

  ensureStylesAndIcons();
  initServiceWorker();
  initSocket();

  window.addEventListener('DOMContentLoaded', function () {
    createInboxWidget();
  });

  if (s.dataset && s.dataset.auto === 'true') {
    setTimeout(subscribe, 2500);
  }
})();
