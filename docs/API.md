# API Reference

Base URL: `https://YOUR_PUSH_SERVER`
JSON in/out. Errors: `{ "error": "message" }` with 400/401/429/500.

## Auth
| Header | Used by | Notes |
|---|---|---|
| `x-site-key: <SITE_KEY>` | Public routes (browser) | Safe to expose in page source |
| `x-admin-key: <ADMIN_KEY>` | `/api/admin/*` | Server-side only |

---
## Public endpoints

### `GET /api/config`
Returns Firebase web config + VAPID key for the SDK.
```json
{ "firebase": { "apiKey": "...", "projectId": "..." }, "vapidKey": "..." }
```

### `POST /api/subscribe`
```json
{ "token": "FCM_TOKEN", "user_id": "42", "tags": ["vip", "hindi"] }
```
→ `{ "ok": true, "new": true }`. `new: true` means first time; a welcome push is queued.

### `POST /api/unsubscribe`
`{ "token": "FCM_TOKEN" }` → `{ "ok": true }`

### `POST /api/click`
`{ "campaign_id": 12 }` → `{ "ok": true }` (increments clicks)

---
## Admin endpoints (`x-admin-key`)

### `POST /api/admin/send`
| Field | Type | Notes |
|---|---|---|
| `title` | string, required | ≤ 200 chars |
| `body` | string, required | ≤ 500 chars |
| `url` | string | Opened on click |
| `icon`, `image` | string | Absolute URLs |
| `channel` | `push` \| `live` \| `both` | default `push` |
| `target` | string | `all`, `tag:<name>`, `user:<id>` |
| `scheduled_at` | ISO date | Optional; future time delays the campaign |

→ `{ "ok": true, "campaign_id": 12 }`

Examples
```bash
curl -X POST $BASE/api/admin/send -H "x-admin-key: $ADMIN" -H "Content-Type: application/json" \
 -d '{"title":"Order shipped","body":"Arrives tomorrow","url":"/orders/9","channel":"both","target":"user:42"}'
```
```php
$ch = curl_init("$base/api/admin/send");
curl_setopt_array($ch, [CURLOPT_POST=>1, CURLOPT_RETURNTRANSFER=>1,
  CURLOPT_HTTPHEADER=>['Content-Type: application/json','x-admin-key: '.$admin],
  CURLOPT_POSTFIELDS=>json_encode(['title'=>'Hi','body'=>'Hello','target'=>'all'])]);
echo curl_exec($ch);
```
```python
import requests
requests.post(f"{BASE}/api/admin/send", headers={"x-admin-key": ADMIN},
              json={"title": "Hi", "body": "Hello", "channel": "both"})
```

### `GET /api/admin/campaigns`
Latest 100: `id,title,body,channel,target,status,total,sent,failed,clicks,created_at`.
Status: `scheduled | queued | sending | done | cancelled`.

### `POST /api/admin/campaigns/:id/cancel`
Cancels scheduled/queued/sending campaigns. Batches already sent are not recalled.

### `GET /api/admin/stats`
```json
{ "total": 1200, "active": 1100, "new24h": 30, "campaigns": 8, "sent": 9000, "failed": 40, "clicks": 700,
  "queue": { "waiting": 0, "active": 1, "delayed": 2, "failed": 0 } }
```

### `GET /api/admin/subscribers`
Latest 200 subscribers (token not returned).

### `GET/POST/DELETE /api/admin/templates[/:id]`
`POST` body: `{ "name","title","body","icon","image","url" }`

### `GET /api/admin/config`
Firebase config, VAPID key and site key (used by the code builder).

---
## Socket.IO

| Namespace | Auth | Events |
|---|---|---|
| `/` (visitors) | `{ siteKey, user_id?, tags? }` | server → client: `notify` `{campaign_id,title,body,icon,image,url}` |
| `/admin` | `{ key: ADMIN_KEY }` | server → client: `online` (number), `progress` `{id,total,sent,failed,status}`, `subscriber` |

Rooms joined automatically: `all`, `user:<id>`, `tag:<name>`.

## SDK (browser)
```html
<script src="https://PUSH/sdk.js" data-site-key="KEY" data-user-id="42" data-tags="vip"
        data-toast="top-right" data-auto="false"></script>
<button onclick="WebPush.subscribe()">Enable notifications</button>
```
`WebPush.subscribe()` → Promise<boolean> · `WebPush.toast({title,body,url})` shows a manual toast.
