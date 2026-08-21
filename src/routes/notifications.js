import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import { query } from '../db/pool.js'

const r = Router()
r.use(requireAuth)

// get my notifications
r.get('/', async (req, res, next) => {
  try {
    const { rows } = await query(
      'SELECT * FROM notifications WHERE user_id=$1 ORDER BY created_at DESC LIMIT 50',
      [req.user.id]
    )
    res.json({ ok: true, notifications: rows })
  } catch (err) { next(err) }
})

// mark one read
r.patch('/:id/read', async (req, res, next) => {
  try {
    await query(
      'UPDATE notifications SET is_read=true WHERE id=$1 AND user_id=$2',
      [req.params.id, req.user.id]
    )
    res.json({ ok: true })
  } catch (err) { next(err) }
})

// mark all read
r.patch('/read-all', async (req, res, next) => {
  try {
    await query('UPDATE notifications SET is_read=true WHERE user_id=$1', [req.user.id])
    res.json({ ok: true })
  } catch (err) { next(err) }
})

// unread count
r.get('/unread-count', async (req, res, next) => {
  try {
    const { rows } = await query(
      'SELECT COUNT(*) FROM notifications WHERE user_id=$1 AND is_read=false',
      [req.user.id]
    )
    res.json({ ok: true, count: parseInt(rows[0].count) })
  } catch (err) { next(err) }
})

export default r