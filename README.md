# WebPush

Self-hosted, real-time push notification engine built with **Socket.IO and Express**. Zero Firebase or third-party cloud required.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-green.svg)](https://nodejs.org)
[![Port](https://img.shields.io/badge/Port-3050-orange.svg)]()
[![Lead Contributor](https://img.shields.io/badge/Lead%20Contributor-Shahil%20Ali-6366f1.svg)](https://github.com/Shahilali5)

---

## Features

- **No Cloud Dependencies**: Runs entirely on your own server.
- **High Concurrency**: Broadcasts in non-blocking chunks (500 sockets per event loop tick) for 100k+ concurrent connections without lag.
- **Universal REST API**: Send notifications from any backend (PHP, Python, Node.js, Go) using `POST /api/v1/notify`.
- **Top 5 Built-in Capabilities**:
  1. **1-Line CDN Integration**: `<script src="https://web-push.shahil-codex.xyz/sdk.js"></script>`
  2. **Dual Display**: Native OS desktop/mobile notifications via Service Worker + In-page glassmorphic toasts.
  3. **Interactive Action Buttons**: Fully customizable `[Close]` and `[Open ↗]` buttons with URLs.
  4. **Notification Center (Inbox)**: Built-in floating bell widget with unread badge and history storage.
  5. **Web Audio Synthesizer**: Clean chime alerts generated natively via Web Audio API (no MP3 files needed).

---

## Quick Start (Port 3050)

### 1. Automated Setup
```bash
git clone https://github.com/Shahilali5/web-push.git
cd web-push
chmod +x install.sh
./install.sh
```

### 2. Manual Start
```bash
npm install
node server.js
```

Server runs on: `http://localhost:3050`  
Live Demo: [https://web-push.shahil-codex.xyz/test/](https://web-push.shahil-codex.xyz/test/)  
Admin Panel: [https://web-push.shahil-codex.xyz/admin/](https://web-push.shahil-codex.xyz/admin/)  
API Documentation: [https://web-push.shahil-codex.xyz/API_DOCS.md](https://web-push.shahil-codex.xyz/API_DOCS.md)

---

## 1-Minute Client Integration

Add this single tag to any HTML page:

```html
<script 
  src="https://web-push.shahil-codex.xyz/sdk.js" 
  data-site-key="change-me-site"
  data-widget="true">
</script>
```

### Triggering via JavaScript:
```javascript
// Request permission & subscribe
WebPush.subscribe();

// Play audio chime
WebPush.playSound('chime'); // 'chime' | 'coin' | 'alert' | 'success'

// Open the notification inbox drawer
WebPush.openInbox();
```

---

## Trigger Notification (REST API)

Send a POST request from any language:

```bash
curl -X POST https://web-push.shahil-codex.xyz/api/v1/notify \
  -H "Content-Type: application/json" \
  -H "x-site-key: change-me-site" \
  -d '{
    "title": "Welcome to WebPush!",
    "body": "Stay updated even after leaving our page.",
    "url": "https://yourwebsite.com",
    "icon": "https://web-push.shahil-codex.xyz/test/bell.svg",
    "target": "all",
    "buttons": [
      { "action": "close", "title": "Dismiss", "type": "secondary" },
      { "action": "open", "title": "Open Deal ↗", "url": "https://yourwebsite.com/deal", "type": "primary" }
    ]
  }'
```

---

## Target Visitors

| Target Value | Description |
|---|---|
| `"all"` | Broadcast to all online visitors |
| `"user:<id>"` | Target a specific logged-in user |
| `"socket:<id>"` | Target a single connected browser session |
| `"tag:<name>"` | Target users subscribed to a specific tag |

---

## Production Deployment (Nginx & SSL)

For Ubuntu / Debian servers:
```bash
sudo bash setup-https.sh
```
This automatically obtains a Let's Encrypt SSL certificate and configures Nginx reverse proxy on port 3050.

---

## Project Structure

```
├── server.js              # Express + Socket.IO server (Port 3050)
├── src/
│   ├── batchBroadcaster.js # 500-chunk non-blocking broadcaster
│   ├── routes.js          # REST API endpoints
│   └── queue.js           # BullMQ queue with standalone fallback
├── public/
│   ├── sdk.js             # Standalone client SDK + Inbox + Audio
│   ├── sw.js              # Native Service Worker
│   ├── test/index.html    # Interactive Developer Test Lab
│   └── admin/index.html   # Admin broadcast dashboard
├── API_DOCS.md            # Complete API & schema documentation
└── setup-https.sh         # Nginx + SSL automated setup
```

---

## Contributor

- **Shahil Ali** — Lead Developer & Maintainer ([@Shahilali5](https://github.com/Shahilali5))

## License

MIT License. Free for personal and commercial use.
