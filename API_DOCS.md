# WebPush API Reference

Base Production URL: `https://web-push.shahil-codex.xyz`  
Base Local URL: `http://localhost:3050`  
Lead Contributor: **Shahil Ali** ([@Shahilali5](https://github.com/Shahilali5))

---

## Headers

| Header | Required | Description |
|---|---|---|
| `Content-Type` | Yes | Always `application/json` |
| `x-site-key` | Yes | Site identification key. Default: `change-me-site` |
| `x-admin-key` | For Admin | Required for `/api/admin/*`. Default: `change-me-admin` |

---

## 1. Send Notification (`POST /api/v1/notify`)

Alias: `POST /api/notify`

### Request Body

```json
{
  "title": "New Update Available",
  "body": "Check out the latest features in version 2.0.",
  "url": "https://yoursite.com/update",
  "icon": "https://web-push.shahil-codex.xyz/test/bell.svg",
  "image": "https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=600",
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
      "title": "View Update ↗",
      "url": "https://yoursite.com/update",
      "type": "primary",
      "icon": "bi-arrow-up-right-square"
    }
  ]
}
```

### Parameter Reference

- `title` *(string, required)*: Notification title.
- `body` *(string, required)*: Notification text description.
- `url` *(string, optional)*: URL to open when clicking the notification body. Defaults to `/`.
- `icon` *(string, optional)*: URL for the logo/icon.
- `image` *(string, optional)*: Full-width hero banner image.
- `target` *(string, optional)*: 
  - `"all"`: Broadcast to all connected clients.
  - `"socket:<id>"`: Target a single connected socket (e.g. self-test).
  - `"user:<id>"`: Target a specific logged-in user.
  - `"tag:<name>"`: Target users with a specific tag.
- `buttons` *(array, optional)*: Up to 2 action buttons. Each button object supports:
  - `action`: `'close'` or `'open'`.
  - `title`: Button label text.
  - `url`: Optional specific URL for this button.
  - `type`: `'primary'` or `'secondary'`.

### Response
```json
{
  "success": true,
  "queued": true,
  "mode": "standalone_direct",
  "delivered": 42
}
```

---

## 2. Health & Status (`GET /api/v1/health`)

```bash
curl https://web-push.shahil-codex.xyz/api/v1/health
```

### Response
```json
{
  "status": "healthy",
  "port": 3050,
  "uptime": 1845,
  "connections": 12,
  "redis_enabled": false
}
```

---

## 3. Client JavaScript SDK API

Include the CDN script:
```html
<script src="https://web-push.shahil-codex.xyz/sdk.js" data-site-key="change-me-site"></script>
```

### Available Methods

| Method | Parameters | Description |
|---|---|---|
| `WebPush.subscribe()` | none | Prompts user for browser notification permission |
| `WebPush.showNotification(payload)` | `object` | Displays dual OS notification + toast |
| `WebPush.playSound(preset)` | `'chime'` \| `'coin'` \| `'alert'` \| `'success'` | Synthesizes an audio alert |
| `WebPush.openInbox()` | none | Opens the smooth half-screen notification drawer modal |
| `WebPush.closeInbox()` | none | Closes the notification drawer modal |
| `WebPush.clearInbox()` | none | Clears stored notification history |
| `WebPush.send(payload)` | `object` | Sends push notification directly from frontend JS |
| `WebPush.getSocket()` | none | Returns active Socket.IO connection instance |

---

## 4. Code Examples

### Node.js
```javascript
const axios = require('axios');

await axios.post('https://web-push.shahil-codex.xyz/api/v1/notify', {
  title: 'Order Shipped!',
  body: 'Your package is on its way.',
  url: 'https://myshop.com/track/1234',
  buttons: [
    { action: 'close', title: 'Close' },
    { action: 'open', title: 'Track Order', url: 'https://myshop.com/track/1234' }
  ]
}, {
  headers: { 'x-site-key': 'change-me-site' }
});
```

### Python
```python
import requests

requests.post('https://web-push.shahil-codex.xyz/api/v1/notify', json={
    'title': 'Server Alert',
    'body': 'CPU usage exceeded 85%.',
    'url': '/metrics',
    'buttons': [
        {'action': 'close', 'title': 'Dismiss'},
        {'action': 'open', 'title': 'View Dashboard', 'url': '/metrics'}
    ]
}, headers={'x-site-key': 'change-me-site'})
```

### PHP
```php
<?php
$data = [
    'title' => 'Invoice Ready',
    'body'  => 'Your invoice #8921 is available for download.',
    'url'   => 'https://example.com/invoice/8921',
    'buttons' => [
        ['action' => 'close', 'title' => 'Dismiss'],
        ['action' => 'open',  'title' => 'Download PDF', 'url' => 'https://example.com/invoice/8921.pdf']
    ]
];

$ch = curl_init('https://web-push.shahil-codex.xyz/api/v1/notify');
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Content-Type: application/json',
    'x-site-key: change-me-site'
]);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
$result = curl_exec($ch);
curl_close($ch);
```

### cURL
```bash
curl -X POST https://web-push.shahil-codex.xyz/api/v1/notify \
  -H "Content-Type: application/json" \
  -H "x-site-key: change-me-site" \
  -d '{
    "title": "Welcome!",
    "body": "Thanks for testing WebPush.",
    "url": "https://web-push.shahil-codex.xyz"
  }'
```
