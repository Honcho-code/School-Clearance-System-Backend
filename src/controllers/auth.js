import bcrypt   from 'bcryptjs'
import { v4 as uuid } from 'uuid'
import { query }      from '../db/pool.js'
import { signToken }  from '../utils/jwt.js'
import { sendMail, templates } from '../utils/mail.js'

export async function register(req, res, next) {
  try {
    const { name, email, password, matric, department, faculty, level } = req.body

    // check duplicate
    const { rows: exist } = await query('SELECT id FROM users WHERE email=$1', [email])
    if (exist.length) return res.status(409).json({ ok:false, message:'An account with this email already exists.' })

    const hash  = await bcrypt.hash(password, 12)
    const vToken = uuid()

    const { rows } = await query(`
      INSERT INTO users (name, email, password_hash, role, matric, department, faculty, level, verify_token, is_verified)
      VALUES ($1,$2,$3,'student',$4,$5,$6,$7,$8,true) RETURNING id, name, email, role, matric, department, faculty, level
    `, [name, email, hash, matric, department, faculty, level, vToken])

    const user = rows[0]

    // send verification email
    const verifyUrl = `${process.env.CLIENT_URL}/verify-email?token=${vToken}`
    const tmpl = templates.welcome(name, verifyUrl)
    await sendMail({ to: email, ...tmpl })

    const token = signToken({ id: user.id, role: user.role })
    res.status(201).json({ ok: true, token, user })
  } catch (err) {
    next(err)
  }
}

export async function login(req, res, next) {
  try {
    const { email, password } = req.body

    const { rows } = await query('SELECT * FROM users WHERE email=$1', [email])
    if (!rows.length) return res.status(401).json({ ok:false, message:'No account found with that email.' })

    const user = rows[0]
    const match = await bcrypt.compare(password, user.password_hash)
    if (!match) return res.status(401).json({ ok:false, message:'Incorrect password.' })

    const token = signToken({ id: user.id, role: user.role })

    const { password_hash, verify_token, reset_token, reset_expires, ...safe } = user
    res.json({ ok: true, token, user: safe })
  } catch (err) {
    next(err)
  }
}

export async function verifyEmail(req, res, next) {
  try {
    const { token } = req.query
    const { rows } = await query(
      'UPDATE users SET is_verified=true, verify_token=null WHERE verify_token=$1 RETURNING id',
      [token]
    )
    if (!rows.length) return res.status(400).json({ ok:false, message:'Invalid or expired verification link.' })
    res.json({ ok: true, message: 'Email verified. You can now log in.' })
  } catch (err) {
    next(err)
  }
}

export async function getMe(req, res) {
  res.json({ ok: true, user: req.user })
}

export async function forgotPassword(req, res, next) {
  try {
    const { email } = req.body
    const { rows } = await query('SELECT id, name FROM users WHERE email=$1', [email])
    if (!rows.length) return res.json({ ok: true, message: 'If that email exists, a reset link has been sent.' })

    const token   = uuid()
    const expires = new Date(Date.now() + 1000 * 60 * 60) // 1 hour
    await query('UPDATE users SET reset_token=$1, reset_expires=$2 WHERE id=$3', [token, expires, rows[0].id])

    const resetUrl = `${process.env.CLIENT_URL}/reset-password?token=${token}`
    await sendMail({
      to: email,
      subject: 'Reset your OUI Clearance password',
      html: `<p>Hello ${rows[0].name},</p><p><a href="${resetUrl}">Click here to reset your password</a>. This link expires in 1 hour.</p>`,
    })

    res.json({ ok: true, message: 'Reset link sent to your email.' })
  } catch (err) {
    next(err)
  }
}

export async function resetPassword(req, res, next) {
  try {
    const { token, password } = req.body
    const { rows } = await query(
      'SELECT id FROM users WHERE reset_token=$1 AND reset_expires > NOW()',
      [token]
    )
    if (!rows.length) return res.status(400).json({ ok:false, message:'Invalid or expired reset link.' })

    const hash = await bcrypt.hash(password, 12)
    await query('UPDATE users SET password_hash=$1, reset_token=null, reset_expires=null WHERE id=$2', [hash, rows[0].id])
    res.json({ ok: true, message: 'Password reset successfully. You can now log in.' })
  } catch (err) {
    next(err)
  }
}