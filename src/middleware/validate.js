import { validationResult } from 'express-validator'

export function validate(req, res, next) {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(422).json({
      ok:     false,
      message: errors.array()[0].msg,
      errors:  errors.array(),
    })
  }
  next()
}