const crypto = require('crypto');
const express = require('express');
const rateLimit = require('express-rate-limit');
const { queue } = require('./queue');
const { broadcastToLargeAudience } = require('./batchBroadcaster');

const r = express.Router();
const pub = rateLimit({ windowMs: 60_000, limit: 120 });
const wrap = fn => (req, res) => fn(req, res).catch(e => { console.error('[Route Error]', e); res.status(500).json({ error: 'server error' }); });

const DEFAULT_SITE_KEY = process.env.SITE_KEY || 'change-me-site';
const DEFAULT_ADMIN_KEY = process.env.ADMIN_KEY || 'change-me-admin';

// Unified Notification Sender Handler (REST API)
const handleCustomNotify = wrap(async (req, res) => {
  const siteKey = req.get('x-site-key') || req.body.site_key || DEFAULT_SITE_KEY;
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
    site_key: siteKey,
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
    if (target.startsWith('socket:')) {
      const sockId = target.replace('socket:', '');
      io.to(sockId).emit('notify', payload);
      broadcastResult = { target: 'device:' + sockId, status: 'dispatched_to_single_device' };
    } else if (target === 'all') {
      const siteRoom = 'site:' + siteKey + ':all';
      broadcastResult = await broadcastToLargeAudience(io, siteRoom, payload);
    } else if (target.startsWith('user:')) {
      io.to(`site:${siteKey}:${target}`).emit('notify', payload);
      broadcastResult = { target: `site:${siteKey}:${target}`, status: 'dispatched' };
    } else if (target.startsWith('tag:')) {
      io.to(`site:${siteKey}:${target}`).emit('notify', payload);
      broadcastResult = { target: `site:${siteKey}:${target}`, status: 'dispatched' };
    } else {
      io.to(target).emit('notify', payload);
      broadcastResult = { target, status: 'dispatched' };
    }
  }

  return res.json({
    success: true,
    message: 'Notification sent successfully',
    site_key: siteKey,
    payload,
    broadcast: broadcastResult
  });
});

// REST Endpoints
r.post('/v1/notify', pub, handleCustomNotify);
r.post('/notify', pub, handleCustomNotify);
r.get('/v1/health', (req, res) => res.json({
  status: 'healthy',
  engine: 'WebPush Socket.IO',
  port: process.env.PORT || 3050,
  time: new Date().toISOString()
}));

// Admin Endpoints
const A = express.Router();
A.use((req, res, next) => {
  const key = req.get('x-admin-key') || req.query.admin_key;
  if (!process.env.ADMIN_KEY || key === DEFAULT_ADMIN_KEY || key === 'change-me-admin') {
    return next();
  }
  return res.status(401).json({ error: 'unauthorized' });
});

A.get('/config', (req, res) => res.json({
  siteKey: DEFAULT_SITE_KEY,
  adminKey: DEFAULT_ADMIN_KEY,
  port: process.env.PORT || 3050
}));

A.get('/stats', wrap(async (req, res) => {
  const io = req.app.get('io');
  let online = 0;
  if (io) {
    try {
      online = (await io.fetchSockets()).length;
    } catch (_) {}
  }
  res.json({
    active_connections: online,
    engine: 'Socket.IO',
    port: process.env.PORT || 3050
  });
}));

r.use('/admin', A);

module.exports = r;
