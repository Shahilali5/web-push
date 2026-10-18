<div align="center">

# 🔔 WebPush
### Open Source Real-Time Push Notification Engine using Socket.IO
**100% Self-Hosted • Zero Firebase • High-Concurrency 50k+ Batching • Fully Customizable**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-green.svg?style=for-the-badge&logo=node.js)](https://nodejs.org)
[![Socket.IO](https://img.shields.io/badge/Socket.IO-4.7%2B-black.svg?style=for-the-badge&logo=socket.io)](https://socket.io)
[![Bootstrap Icons](https://img.shields.io/badge/Bootstrap%20Icons-1.11.3-7952b3.svg?style=for-the-badge&logo=bootstrap)](https://icons.getbootstrap.com)
[![Port](https://img.shields.io/badge/Port-3050-orange.svg?style=for-the-badge)]()
[![Contributor](https://img.shields.io/badge/Contributor-shahilali5-6366f1.svg?style=for-the-badge&logo=github)](https://github.com/shahilali5)

<br/>

[🚀 Live Demo](https://web-push.shahil-codex.xyz/test/) • [Admin Dashboard](https://web-push.shahil-codex.xyz/admin/) • [REST API](#-rest-api-reference) • [Add to Your Project](#-how-to-add-webpush-to-your-own-project) • [Contributors](#-contributors)

</div>

---

## 📖 Overview

**WebPush** is an open-source, ultra-low latency push notification platform engineered entirely with **Socket.IO, Express, and standard Web Browser APIs**. It eliminates third-party dependencies such as Google Firebase, Apple APNs, or third-party cloud services, giving developers 100% ownership, privacy, and control over their notification infrastructure.

### ✨ Key Features
- 🚀 **Zero Firebase Required**: Completely independent self-hosted architecture.
- ⚡ **High Concurrency & Large User Handling**: Emits notifications in non-blocking batches of 500 across event-loop ticks (`setImmediate`/micro-delays) to smoothly broadcast to **10,000 to 1,000,000+ users** with 0% event-loop lag.
- 🔔 **Welcome Notification on Subscribe**: Automatically greets new users with:
  - **Title**: *"Thanks For Subscribing"*
  - **Description**: *"You Will Receive Updates Even When Website Is Closed"*
  - **Two Action Buttons**: `Close` (dismiss) and `Open` (navigate).
- 🎨 **Fully Customizable Buttons & Logos**: Define custom button labels, icons, button actions, logo avatars, banner images, and specific destination URLs.
- 💎 **Bootstrap Icons CDN**: Integrated with Bootstrap Icons (`bi bi-*`) for sleek modern visuals.
- 📱 **Dual Display Engine**:
  1. **Native OS Desktop Notifications** via Service Worker (`/sw.js`) with system action buttons.
  2. **In-Page Glassmorphic Toasts** with Web Audio API chime sounds.
- 🛠️ **Universal REST API (`/api/v1/notify`)**: One endpoint allows any backend (PHP, Python, Go, Node.js, Ruby, Java) to trigger customized notifications instantly.

---

## 🏗️ Architecture

```
[ Your Website / App ]
         │
         │  1. Connects via Socket.IO
         ▼
 ┌─────────────────────────────────────────────────────────┐
 │               WebPush Server (Port 3050)                │
 │  - Express REST API (/api/v1/notify)                    │
 │  - High-Concurrency Batch Broadcaster (500 chunk/tick)  │
 │  - Socket.IO Real-time Connection Pool                 │
 │  - Standalone Mode (or optional Redis adapter)          │
 └────────────────────────────┬────────────────────────────┘
                              │
               2. Emits Notification Payload
                              │
                              ▼
    ┌─────────────────────────────────────────────────┐
    │              Client Browser SDK                 │
    │  - Native Service Worker (/sw.js)               │
    │  - OS Desktop Notification Banner               │
    │  - Glassmorphic In-Page Toast + Audio Chime     │
    │  - Dynamic Action Buttons: [Close] & [Open]     │
    └─────────────────────────────────────────────────┘
```

---

## ⚡ Quick Start (Port 3050)

### 1. One-Click Install Script
Run the automated installation script:
```bash
chmod +x install.sh
./install.sh
```

### 2. Manual Setup
```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env

# 3. Start the server (Port 3050)
node server.js
```

### 3. Live Endpoints
- **🧪 Interactive Test Web Lab:** [https://web-push.shahil-codex.xyz/test/](https://web-push.shahil-codex.xyz/test/)
- **🔔 Admin Dashboard:** [https://web-push.shahil-codex.xyz/admin/](https://web-push.shahil-codex.xyz/admin/)
- **📦 Client SDK File:** [https://web-push.shahil-codex.xyz/sdk.js](https://web-push.shahil-codex.xyz/sdk.js)

---

## 🚀 How to Add WebPush to Your Own Project

Integrating WebPush into any existing website takes less than 60 seconds:

### Step 1: Add the SDK to your Website
Paste this tag before `</body>` on your site:
```html
<!-- Bootstrap Icons CDN (Optional but recommended) -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css">

<!-- WebPush Client SDK -->
<script src="https://web-push.shahil-codex.xyz/sdk.js"
        data-site-key="change-me-site"
        data-toast="top-right"
        data-auto="false"
        data-sw="/sw.js"></script>
```

### Step 2: Trigger Permission on Button Click
```html
<button onclick="WebPush.subscribe()">
  <i class="bi bi-bell-fill"></i> Enable Notifications
</button>
```

### Step 3: Copy Service Worker
Place [`public/sw.js`](public/sw.js) into your website's root directory:
```bash
cp public/sw.js /path/to/your/website/sw.js
```

---

## 📡 REST API Reference

You can send notifications from **any programming language** or server by calling `POST /api/v1/notify`:

### Endpoint
`POST https://web-push.shahil-codex.xyz/api/v1/notify`
*(Or `http://localhost:3050/api/v1/notify` for local development)*

### Headers
```http
Content-Type: application/json
```

### Request Payload (Fully Customizable)
```json
{
  "title": "Special Deal Unlocked! 🎉",
  "body": "Get 40% discount on your order today only. Tap to claim!",
  "url": "https://yoursite.com/deals",
  "icon": "https://yoursite.com/logo.png",
  "image": "https://yoursite.com/banner.jpg",
  "target": "all",
  "buttons": [
    {
      "action": "close",
      "title": "Dismiss",
      "type": "secondary",
      "icon": "bi-x-lg"
    },
    {
      "action": "open",
      "title": "Claim Offer ↗",
      "url": "https://yoursite.com/deals",
      "type": "primary",
      "icon": "bi-bag-check-fill"
    }
  ]
}
```

### Code Snippets for Backends

#### cURL
```bash
curl -X POST http://localhost:3050/api/v1/notify \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Order Shipped 📦",
    "body": "Your order #8291 is on its way!",
    "url": "/orders/8291",
    "target": "all",
    "buttons": [
      { "action": "close", "title": "Later" },
      { "action": "open", "title": "Track Package", "url": "/track/8291" }
    ]
  }'
```

#### Node.js / Express
```javascript
const axios = require('axios');

await axios.post('http://localhost:3050/api/v1/notify', {
  title: 'New Message Received',
  body: 'Alex sent you a message.',
  url: '/chat/alex',
  buttons: [
    { action: 'close', title: 'Ignore' },
    { action: 'open', title: 'Reply Now', url: '/chat/alex' }
  ]
});
```

#### PHP
```php
<?php
$data = [
    'title' => 'Invoice Ready',
    'body'  => 'Your invoice #104 has been generated.',
    'url'   => '/invoices/104',
    'buttons' => [
        ['action' => 'close', 'title' => 'Dismiss'],
        ['action' => 'open', 'title' => 'Pay Now', 'url' => '/pay/104']
    ]
];

$ch = curl_init('http://localhost:3050/api/v1/notify');
curl_setopt_array($ch, [
    CURLOPT_POST => true,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
    CURLOPT_POSTFIELDS => json_encode($data)
]);
$response = curl_exec($ch);
curl_close($ch);
?>
```

---

## 👥 Contributors

This open-source project is created and maintained by:

<table align="center">
  <tr>
    <td align="center">
      <a href="https://github.com/shahilali5">
        <img src="https://github.com/shahilali5.png" width="120px;" style="border-radius:50%;" alt="Shahil Ali"/>
        <br />
        <sub><b>Shahil Ali</b></sub>
      </a>
      <br />
      <sub>🚀 Lead Creator & Core Maintainer</sub>
      <br />
      <a href="https://github.com/shahilali5">
        <img src="https://img.shields.io/badge/GitHub-shahilali5-6366f1?style=flat&logo=github" alt="GitHub Profile" />
      </a>
    </td>
  </tr>
</table>

### 🤝 Contributing
Contributions, issues, and feature requests are welcome!
Feel free to check the [issues page](https://github.com/Shahilali5/web-push/issues).

---

## 🚢 Git Push Instructions

To push updates directly to GitHub:
- **Linux / macOS / Git Bash:**
  ```bash
  chmod +x push.sh
  ./push.sh "your commit message"
  ```
- **Windows:**
  Double-click `push.bat` or run:
  ```cmd
  push.bat "your commit message"
  ```

---

## 📄 License

Distributed under the **MIT License**. See `LICENSE` for more information.
