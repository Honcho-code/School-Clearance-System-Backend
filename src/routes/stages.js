import { Router } from 'express'
import { body }   from 'express-validator'
import { validate }    from '../middleware/validate.js'
import { requireAuth, requireRole } from '../middleware/auth.js'
import { reviewStage, grantClearance, getStageQueue } from '../controllers/stages.js'

const r = Router()
r.use(requireAuth)

r.get('/queue', requireRole('admin','medical','library','hod'), getStageQueue)

r.post('/:appId/review',
  requireRole('admin','medical','library','hod'),
  [
    body('stage').notEmpty().withMessage('Stage is required'),
    body('decision').isIn(['approved','rejected']).withMessage('Decision must be approved or rejected'),
    body('remark').trim().notEmpty().withMessage('Remark is required'),
  ],
  validate, reviewStage
)

r.post('/:appId/grant',
  requireRole('admin'),
  [body('remark').optional().trim()],
  validate, grantClearance
)

export default r