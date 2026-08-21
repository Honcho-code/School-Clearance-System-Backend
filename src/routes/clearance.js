import { Router } from 'express'
import { requireAuth, requireRole } from '../middleware/auth.js'
import * as ctrl from '../controllers/clearance.js'

const r = Router()

r.use(requireAuth)

r.post('/',       requireRole('student'), ctrl.submitClearance)
r.get('/mine',    requireRole('student'), ctrl.getMyApp)
r.get('/',        requireRole('admin','medical','library','hod'), ctrl.getAllApps)
r.get('/:id',     ctrl.getApp)

export default r