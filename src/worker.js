require('dotenv').config();
const path = require('path');
const admin = require('firebase-admin');
const { Worker } = require('bullmq');
const IORedis = require('ioredis');
const { Emitter } = require('@socket.io/redis-emitter');
const db = require('./db');
const { queue, connection } = require('./queue');
const { sqlFor, roomFor } = require('./targets');

admin.initializeApp({ credential: admin.credential.cert(require(path.resolve(process.env.FIREBASE_SERVICE_ACCOUNT))) });
const messaging = admin.messaging();
const emitter = new Emitter(new IORedis(process.env.REDIS_URL));
const BATCH = 500; // FCM multicast limit
const DEAD = ['messaging/registration-token-not-registered', 'messaging/invalid-registration-token'];

const dataOf = c => {
  const d = {
    campaign_id: String(c.id || 0), title: c.title || '', body: c.body || '',
    icon: c.icon || '', image: c.image || '', url: c.url || '/',
    site_key: String(process.env.SITE_KEY || '')
  };
  if (c.actions) d.actions = typeof c.actions === 'string' ? c.actions : JSON.stringify(c.actions);
  return d;
};
const adminEmit = (ev, p) => emitter.of('/admin').emit(ev, p);

async function dispatchCampaign(id) {
  const [[c]] = await db.query('SELECT * FROM campaigns WHERE id=?', [id]);
  if (!c || c.status === 'cancelled') return;
  await db.query("UPDATE campaigns SET status='sending' WHERE id=?", [id]);

  if (c.channel !== 'push') emitter.to(roomFor(c.target)).emit('notify', dataOf(c)); // live toast

  if (c.channel === 'live') {
    await db.query("UPDATE campaigns SET status='done' WHERE id=?", [id]);
    return adminEmit('progress', { id, status: 'done', total: 0, sent: 0, failed: 0 });
  }

  const [where, params] = sqlFor(c.target);
  const [[{ n }]] = await db.query(`SELECT COUNT(*) n FROM subscribers WHERE active=1${where}`, params);
  await db.query('UPDATE campaigns SET total=? WHERE id=?', [n, id]);
  if (!n) { await db.query("UPDATE campaigns SET status='done' WHERE id=?", [id]); return; }

  let last = 0;
  for (;;) {
    const [rows] = await db.query(
      `SELECT id FROM subscribers WHERE active=1 AND id>?${where} ORDER BY id LIMIT ${BATCH}`, [last, ...params]);
    if (!rows.length) break;
    last = rows[rows.length - 1].id;
    await queue.add('batch', { campaignId: id, ids: rows.map(r => r.id) });
  }
}

async function sendBatch({ campaignId, ids }) {
  const [[c]] = await db.query('SELECT * FROM campaigns WHERE id=?', [campaignId]);
  if (!c || c.status === 'cancelled') return;
  const [subs] = await db.query('SELECT id, token FROM subscribers WHERE id IN (?) AND active=1', [ids]);
  let ok = 0, bad = 0;
  if (subs.length) {
    const res = await messaging.sendEachForMulticast({
      tokens: subs.map(s => s.token), data: dataOf(c),
      webpush: { headers: { TTL: '86400', Urgency: 'high' } }
    });
    const dead = [], errs = [];
    res.responses.forEach((r, i) => {
      if (r.success) return ok++;
      bad++;
      const code = r.error && r.error.code;
      if (DEAD.includes(code)) dead.push(subs[i].id);
      errs.push([campaignId, subs[i].id, String(code).slice(0, 200)]);
    });
    if (dead.length) await db.query('UPDATE subscribers SET active=0 WHERE id IN (?)', [dead]);
    if (errs.length) await db.query('INSERT INTO send_errors (campaign_id, subscriber_id, error) VALUES ?', [errs]);
  }
  await db.query('UPDATE campaigns SET sent=sent+?, failed=failed+? WHERE id=?', [ok, bad, campaignId]);
  const [[u]] = await db.query('SELECT id,total,sent,failed,status FROM campaigns WHERE id=?', [campaignId]);
  if (u.sent + u.failed >= u.total) {
    await db.query("UPDATE campaigns SET status='done' WHERE id=? AND status<>'cancelled'", [campaignId]);
    u.status = 'done';
  }
  adminEmit('progress', u);
}

async function sendWelcome({ subscriberId }) {
  const [[s]] = await db.query('SELECT id, token FROM subscribers WHERE id=? AND active=1', [subscriberId]);
  if (!s) return;
  try {
    await messaging.send({
      token: s.token,
      data: dataOf({
        id: 0,
        title: process.env.WELCOME_TITLE || 'Thanks for Subscribing',
        body: process.env.WELCOME_BODY || 'You will receive updates even when the website is closed.',
        url: process.env.WELCOME_URL || '/',
        actions: [{ action: 'open', title: 'Open' }, { action: 'close', title: 'Close' }]
      }),
      webpush: { headers: { Urgency: 'high' } }
    });
    adminEmit('subscriber', { id: s.id });
  } catch (e) {
    if (DEAD.includes(e.code)) await db.query('UPDATE subscribers SET active=0 WHERE id=?', [s.id]);
  }
}

new Worker('push', async job => {
  if (job.name === 'campaign') return dispatchCampaign(job.data.id);
  if (job.name === 'batch') return sendBatch(job.data);
  if (job.name === 'welcome') return sendWelcome(job.data);
}, { connection, concurrency: +process.env.WORKER_CONCURRENCY || 5 })
  .on('failed', (j, e) => console.error('job failed', j && j.name, e.message));

console.log('push worker running');
