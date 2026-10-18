# PRD — Web Push + Live Notification Platform

**Version:** 1.0 · **Status:** Ready for build

## 1. Problem
The website needs to reach users when they are away (push) and while they are on the site (live), with a way for the owner to compose, target, schedule and track notifications, and an easy way to add it all to the site.

## 2. Goals
- Browser push via Firebase Cloud Messaging (FCM), including when the site is closed.
- Real-time in-page notifications via Socket.IO.
- Handle large subscriber counts through a queue + worker design.
- Admin dashboard: send, schedule, track, manage templates and subscribers.
- Code builder that outputs copy-paste snippets (embed tag, service worker, server-side trigger).
- Simple HTTP API so the website backend can trigger notifications.

## 3. Non-goals (v1)
Mobile native push, email/SMS, A/B testing, multi-tenant accounts, per-admin roles.

## 4. Users
| User | Need |
|---|---|
| Visitor | Opt in once, get relevant updates, click through to the site |
| Site owner/admin | Send/schedule campaigns, see delivery + click stats |
| Website backend | Trigger notifications from events (order, payment, etc.) |

## 5. Functional requirements
| ID | Requirement | Priority |
|---|---|---|
| F1 | Visitor can grant permission; FCM token stored with optional `user_id` and `tags` | P0 |
| F2 | Welcome push sent automatically on first subscribe | P0 |
| F3 | Send campaign to all, by tag, or by user ID | P0 |
| F4 | Channels: `push`, `live`, `both` | P0 |
| F5 | Queue + worker, 500-token batches, retry with backoff | P0 |
| F6 | Auto-deactivate invalid/expired tokens | P0 |
| F7 | Scheduled campaigns and cancellation | P1 |
| F8 | Live toast in page via Socket.IO rooms (`all`, `tag:*`, `user:*`) | P0 |
| F9 | Dashboard: stats, live activity feed, online count, campaign progress | P0 |
| F10 | Templates: save/reuse notification content | P1 |
| F11 | Click tracking and CTR | P1 |
| F12 | Code builder (embed, service worker, PHP trigger) | P0 |
| F13 | Admin API for server-to-server sending | P0 |
| F14 | Unsubscribe endpoint | P1 |
| F15 | Rate limiting on public endpoints | P1 |

## 6. Non-functional requirements
- **Scale:** 1M subscribers → ~2,000 batch jobs; horizontally scalable workers.
- **Latency:** campaign dispatch starts < 5 s after submit; live toast < 1 s.
- **Reliability:** 3 retries, exponential backoff; failures logged per subscriber.
- **Security:** HTTPS only; separate `SITE_KEY` (public) and `ADMIN_KEY` (secret); admin Socket.IO namespace requires key; input length limits.
- **Privacy:** store only token, optional user ID/tags, browser string; honor unsubscribe.

## 7. Architecture
```
Website ──sdk.js──► API (Express) ──► MySQL
   │                   │  ▲
   │ Socket.IO         ▼  │ progress/emit
   └──────────────► Redis (BullMQ + Socket.IO adapter)
                       │
                       ▼
                    Worker ──► FCM ──► Browser service worker
```

## 8. Data model
`subscribers`, `campaigns`, `send_errors`, `templates` (see `schema.sql`).

## 9. Success metrics
Opt-in rate, delivery rate (`sent / total`), CTR (`clicks / sent`), token churn, p95 dispatch time.

## 10. Risks
| Risk | Mitigation |
|---|---|
| Users deny permission if prompted instantly | Builder option to prompt on a button instead of auto |
| Expired tokens inflate failures | Auto-deactivate on FCM error codes |
| Spam complaints | Segmenting by tag, unsubscribe endpoint, frequency control in v2 |
| Service worker on wrong origin | Builder instructions: file must live in site root |

## 11. Roadmap
v1.1 per-admin login, delivery charts, UTM auto-tagging · v1.2 frequency caps, A/B tests · v2 multi-site, topics, mobile push.
