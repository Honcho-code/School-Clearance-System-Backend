import { Router } from 'express'
import { body }    from 'express-validator'
import { validate }   from '../middleware/validate.js'
import { requireAuth } from '../middleware/auth.js'
import * as ctrl from '../controllers/auth.js'

const r = Router()

r.post('/register',
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Valid email required').normalizeEmail(),
    body('password').isLength({ min:6 }).withMessage('Password must be at least 6 characters'),
    body('matric').trim().notEmpty().withMessage('Matric number is required'),
    body('department').trim().notEmpty().withMessage('Department is required'),
  ],
  validate, ctrl.register
)

r.post('/login',
  [
    body('email').isEmail().withMessage('Valid email required').normalizeEmail(),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  validate, ctrl.login
)

r.get('/verify-email',   ctrl.verifyEmail)
r.get('/me',             requireAuth, ctrl.getMe)
r.post('/forgot-password', body('email').isEmail(), validate, ctrl.forgotPassword)
r.post('/reset-password',
  [body('token').notEmpty(), body('password').isLength({min:6})],
  validate, ctrl.resetPassword
)

export default r