/**
 * @webpush/react — Official React & Next.js Notification Components
 * Author: Shahil Ali (https://github.com/Shahilali5)
 */

'use client';

import React, { useEffect, useState } from 'react';

export function WebPushProvider({ 
  siteKey = 'change-me-site', 
  apiUrl = 'https://web-push.shahil-codex.xyz', 
  theme = '#4f46e5',
  widgetType = 'floating',
  sound = true,
  children 
}) {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Load SDK if not loaded
    if (!document.querySelector('script[src*="sdk.js"]')) {
      const script = document.createElement('script');
      script.src = `${apiUrl}/sdk.js`;
      script.dataset.siteKey = siteKey;
      script.dataset.theme = theme;
      script.dataset.widgetType = widgetType;
      script.dataset.sound = String(sound);
      script.async = true;
      document.head.appendChild(script);
    }
  }, [siteKey, apiUrl, theme, widgetType, sound]);

  return <>{children}</>;
}

export function NotificationBell({ className = '', style = {}, badgeClassName = '' }) {
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    const handleUpdate = () => {
      const history = JSON.parse(localStorage.getItem('webpush_inbox_' + (window.WebPush?.getSiteKey?.() || 'change-me-site')) || '[]');
      const count = history.filter(h => !h.read).length;
      setUnread(count);
    };

    window.addEventListener('webpush:displayed', handleUpdate);
    window.addEventListener('webpush:click', handleUpdate);
    handleUpdate();

    return () => {
      window.removeEventListener('webpush:displayed', handleUpdate);
      window.removeEventListener('webpush:click', handleUpdate);
    };
  }, []);

  const handleClick = () => {
    if (window.WebPush && typeof window.WebPush.openInbox === 'function') {
      window.WebPush.openInbox();
      setUnread(0);
    }
  };

  return (
    <button 
      onClick={handleClick} 
      className={className} 
      style={{ position: 'relative', background: 'transparent', border: 'none', cursor: 'pointer', ...style }}
      aria-label="Open notifications"
    >
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
        <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
      </svg>
      {unread > 0 && (
        <span 
          className={badgeClassName}
          style={{
            position: 'absolute',
            top: -4,
            right: -4,
            backgroundColor: '#ef4444',
            color: '#ffffff',
            fontSize: 10,
            fontWeight: 'bold',
            padding: '2px 5px',
            borderRadius: 10
          }}
        >
          {unread > 9 ? '9+' : unread}
        </span>
      )}
    </button>
  );
}

export function useWebPush() {
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState('default');

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setIsSupported(true);
      setPermission(Notification.permission);
    }
  }, []);

  const subscribe = async () => {
    if (window.WebPush && typeof window.WebPush.subscribe === 'function') {
      const granted = await window.WebPush.subscribe();
      if ('Notification' in window) setPermission(Notification.permission);
      return granted;
    }
    return false;
  };

  const send = (payload) => {
    if (window.WebPush && typeof window.WebPush.send === 'function') {
      return window.WebPush.send(payload);
    }
  };

  const playSound = (preset) => {
    if (window.WebPush && typeof window.WebPush.playSound === 'function') {
      window.WebPush.playSound(preset);
    }
  };

  return { isSupported, permission, subscribe, send, playSound };
}
