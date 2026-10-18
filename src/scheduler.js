/**
 * In-Memory Autonomous Notification Agent & Scheduler
 * Allows scheduling notifications without external cron or redis.
 */

const scheduledJobs = new Map();

function scheduleNotification(id, timestamp, taskFn) {
  const delay = Math.max(0, new Date(timestamp).getTime() - Date.now());

  if (scheduledJobs.has(id)) {
    clearTimeout(scheduledJobs.get(id).timer);
  }

  const timer = setTimeout(async () => {
    try {
      await taskFn();
    } catch (err) {
      console.error('[NotificationAgent] Scheduled job error:', err);
    } finally {
      scheduledJobs.delete(id);
    }
  }, delay);

  scheduledJobs.set(id, {
    timer,
    timestamp: new Date(timestamp).toISOString(),
    delayMs: delay
  });

  return { id, scheduled_at: new Date(timestamp).toISOString(), delayMs: delay };
}

function cancelScheduledNotification(id) {
  if (scheduledJobs.has(id)) {
    clearTimeout(scheduledJobs.get(id).timer);
    scheduledJobs.delete(id);
    return true;
  }
  return false;
}

function listScheduledNotifications() {
  const list = [];
  scheduledJobs.forEach((val, key) => {
    list.push({ id: key, scheduled_at: val.timestamp, delayMs: val.delayMs });
  });
  return list;
}

module.exports = {
  scheduleNotification,
  cancelScheduledNotification,
  listScheduledNotifications
};
