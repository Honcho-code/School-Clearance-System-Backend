import { Router } from 'express'
import { requireAuth, requireRole } from '../middleware/auth.js'
import { query } from '../db/pool.js'

const r = Router()
r.use(requireAuth, requireRole('admin'))

// global stats
r.get('/stats', async (req, res, next) => {
  try {
    const [total, cleared, inProgress, feePending, finalPending] = await Promise.all([
      query('SELECT COUNT(*) FROM clearance_apps'),
      query("SELECT COUNT(*) FROM clearance_apps WHERE status='cleared'"),
      query("SELECT COUNT(*) FROM clearance_apps WHERE status='in_progress'"),
      query("SELECT COUNT(*) FROM clearance_stages WHERE stage_key='admin' AND status='reviewing'"),
      query("SELECT COUNT(*) FROM clearance_stages WHERE stage_key='final' AND status='reviewing'"),
    ])
    res.json({
      ok: true,
      stats: {
        total:        parseInt(total.rows[0].count),
        cleared:      parseInt(cleared.rows[0].count),
        inProgress:   parseInt(inProgress.rows[0].count),
        feePending:   parseInt(feePending.rows[0].count),
        finalPending: parseInt(finalPending.rows[0].count),
      },
    })
  } catch (err) { next(err) }
})

// list all users
r.get('/users', async (req, res, next) => {
  try {
    const { rows } = await query(
      'SELECT id, name, email, role, matric, staff_id, department, is_verified, created_at FROM users ORDER BY created_at DESC'
    )
    res.json({ ok: true, users: rows })
  } catch (err) { next(err) }
})

// audit log
r.get('/audit', async (req, res, next) => {
  try {
    const { rows } = await query(
      'SELECT * FROM audit_log ORDER BY created_at DESC LIMIT 100'
    )
    res.json({ ok: true, logs: rows })
  } catch (err) { next(err) }
})

export default r