const crypto = require('crypto');
const express = require('express');
const rateLimit = require('express-rate-limit');
const db = require('./db');
const { queue } = require('./queue');

const r = express.Router();
const sha = t => crypto.createHash('sha1').update(t).digest('hex');
const siteAuth = (req, res, next) =>
  req.get('x-site-key') === process.env.SITE_KEY ? next() : res.status(401).json({ error: 'bad site key' });
const adminAuth = (req, res, next) =>
  req.get('x-admin-key') === process.env.ADMIN_KEY ? next() : res.status(401).json({ error: 'bad admin key' });
const pub = rateLimit({ windowMs: 60_000, limit: 60 });
const wrap = fn => (req, res) => fn(req, res).catch(e => { console.error(e); res.status(500).json({ error: 'server error' }); });

/* ---------- public (website) ---------- */
r.get('/config', pub, siteAuth, (req, res) =>
  res.json({ firebase: JSON.parse(process.env.FIREBASE_WEB_CONFIG), vapidKey: process.env.VAPID_KEY }));

r.post('/subscribe', pub, siteAuth, wrap(async (req, res) => {
  const { token, user_id = null, tags = [] } = req.body || {};
  if (!token) return res.status(400).json({ error: 'token required' });
  const [out] = await db.query(
    `INSERT INTO subscribers (token, token_hash, user_id, tags, browser, active) VALUES (?,?,?,?,?,1)
     ON DUPLICATE KEY UPDATE user_id=VALUES(user_id), tags=VALUES(tags), active=1, last_seen=NOW()`,
    [token, sha(token), user_id, JSON.stringify(tags), (req.get('user-agent') || '').slice(0, 60)]);
  const isNew = out.affectedRows === 1; // 1 = inserted, 2 = updated
  if (isNew) await queue.add('welcome', { subscriberId: out.insertId });
  res.json({ ok: true, new: isNew });
}));

r.post('/unsubscribe', pub, siteAuth, wrap(async (req, res) => {
  await db.query('UPDATE subscribers SET active=0 WHERE token_hash=?', [sha((req.body && req.body.token) || '')]);
  res.json({ ok: true });
}));

r.post('/click', pub, siteAuth, wrap(async (req, res) => {
  const id = +(req.body && req.body.campaign_id);
  if (id) await db.query('UPDATE campaigns SET clicks=clicks+1 WHERE id=?', [id]);
  res.json({ ok: true });
}));

/* ---------- Universal Customizable API for Project Integration ---------- */
const { broadcastToLargeAudience } = require('./batchBroadcaster');

const handleCustomNotify = wrap(async (req, res) => {
  const {
    title,
    body,
    icon,
    image,
    url = '/',
    target = 'all',
    buttons,
    actions,
    badge,
    data = {}
  } = req.body || {};

  if (!title || !body) {
    return res.status(400).json({ error: 'title and body are required' });
  }

  const formattedButtons = Array.isArray(buttons)
    ? buttons
    : (Array.isArray(actions)
      ? actions
      : [
          { action: 'close', title: 'Close', type: 'secondary' },
          { action: 'open', title: 'Open', url: url, type: 'primary' }
        ]);

  const payload = {
    campaign_id: String(Date.now()),
    title,
    body,
    icon: icon || '/test/bell.svg',
    image: image || null,
    url,
    target,
    buttons: formattedButtons,
    actions: formattedButtons.map(b => ({ action: b.action, title: b.title })),
    badge: badge || '/test/bell.svg',
    data,
    created_at: new Date().toISOString()
  };

  const io = req.app.get('io');
  let broadcastResult = null;

  if (io) {
    if (target === 'all') {
      broadcastResult = await broadcastToLargeAudience(io, 'all', payload);
    } else {
      io.to(target).emit('notify', payload);
      broadcastResult = { target, status: 'dispatched' };
    }
  }

  // Attempt database logging if MySQL is active
  try {
    if (db && db.query) {
      await db.query(
        'INSERT INTO campaigns (title,body,icon,image,url,channel,target,status) VALUES (?,?,?,?,?,?,?,?)',
        [title, body, icon || null, image || null, url, 'live', target, 'done']
      ).catch(() => {});
    }
  } catch (_) {}

  return res.json({
    success: true,
    message: 'Notification dispatched successfully',
    payload,
    broadcast: broadcastResult
  });
});

r.post('/v1/notify', pub, handleCustomNotify);
r.post('/notify', pub, handleCustomNotify);
r.get('/v1/health', (req, res) => res.json({ status: 'ok', engine: 'Socket.IO WebPush', port: process.env.PORT || 3050 }));

/* ---------- admin / server-to-server ---------- */
const A = express.Router();
A.use(adminAuth);

A.get('/config', (req, res) =>
  res.json({ firebase: JSON.parse(process.env.FIREBASE_WEB_CONFIG), vapidKey: process.env.VAPID_KEY, siteKey: process.env.SITE_KEY }));

A.post('/send', wrap(async (req, res) => {
  const { title, body, icon, image, url, channel = 'push', target = 'all', scheduled_at } = req.body || {};
  if (!title || !body) return res.status(400).json({ error: 'title and body required' });
  if (!['push', 'live', 'both'].includes(channel)) return res.status(400).json({ error: 'bad channel' });
  const when = scheduled_at ? new Date(scheduled_at) : null;
  const delay = when ? Math.max(0, when - Date.now()) : 0;
  const [out] = await db.query(
    'INSERT INTO campaigns (title,body,icon,image,url,channel,target,status,scheduled_at) VALUES (?,?,?,?,?,?,?,?,?)',
    [title, body, icon || null, image || null, url || null, channel, target, delay ? 'scheduled' : 'queued', when]);
  await queue.add('campaign', { id: out.insertId }, { delay, jobId: 'campaign-' + out.insertId });
  res.json({ ok: true, campaign_id: out.insertId });
}));

A.get('/campaigns', wrap(async (req, res) => res.json((await db.query('SELECT * FROM campaigns ORDER BY id DESC LIMIT 100'))[0])));

A.post('/campaigns/:id/cancel', wrap(async (req, res) => {
  await db.query("UPDATE campaigns SET status='cancelled' WHERE id=? AND status IN ('scheduled','queued','sending')", [req.params.id]);
  const job = await queue.getJob('campaign-' + req.params.id);
  if (job) await job.remove().catch(() => {});
  res.json({ ok: true });
}));

A.get('/stats', wrap(async (req, res) => {
  const [[s]] = await db.query(`SELECT COUNT(*) total, COALESCE(SUM(active=1),0) active,
    COALESCE(SUM(created_at > NOW() - INTERVAL 1 DAY),0) new24h FROM subscribers`);
  const [[c]] = await db.query('SELECT COUNT(*) campaigns, COALESCE(SUM(sent),0) sent, COALESCE(SUM(failed),0) failed, COALESCE(SUM(clicks),0) clicks FROM campaigns');
  res.json({ ...s, ...c, queue: await queue.getJobCounts('waiting', 'active', 'delayed', 'failed') });
}));

A.get('/subscribers', wrap(async (req, res) =>
  res.json((await db.query('SELECT id,user_id,tags,browser,active,created_at,last_seen FROM subscribers ORDER BY id DESC LIMIT 200'))[0])));

A.get('/templates', wrap(async (req, res) => res.json((await db.query('SELECT * FROM templates ORDER BY id DESC'))[0])));
A.post('/templates', wrap(async (req, res) => {
  const t = req.body || {};
  const [o] = await db.query('INSERT INTO templates (name,title,body,icon,image,url) VALUES (?,?,?,?,?,?)',
    [t.name, t.title, t.body, t.icon || null, t.image || null, t.url || null]);
  res.json({ ok: true, id: o.insertId });
}));
A.delete('/templates/:id', wrap(async (req, res) => { await db.query('DELETE FROM templates WHERE id=?', [req.params.id]); res.json({ ok: true }); }));

r.use('/admin', A);
module.exports = r;
