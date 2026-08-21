// import { Router }  from 'express'
// import multer       from 'multer'
// import path         from 'path'
// import { v4 as uuid } from 'uuid'
// import { requireAuth } from '../middleware/auth.js'
// import fs from 'fs'

// const UPLOAD_DIR = process.env.UPLOAD_DIR || 'uploads'
// if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true })

// const storage = multer.diskStorage({
//   destination: (req, file, cb) => cb(null, UPLOAD_DIR),
//   filename:    (req, file, cb) => {
//     const ext = path.extname(file.originalname)
//     cb(null, `${uuid()}${ext}`)
//   },
// })

// const upload = multer({
//   storage,
//   limits: { fileSize: parseInt(process.env.MAX_FILE_SIZE || '5242880') },
//   fileFilter: (req, file, cb) => {
//     const allowed = ['.pdf','.jpg','.jpeg','.png']
//     if (allowed.includes(path.extname(file.originalname).toLowerCase())) {
//       cb(null, true)
//     } else {
//       cb(new Error('Only PDF and image files are allowed.'))
//     }
//   },
// })

// const r = Router()
// r.use(requireAuth)

// r.post('/', upload.array('files', 20), (req, res) => {
//   const files = req.files.map(f => ({
//     filename: f.filename,
//     original: f.originalname,
//     url:      `/uploads/${f.filename}`,
//     size:     f.size,
//   }))
//   res.json({ ok: true, files })
// })

// export default r

import { Router } from 'express'
import multer from 'multer'
import { v2 as cloudinary } from 'cloudinary'
import { CloudinaryStorage } from 'multer-storage-cloudinary'
import { requireAuth } from '../middleware/auth.js'

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder:          'oui-clearance/receipts',
    allowed_formats: ['pdf', 'jpg', 'jpeg', 'png'],
    resource_type:   'auto',
  },
})

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
})

const r = Router()
r.use(requireAuth)

r.post('/', upload.array('files', 20), (req, res) => {
  const files = req.files.map(f => ({
    filename: f.filename || f.public_id,
    original: f.originalname,
    url:      f.path,
    size:     f.size,
  }))
  res.json({ ok: true, files })
})

export default r