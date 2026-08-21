import { v4 as uuid }  from 'uuid'
import { query }         from '../db/pool.js'
import { getFullApp }    from './clearance.js'
import { createNotification } from '../utils/notify.js'
import { sendMail, templates } from '../utils/mail.js'
import { io }            from '../index.js'
import { format }        from 'date-fns'

const STAGE_LABELS = {
  admin:   'Admin (School Fees)',
  medical: 'Medical',
  library: 'Library',
  hod:     'H.O.D',
  final:   'Admin Final Check',
}

const ROLE_STAGE = {
  admin:   ['admin', 'final'],
  medical: ['medical'],
  library: ['library'],
  hod:     ['hod'],
}

export async function reviewStage(req, res, next) {
  try {
    const { appId }                   = req.params
    const { stage, decision, remark } = req.body
    const reviewer                    = req.user

    // validate role → stage
    const allowed = ROLE_STAGE[reviewer.role] || []
    if (!allowed.includes(stage)) {
      return res.status(403).json({ ok: false, message: 'You are not authorised to review this stage.' })
    }

    if (!['approved', 'rejected'].includes(decision)) {
      return res.status(422).json({ ok: false, message: 'Decision must be approved or rejected.' })
    }

    // update stage in DB
    await query(`
      UPDATE clearance_stages
      SET status=$1, reviewer_id=$2, reviewer_name=$3, remark=$4, reviewed_at=NOW()
      WHERE app_id=$5 AND stage_key=$6
    `, [decision, reviewer.id, reviewer.name, remark || null, appId, stage])

    // audit log
    await query(
      'INSERT INTO audit_log (actor_id, actor_name, action, target_id, meta) VALUES ($1,$2,$3,$4,$5)',
      [reviewer.id, reviewer.name, `stage_${decision}`, appId, JSON.stringify({ stage, remark })]
    )

    // unlock next stage if prerequisites met
    await unlockNextStage(appId)

    // fetch student info
    const { rows: appRows } = await query(
      `SELECT ca.student_id, u.name AS student_name, u.email AS student_email
       FROM clearance_apps ca
       JOIN users u ON u.id = ca.student_id
       WHERE ca.id = $1`,
      [appId]
    )

    if (!appRows.length) {
      return res.status(404).json({ ok: false, message: 'Application not found.' })
    }

    const { student_id, student_name, student_email } = appRows[0]

    console.log(`📋 Stage reviewed — student: ${student_name} | email: ${student_email} | stage: ${stage} | decision: ${decision}`)

    const label  = STAGE_LABELS[stage]
    const msgTxt = decision === 'approved'
      ? `${label} has been approved. ${remark || ''}`
      : `${label} requires attention: ${remark || 'Please check your submission.'}`

    // in-app notification
    const notif = await createNotification({
      userId:  student_id,
      message: msgTxt,
      type:    decision === 'approved' ? 'success' : 'warning',
    })

    // email notification to student
    const tmpl = templates.stageUpdate(student_name, label, decision, remark)
    await sendMail({ to: student_email, ...tmpl })

    // real-time socket update
    const fullApp = await getFullApp(appId)
    io.to(`user:${student_id}`).emit('clearance_update', fullApp)
    io.to('role:admin').to('role:medical').to('role:library').to('role:hod').emit('clearance_update', fullApp)

    res.json({ ok: true, app: fullApp, notification: notif })
  } catch (err) {
    console.error('reviewStage error:', err)
    next(err)
  }
}

export async function grantClearance(req, res, next) {
  try {
    const { appId }  = req.params
    const { remark } = req.body
    const reviewer   = req.user

    if (reviewer.role !== 'admin') {
      return res.status(403).json({ ok: false, message: 'Only Admin can grant final clearance.' })
    }

    // mark final stage approved
    await query(`
      UPDATE clearance_stages
      SET status='approved', reviewer_id=$1, reviewer_name=$2, remark=$3, reviewed_at=NOW()
      WHERE app_id=$4 AND stage_key='final'
    `, [reviewer.id, reviewer.name, remark || 'All documents verified. Clearance granted.', appId])

    // generate letter ID
    const letterId  = `OCS-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 90000) + 10000)}`
    const grantedAt = new Date()

    // mark app as cleared
    await query(
      "UPDATE clearance_apps SET status='cleared', letter_id=$1, granted_at=$2 WHERE id=$3",
      [letterId, grantedAt, appId]
    )

    // audit log
    await query(
      'INSERT INTO audit_log (actor_id, actor_name, action, target_id, meta) VALUES ($1,$2,$3,$4,$5)',
      [reviewer.id, reviewer.name, 'clearance_granted', appId, JSON.stringify({ letterId })]
    )

    // fetch student info
    const { rows } = await query(
      `SELECT ca.student_id, u.name, u.email
       FROM clearance_apps ca
       JOIN users u ON u.id = ca.student_id
       WHERE ca.id = $1`,
      [appId]
    )

    if (!rows.length) {
      return res.status(404).json({ ok: false, message: 'Application not found.' })
    }

    const { student_id, name: sName, email: sEmail } = rows[0]

    console.log(`🎓 Clearance granted — student: ${sName} | email: ${sEmail} | letter: ${letterId}`)

    // in-app notification
    await createNotification({
      userId:  student_id,
      message: `Congratulations! You are fully cleared. Certificate ID: ${letterId}`,
      type:    'cleared',
    })

    // email notification to student
    const tmpl = templates.cleared(sName, letterId, format(grantedAt, 'MMMM d, yyyy'))
    await sendMail({ to: sEmail, ...tmpl })

    // real-time socket update
    const fullApp = await getFullApp(appId)
    io.to(`user:${student_id}`).emit('clearance_update', fullApp)
    io.to(`user:${student_id}`).emit('cleared', { letterId, grantedAt })
    io.to('role:admin').emit('clearance_update', fullApp)

    res.json({ ok: true, app: fullApp, letterId })
  } catch (err) {
    console.error('grantClearance error:', err)
    next(err)
  }
}

// ── Auto-unlock next stage ──
async function unlockNextStage(appId) {
  const { rows: stages } = await query(
    'SELECT stage_key, status FROM clearance_stages WHERE app_id=$1',
    [appId]
  )

  const map = {}
  for (const s of stages) map[s.stage_key] = s.status

  // unlock HOD when admin + medical + library all approved
  if (
    map.admin   === 'approved' &&
    map.medical === 'approved' &&
    map.library === 'approved' &&
    map.hod     === 'pending'
  ) {
    await query(
      "UPDATE clearance_stages SET status='reviewing' WHERE app_id=$1 AND stage_key='hod'",
      [appId]
    )

    // fetch student info for HOD email
    const { rows: appInfo } = await query(
      `SELECT u.name, u.matric
       FROM clearance_apps ca
       JOIN users u ON u.id = ca.student_id
       WHERE ca.id = $1`,
      [appId]
    )
    const studentName  = appInfo[0]?.name   || 'A student'
    const studentMatric = appInfo[0]?.matric || ''

    // notify every HOD — in-app + email
    const { rows: hods } = await query("SELECT id, email, name FROM users WHERE role='hod'")
    for (const h of hods) {
      await createNotification({
        userId:  h.id,
        message: `${studentName}'s clearance file is ready for your departmental sign-off.`,
        type:    'info',
      })
      io.to(`user:${h.id}`).emit('new_review_request', { appId, stage: 'hod' })

      // email the HOD
      const tmpl = templates.hodNotification(studentName, studentMatric)
      await sendMail({ to: h.email, ...tmpl })
    }

    console.log(`🔓 HOD stage unlocked for app ${appId}`)
  }

  // unlock final when hod approved
  if (map.hod === 'approved' && map.final === 'pending') {
    await query(
      "UPDATE clearance_stages SET status='reviewing' WHERE app_id=$1 AND stage_key='final'",
      [appId]
    )

    // fetch student info for admin email
    const { rows: appInfo } = await query(
      `SELECT u.name, u.matric
       FROM clearance_apps ca
       JOIN users u ON u.id = ca.student_id
       WHERE ca.id = $1`,
      [appId]
    )
    const studentName   = appInfo[0]?.name   || 'A student'
    const studentMatric = appInfo[0]?.matric || ''

    // notify every admin — in-app + email
    const { rows: admins } = await query("SELECT id, email FROM users WHERE role='admin'")
    for (const a of admins) {
      await createNotification({
        userId:  a.id,
        message: `${studentName}'s file is ready for your final review and clearance grant.`,
        type:    'info',
      })
      io.to(`user:${a.id}`).emit('new_review_request', { appId, stage: 'final' })

      // email the admin
      const tmpl = templates.adminFinalNotification(studentName, studentMatric)
      await sendMail({ to: a.email, ...tmpl })
    }

    console.log(`🔓 Final stage unlocked for app ${appId}`)
  }
}

// ── Stage queue for staff dashboards ──
export async function getStageQueue(req, res, next) {
  try {
    const { stage, status = 'reviewing' } = req.query
    const { rows } = await query(`
      SELECT ca.id FROM clearance_apps ca
      JOIN clearance_stages cs ON cs.app_id = ca.id
      WHERE cs.stage_key = $1 AND cs.status = $2
      ORDER BY ca.submitted_at ASC
    `, [stage, status])

    const apps = await Promise.all(rows.map(r => getFullApp(r.id)))
    res.json({ ok: true, apps })
  } catch (err) {
    next(err)
  }
}