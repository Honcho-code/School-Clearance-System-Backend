import { query }  from '../db/pool.js'
import { createNotification } from '../utils/notify.js'
import { sendMail, templates } from '../utils/mail.js'

const STAGES = ['admin','medical','library','hod','final']

// ── Student submits clearance ──
export async function submitClearance(req, res, next) {
  try {
    const studentId = req.user.id

    // only one active app per student
    const { rows: existing } = await query(
      "SELECT id FROM clearance_apps WHERE student_id=$1 AND status='in_progress'", [studentId]
    )
    if (existing.length) return res.status(409).json({ ok:false, message:'You already have an active clearance application.' })

    // create app
    const { rows: appRows } = await query(
      'INSERT INTO clearance_apps (student_id) VALUES ($1) RETURNING *', [studentId]
    )
    const app = appRows[0]

    // create all 5 stage rows — admin, medical, library start as 'reviewing'; hod & final start as 'pending'
    for (const key of STAGES) {
      const status = ['admin','medical','library'].includes(key) ? 'reviewing' : 'pending'
      await query(
        'INSERT INTO clearance_stages (app_id, stage_key, status) VALUES ($1,$2,$3)',
        [app.id, key, status]
      )
    }

    // insert receipts from body
    const { receipts } = req.body
    console.log('📦 Receipts received from frontend:', JSON.stringify(receipts))
    if (receipts) {
      for (const r of receipts) {
        await query(
          'INSERT INTO receipts (app_id, type, level, filename, original, url) VALUES ($1,$2,$3,$4,$5,$6)',
          [app.id, r.type, r.level || null, r.filename, r.original || r.filename, r.url || '']
        )
      }
    }

    // notify student
    await createNotification({
      userId:  studentId,
      message: 'Your clearance application has been submitted. Managers have been notified.',
      type:    'info',
    })

    // notify the three reviewers
    const reviewerRoles = ['admin','medical','library']
    for (const role of reviewerRoles) {
      const { rows: staff } = await query('SELECT id FROM users WHERE role=$1', [role])
      for (const s of staff) {
        await createNotification({
          userId:  s.id,
          message: `New clearance application from ${req.user.name} (${req.user.matric}) is awaiting your review.`,
          type:    'info',
        })
      }
    }

    const full = await getFullApp(app.id)
    res.status(201).json({ ok: true, app: full })
  } catch (err) {
    next(err)
  }
}

// ── Get my application (student) ──
export async function getMyApp(req, res, next) {
  try {
    const { rows } = await query(
      "SELECT id FROM clearance_apps WHERE student_id=$1 ORDER BY submitted_at DESC LIMIT 1",
      [req.user.id]
    )
    if (!rows.length) return res.json({ ok: true, app: null })
    const app = await getFullApp(rows[0].id)
    res.json({ ok: true, app })
  } catch (err) {
    next(err)
  }
}

// ── Get all apps (staff views) ──
export async function getAllApps(req, res, next) {
  try {
    const { rows } = await query(`
      SELECT ca.*, u.name as student_name, u.matric, u.department, u.faculty, u.level, u.email as student_email
      FROM clearance_apps ca
      JOIN users u ON u.id = ca.student_id
      ORDER BY ca.submitted_at DESC
    `)
    const apps = await Promise.all(rows.map(r => getFullApp(r.id)))
    res.json({ ok: true, apps })
  } catch (err) {
    next(err)
  }
}

// ── Get single app ──
export async function getApp(req, res, next) {
  try {
    const app = await getFullApp(req.params.id)
    if (!app) return res.status(404).json({ ok:false, message:'Application not found.' })
    res.json({ ok: true, app })
  } catch (err) {
    next(err)
  }
}

// ── Internal helper: build full app object ──
export async function getFullApp(appId) {
  const { rows: appRows } = await query(`
    SELECT ca.*, u.name as student_name, u.email as student_email,
           u.matric, u.department, u.faculty, u.level
    FROM clearance_apps ca
    JOIN users u ON u.id = ca.student_id
    WHERE ca.id = $1
  `, [appId])
  if (!appRows.length) return null

  const app = appRows[0]

  const { rows: stages } = await query(
    'SELECT * FROM clearance_stages WHERE app_id=$1 ORDER BY created_at', [appId]
  )
  const { rows: receipts } = await query(
    'SELECT * FROM receipts WHERE app_id=$1 ORDER BY uploaded_at', [appId]
  )
  const { rows: notifs } = await query(
    'SELECT * FROM notifications WHERE user_id=$1 ORDER BY created_at DESC LIMIT 20',
    [app.student_id]
  )

  const stagesMap = {}
  for (const s of stages) {
    stagesMap[s.stage_key] = {
      status:      s.status,
      reviewedAt:  s.reviewed_at,
      reviewer:    s.reviewer_name,
      remark:      s.remark,
    }
  }

  return {
    id:           app.id,
    studentId:    app.student_id,
    studentName:  app.student_name,
    studentEmail: app.student_email,
    matric:       app.matric,
    department:   app.department,
    faculty:      app.faculty,
    level:        app.level,
    status:       app.status,
    letterId:     app.letter_id,
    grantedAt:    app.granted_at,
    submittedAt:  app.submitted_at,
    stages:       stagesMap,
    receipts: {
      schoolFees: receipts.filter(r=>r.type==='school_fees'),
      medical:    receipts.filter(r=>r.type==='medical'),
      library:    receipts.filter(r=>r.type==='library'),
    },
    notifications: notifs,
  }
}