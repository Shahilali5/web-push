/**
 * High-Performance Chunked Broadcaster for Large User Bases
 * Handles 10,000+ to 1,000,000+ users without event loop blocking or memory spikes.
 */

/**
 * Broadcasts a notification payload across all connected sockets in non-blocking batches.
 * @param {import('socket.io').Server} io - Socket.IO Server instance
 * @param {string} room - Room name (e.g. 'all', 'tag:vip')
 * @param {object} payload - Notification payload
 * @param {object} options - Batch configuration
 * @returns {Promise<{total: number, batches: number, durationMs: number}>}
 */
async function broadcastToLargeAudience(io, room = 'all', payload, options = {}) {
  const batchSize = options.batchSize || 500;
  const batchDelayMs = options.batchDelayMs || 5;
  const startTime = Date.now();

  try {
    // Fetch all connected socket instances in the target room
    const sockets = await io.in(room).fetchSockets();
    const total = sockets.length;

    if (total === 0) {
      return { total: 0, batches: 0, durationMs: 0 };
    }

    // If small number of users, emit directly
    if (total <= batchSize) {
      io.to(room).emit('notify', payload);
      return { total, batches: 1, durationMs: Date.now() - startTime };
    }

    let processed = 0;
    let batchIndex = 0;
    const totalBatches = Math.ceil(total / batchSize);

    for (let i = 0; i < total; i += batchSize) {
      const chunk = sockets.slice(i, i + batchSize);
      batchIndex++;

      // Emit to each socket in the chunk
      for (const socket of chunk) {
        socket.emit('notify', payload);
      }

      processed += chunk.length;

      // Emit live progress to admin channel if active
      if (options.onProgress) {
        options.onProgress({
          processed,
          total,
          percent: Math.round((processed / total) * 100),
          batch: batchIndex,
          totalBatches
        });
      }

      // Yield event loop to prevent event loop lag
      if (i + batchSize < total) {
        await new Promise(resolve => setTimeout(resolve, batchDelayMs));
      }
    }

    const durationMs = Date.now() - startTime;
    return { total, batches: totalBatches, durationMs };
  } catch (err) {
    console.error('[LargeUserBroadcaster] Error:', err);
    // Fallback direct emit in case fetchSockets fails
    io.to(room).emit('notify', payload);
    return { total: -1, error: err.message };
  }
}

module.exports = {
  broadcastToLargeAudience
};
