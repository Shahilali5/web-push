require('dotenv').config();
const http = require('http');
const path = require('path');
const express = require('express');
const cors = require('cors');
const IORedis = require('ioredis');
const { Server } = require('socket.io');
const { createAdapter } = require('@socket.io/redis-adapter');

const app = express();
app.use(cors());
app.use(express.json({ limit: '100kb' }));
app.use('/api', require('./src/routes'));
app.get('/sdk.js', (req, res) => res.sendFile(path.join(__dirname, 'public/sdk.js')));
app.get('/sw.js', (req, res) => res.sendFile(path.join(__dirname, 'public/sw.js')));
app.get('/robots.txt', (req, res) => res.sendFile(path.join(__dirname, 'public/robots.txt')));
app.get('/sitemap.xml', (req, res) => {
  res.header('Content-Type', 'application/xml');
  res.sendFile(path.join(__dirname, 'public/sitemap.xml'));
});
app.get('/API_DOCS.md', (req, res) => res.sendFile(path.join(__dirname, 'API_DOCS.md')));
app.use('/admin', express.static(path.join(__dirname, 'public/admin')));
app.use('/test', express.static(path.join(__dirname, 'public/test')));
app.get('/', (req, res) => res.redirect('/test/'));

const { broadcastToLargeAudience } = require('./src/batchBroadcaster');

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: true, credentials: true },
  pingTimeout: 60000,
  pingInterval: 25000,
  perMessageDeflate: false,
  httpCompression: false,
  maxHttpBufferSize: 1e6
});
app.set('io', io);

// Redis Adapter (Optional: graceful fallback to in-memory)
if (process.env.ENABLE_REDIS === 'true' && process.env.REDIS_URL) {
  try {
    const pubClient = new IORedis(process.env.REDIS_URL, {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      retryStrategy: times => (times > 1 ? null : 100)
    });
    const subClient = pubClient.duplicate();

    pubClient.on('error', () => {});
    subClient.on('error', () => {});

    pubClient.connect().then(() => subClient.connect()).then(() => {
      io.adapter(createAdapter(pubClient, subClient));
      console.log('✓ Socket.IO Redis adapter connected');
    }).catch(() => {
      try { pubClient.disconnect(); subClient.disconnect(); } catch (_) {}
      console.log('✓ Running in standalone in-memory Socket.IO mode (Port 3050)');
    });
  } catch (e) {
    console.log('✓ Running in standalone in-memory Socket.IO mode (Port 3050)');
  }
} else {
  console.log('✓ Running in standalone in-memory Socket.IO mode (Port 3050)');
}

// Global visitor authentication and room segregation
const DEFAULT_SITE_KEY = process.env.SITE_KEY || 'change-me-site';
const ADMIN_KEY = process.env.ADMIN_KEY || 'change-me-admin';

io.use((socket, next) => {
  const auth = socket.handshake.auth || {};
  const siteKey = auth.siteKey || socket.handshake.query.siteKey || DEFAULT_SITE_KEY;
  socket.siteKey = siteKey;
  return next();
});

io.on('connection', socket => {
  const { user_id, tags, role } = socket.handshake.auth || {};
  const siteKey = socket.siteKey || DEFAULT_SITE_KEY;

  // 1. Join site-isolated room so notifications only go to users on the same website
  socket.join('site:' + siteKey);

  // 2. Global room for all users on this site
  socket.join('site:' + siteKey + ':all');

  // 3. User & Tag targeting within the site
  if (user_id) socket.join(`site:${siteKey}:user:${user_id}`);
  (Array.isArray(tags) ? tags : []).forEach(t => socket.join(`site:${siteKey}:tag:${t}`));

  // 4. Client welcome subscription
  socket.on('client_subscribe', data => {
    socket.emit('notify', {
      campaign_id: 'welcome',
      title: process.env.WELCOME_TITLE || 'Thanks For Subscribing',
      body: process.env.WELCOME_BODY || 'You Will Receive Updates Even When Website Is Closed',
      url: process.env.WELCOME_URL || '/',
      icon: '/test/bell.svg',
      site_key: siteKey,
      buttons: [
        { action: 'close', title: 'Close', type: 'secondary' },
        { action: 'open', title: 'Open', url: process.env.WELCOME_URL || '/', type: 'primary' }
      ]
    });
  });

  // 5. Send notification directly from WebSocket client (SDK or Dashboard)
  socket.on('send_notification', async (payload, callback) => {
    try {
      const target = payload && payload.target ? payload.target : 'all';
      const targetSiteKey = payload.site_key || siteKey;

      const formattedButtons = Array.isArray(payload.buttons)
        ? payload.buttons
        : (Array.isArray(payload.actions)
          ? payload.actions
          : [
              { action: 'close', title: 'Close', type: 'secondary' },
              { action: 'open', title: 'Open', url: payload.url || '/', type: 'primary' }
            ]);

      const notificationData = {
        campaign_id: payload.campaign_id || 'ws-' + Date.now(),
        title: payload.title || 'Notification',
        body: payload.body || 'New message received',
        url: payload.url || '/',
        icon: payload.icon || '/test/bell.svg',
        image: payload.image || null,
        site_key: targetSiteKey,
        buttons: formattedButtons,
        actions: formattedButtons.map(b => ({ action: b.action, title: b.title })),
        badge: payload.badge || '/test/bell.svg',
        data: payload.data || {},
        created_at: new Date().toISOString()
      };

      let result = null;

      // Safe isolated device testing
      if (target.startsWith('socket:')) {
        const sockId = target.replace('socket:', '');
        io.to(sockId).emit('notify', notificationData);
        result = { success: true, target: 'socket:' + sockId, mode: 'direct_socket' };
      } else if (target === 'self') {
        socket.emit('notify', notificationData);
        result = { success: true, target: 'self', mode: 'direct_socket' };
      } else if (target === 'all') {
        // High-concurrency chunked broadcast isolated to the sender's site
        const siteRoom = 'site:' + targetSiteKey + ':all';
        result = await broadcastToLargeAudience(io, siteRoom, notificationData, {
          batchSize: 500,
          batchDelayMs: 5,
          onProgress: prog => {
            socket.emit('broadcast_progress', prog);
            adminNs.emit('broadcast_progress', prog);
          }
        });
        result = { success: true, ...result };
      } else if (target.startsWith('user:')) {
        io.to(`site:${targetSiteKey}:${target}`).emit('notify', notificationData);
        result = { success: true, target: `site:${targetSiteKey}:${target}` };
      } else if (target.startsWith('tag:')) {
        io.to(`site:${targetSiteKey}:${target}`).emit('notify', notificationData);
        result = { success: true, target: `site:${targetSiteKey}:${target}` };
      } else {
        io.to(target).emit('notify', notificationData);
        result = { success: true, target };
      }

      if (typeof callback === 'function') callback(result);
      socket.emit('send_notification_response', result);
    } catch (err) {
      const errRes = { success: false, error: err.message };
      if (typeof callback === 'function') callback(errRes);
      socket.emit('send_notification_response', errRes);
    }
  });
});

// Admin dashboard namespace
const adminNs = io.of('/admin');
adminNs.use((socket, next) => {
  const key = socket.handshake.auth && socket.handshake.auth.key;
  if (!process.env.ADMIN_KEY || key === ADMIN_KEY || key === 'change-me-admin') {
    return next();
  }
  return next(new Error('unauthorized'));
});

setInterval(async () => {
  try {
    const totalOnline = (await io.fetchSockets()).length;
    adminNs.emit('online', totalOnline);
  } catch (_) {}
}, 5000);

const PORT = process.env.PORT || 3050;
server.listen(PORT, () => console.log('✓ WebPush WebSocket engine active on Port ' + PORT));
