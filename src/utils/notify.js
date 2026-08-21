import { query } from '../db/pool.js'
import { io }    from '../index.js'

export async function createNotification({ userId, message, type = 'info' }) {
  const { rows } = await query(
    'INSERT INTO notifications (user_id, message, type) VALUES ($1,$2,$3) RETURNING *',
    [userId, message, type]
  )
  const notif = rows[0]
  // emit real-time to the user's socket room
  if (io) {
    io.to(`user:${userId}`).emit('notification', notif)
  }
  return notif
}

export async function createNotificationBulk(userIds, message, type = 'info') {
  for (const userId of userIds) {
    await createNotification({ userId, message, type })
  }
}