import jwt from 'jsonwebtoken'
import { query } from '../db/pool.js'

export async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization
    if (!header || !header.startsWith('Bearer ')) {
      return res.status(401).json({ ok: false, message: 'No token provided.' })
    }
    const token   = header.split(' ')[1]
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    const { rows } = await query('SELECT id, name, email, role, matric, staff_id, department, faculty, level, title, is_verified FROM users WHERE id = $1', [decoded.id])
    if (!rows.length) return res.status(401).json({ ok: false, message: 'User not found.' })
    req.user = rows[0]
    next()
  } catch (err) {
    return res.status(401).json({ ok: false, message: 'Invalid or expired token.' })
  }
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user?.role)) {
      return res.status(403).json({ ok: false, message: 'Access denied.' })
    }
    next()
  }
}