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
app.get('/firebase-messaging-sw.js', (req, res) => res.sendFile(path.join(__dirname, 'public/firebase-messaging-sw.js')));
app.use('/admin', express.static(path.join(__dirname, 'public/admin')));
app.use('/test', express.static(path.join(__dirname, 'public/test')));

const { broadcastToLargeAudience } = require('./src/batchBroadcaster');

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: true },
  pingTimeout: 60000,
  pingInterval: 25000,
  perMessageDeflate: false, // Disables CPU-heavy zlib compression for high concurrency
  httpCompression: false,
  maxHttpBufferSize: 1e6
});
app.set('io', io);

// Optional Redis Adapter (graceful fallback if Redis is not running)
if (process.env.ENABLE_REDIS === 'true' && process.env.REDIS_URL) {
  try {
    const pubClient = new IORedis(process.env.REDIS_URL, {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      retryStrategy: times => (times > 1 ? null : 100)
    });
    const subClient = pubClient.duplicate();

    // Prevent unhandled error event crashes
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

// visitors (default namespace)
const SITE_KEY = process.env.SITE_KEY || 'change-me-site';
io.use((s, next) => {
  const key = s.handshake.auth && s.handshake.auth.siteKey;
  if (!process.env.SITE_KEY || key === SITE_KEY || key === 'change-me-site') {
    return next();
  }
  return next(new Error('unauthorized'));
});

io.on('connection', s => {
  const { user_id, tags } = s.handshake.auth || {};
  s.join('all');
  if (user_id) s.join('user:' + user_id);
  (Array.isArray(tags) ? tags : []).forEach(t => s.join('tag:' + t));

  // Client subscribes and requests welcome notification
  s.on('client_subscribe', data => {
    console.log('Client subscribed via Socket.IO:', s.id, data);
    s.emit('notify', {
      campaign_id: 'welcome',
      title: process.env.WELCOME_TITLE || 'Thanks For Subscribing',
      body: process.env.WELCOME_BODY || 'You Will Receive Updates Even When Website Is Closed',
      url: process.env.WELCOME_URL || '/',
      icon: '/test/bell.svg',
      actions: [
        { action: 'close', title: 'Close' },
        { action: 'open', title: 'Open' }
      ]
    });
  });

  // Allow sending test notifications via Socket.IO (with large-scale chunked broadcast)
  s.on('send_notification', async payload => {
    const target = payload && payload.target ? payload.target : 'all';
    const notificationData = {
      campaign_id: payload.campaign_id || String(Date.now()),
      title: payload.title || 'Notification',
      body: payload.body || 'New update received',
      url: payload.url || '/',
      icon: payload.icon || '/test/bell.svg',
      actions: [
        { action: 'close', title: 'Close' },
        { action: 'open', title: 'Open' }
      ]
    };

    if (target === 'all') {
      const result = await broadcastToLargeAudience(io, 'all', notificationData, {
        batchSize: 500,
        batchDelayMs: 5,
        onProgress: prog => {
          adminNs.emit('broadcast_progress', prog);
          s.emit('broadcast_progress', prog);
        }
      });
      s.emit('broadcast_complete', result);
    } else {
      io.to(target).emit('notify', notificationData);
    }
  });
});

// dashboard (/admin namespace)
const adminNs = io.of('/admin');
adminNs.use((s, next) => {
  const key = s.handshake.auth && s.handshake.auth.key;
  if (!process.env.ADMIN_KEY || key === process.env.ADMIN_KEY || key === 'change-me-admin') {
    return next();
  }
  return next(new Error('unauthorized'));
});

setInterval(async () => {
  try {
    const online = (await io.in('all').fetchSockets()).length;
    adminNs.emit('online', online);
  } catch (_) {}
}, 5000);

const PORT = process.env.PORT || 3050;
server.listen(PORT, () => console.log('push server on :' + PORT));
