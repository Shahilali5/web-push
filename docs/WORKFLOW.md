# Workflows

## 1. Subscribe + welcome notification
```mermaid
sequenceDiagram
  participant V as Visitor
  participant S as sdk.js
  participant A as API
  participant Q as Redis/BullMQ
  participant W as Worker
  participant F as FCM
  V->>S: Page loads (or clicks Enable)
  S->>A: GET /api/config
  S->>V: Notification.requestPermission()
  V-->>S: granted
  S->>F: getToken (VAPID + service worker)
  S->>A: POST /api/subscribe {token,user_id,tags}
  A->>Q: add job "welcome"
  Q->>W: welcome job
  W->>F: send welcome message
  F-->>V: "Thanks for subscribing…" (works even when site closed)
```

## 2. Send campaign (push / live / both)
```mermaid
sequenceDiagram
  participant D as Dashboard / Website backend
  participant A as API
  participant Q as Queue
  participant W as Worker
  participant F as FCM
  participant IO as Socket.IO
  D->>A: POST /api/admin/send
  A->>Q: job "campaign" (delayed if scheduled)
  Q->>W: dispatch
  W->>IO: emit "notify" to room (live/both)
  W->>Q: enqueue "batch" jobs (500 subscribers each)
  Q->>W: batch jobs (parallel workers)
  W->>F: sendEachForMulticast
  W->>W: deactivate dead tokens, log failures, update counters
  W->>IO: emit "progress" to /admin
```

## 3. Click tracking
Service worker `notificationclick` → `POST /api/click` → opens `url`. Live toasts do the same on click.

## 4. Adding to your website (checklist)
1. Deploy server + worker, HTTPS on, WebSocket proxy enabled.
2. Dashboard → Code Builder → configure.
3. Upload generated `firebase-messaging-sw.js` to site root.
4. Paste `<script>` embed tag before `</body>`.
5. Visit the site, allow notifications, confirm the welcome push arrives.
6. Add the PHP/curl trigger to backend events (order placed, payment success, etc.).

## 5. Troubleshooting
| Symptom | Check |
|---|---|
| No permission prompt | HTTPS? Already blocked in browser site settings? `data-auto="false"`? |
| Token error | SW file reachable at `/firebase-messaging-sw.js` on the same origin; VAPID key matches Firebase project |
| Welcome not received | Worker running? Redis reachable? Check worker logs |
| Live toast missing | `/socket.io/` proxied with upgrade headers; `SITE_KEY` correct |
| High failures | Expired tokens are normal; they are auto-deactivated |
