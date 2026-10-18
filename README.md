# WebPush — Complete Pure WebSocket & Socket.IO Push Engine

100% self-hosted, independent real-time push notification system built with **Node.js, Express, and Socket.IO**. Zero Firebase, zero Apple APNs, and zero third-party cloud lock-in.

---

## 🚀 How It Works

1. **Site Isolation via `data-site-key`**:
   Each website includes the script with its own `data-site-key="YOUR_SITE"`. Notifications sent for that site key are **only received by visitors on that specific website**.
2. **In-Page Push Sender**:
   You can send notifications directly from frontend JavaScript (`WebPush.send(...)`) or from your backend REST API (`POST /api/v1/notify`).
3. **High Concurrency Engine**:
   Delivers broadcasts in non-blocking batches of 500 sockets per event-loop tick, handling 100,000+ simultaneous connections with 0% event-loop lag.

---

## 📦 1-Line Website Integration

Place this script before `</body>` on any website:

```html
<script 
  src="https://web-push.shahil-codex.xyz/sdk.js" 
  data-site-key="my-website-key" 
  data-widget="true"
  data-widget-type="floating"
  data-widget-pos="bottom-right"
  data-theme="#4f46e5">
</script>
```

### Available Widget Types:
- `floating` (Default): Modern action button with pulse ring
- `pill`: Sleek interactive pill button (`🔔 Updates`)
- `minimal`: Elegant minimalist glass button
- `bar`: Compact alert bar tab

---

## ⚡ Send Notifications (2 Ways)

### 1. Send Directly from Frontend (JavaScript)
Call `WebPush.send()` right inside the website:

```javascript
WebPush.send({
  title: "Flash Sale Alert! ⚡",
  body: "Get 40% discount on all plans. Ends in 2 hours!",
  url: "https://mywebsite.com/sale",
  icon: "https://mywebsite.com/logo.png",
  target: "all", // "all" | "self" | "user:123" | "tag:vip"
  buttons: [
    { action: "close", title: "Dismiss", type: "secondary" },
    { action: "open", title: "Claim Deal ↗", url: "https://mywebsite.com/sale", type: "primary" }
  ]
});
```

### 2. Send via Backend REST API (`POST /api/v1/notify`)

From any backend (Node.js, PHP, Python, Go):

```bash
curl -X POST https://web-push.shahil-codex.xyz/api/v1/notify \
  -H "Content-Type: application/json" \
  -H "x-site-key: my-website-key" \
  -d '{
    "title": "New Order Placed",
    "body": "Order #4928 received from user.",
    "url": "/orders/4928",
    "target": "all"
  }'
```

---

## 🛠️ Built-in Capabilities

- **Smart Icon Resolution**: Automatically uses the website's favicon or logo (`apple-touch-icon`, `shortcut icon`, `/favicon.ico`) if the notification icon is omitted.
- **Developer Customization API**: Change theme colors, brand icons, and sound presets via `WebPush.configure()`.
- **Half-Screen Drawer**: Smooth bottom sheet / center modal with backdrop blur.
- **Site-Isolated Channels**: Notifications stay confined to the website that sent them.
- **Web Audio Chimes**: 4 synthesized sound alerts (`chime`, `coin`, `alert`, `success`).
- **Interactive Action Buttons**: Customizable system `[Close]` and `[Open ↗]` buttons.
- **Targeting Modes**: Broadcast to `"all"`, `"user:<id>"`, `"tag:<name>"`, or `"self"`.

---

## 🎨 Developer Customization

```javascript
// Configure brand logo, theme color, and audio preferences
WebPush.configure({
  icon: 'https://mywebsite.com/logo.png', // Fallback for all notifications
  theme: '#4f46e5',                       // Brand accent color
  sound: true                             // Web Audio chimes
});
```

---

## 🖥️ Live Services (Port 3050)

- **Test Simulator & Sender**: [https://web-push.shahil-codex.xyz/test/](https://web-push.shahil-codex.xyz/test/)
- **Admin Dashboard**: [https://web-push.shahil-codex.xyz/admin/](https://web-push.shahil-codex.xyz/admin/)
- **Client SDK Script**: [https://web-push.shahil-codex.xyz/sdk.js](https://web-push.shahil-codex.xyz/sdk.js)
- **API Documentation**: [https://web-push.shahil-codex.xyz/API_DOCS.md](https://web-push.shahil-codex.xyz/API_DOCS.md)
- **Contributing Guide**: [CONTRIBUTING.md](CONTRIBUTING.md)

---

## 👨‍💻 Contributor

- **Shahil Ali** — Lead Developer & Maintainer ([@Shahilali5](https://github.com/Shahilali5))

License: MIT
