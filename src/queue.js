require('dotenv').config();
const { Queue } = require('bullmq');
const IORedis = require('ioredis');

let queue = null;
let connection = null;

// Only connect to Redis if explicitly enabled or REDIS_URL is provided and not disabled
const isRedisEnabled = process.env.ENABLE_REDIS === 'true';

if (isRedisEnabled && process.env.REDIS_URL) {
  try {
    connection = new IORedis(process.env.REDIS_URL, {
      maxRetriesPerRequest: null,
      lazyConnect: true,
      enableOfflineQueue: false,
      retryStrategy: times => (times > 1 ? null : 100)
    });

    // Suppress unhandled error crash if Redis is offline
    connection.on('error', () => {});

    connection.connect().then(() => {
      console.log('✓ BullMQ Redis connected');
    }).catch(() => {
      try { connection.disconnect(); } catch (_) {}
    });

    queue = new Queue('push', {
      connection,
      defaultJobOptions: { attempts: 3, backoff: { type: 'exponential', delay: 5000 }, removeOnComplete: 1000, removeOnFail: 5000 }
    });
    queue.on('error', () => {});
  } catch (_) {
    queue = null;
  }
}

// Graceful standalone fallback mock so routes never fail if Redis is absent
const mockQueue = {
  add: async (name, data) => ({ id: 'standalone-' + Date.now(), name, data }),
  getJobCounts: async () => ({ waiting: 0, active: 0, delayed: 0, failed: 0 }),
  getJob: async () => null
};

module.exports = {
  queue: queue || mockQueue,
  connection
};
