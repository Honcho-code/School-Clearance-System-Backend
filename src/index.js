import 'dotenv/config'
import express    from 'express'
import { createServer } from 'http'
import cors       from 'cors'
import path       from 'path'
import { fileURLToPath } from 'url'
import { initSocket } from './socket/index.js'
import authRoutes        from './routes/auth.js'
import clearanceRoutes   from './routes/clearance.js'
import stageRoutes       from './routes/stages.js'
import notifRoutes       from './routes/notifications.js'
import adminRoutes       from './routes/admin.js'
import uploadRoutes      from './routes/upload.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app  = express()
const http = createServer(app)

// ── Socket.io ──
export const io = initSocket(http)

// ── Middleware ──
app.use(cors({
  origin:      process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// ── Static uploads ──
app.use('/uploads', (req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', process.env.CLIENT_URL || 'http://localhost:5173')
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin')
  next()
}, express.static(path.join(__dirname, '..', 'uploads')))
// ── Routes ──
app.use('/api/auth',          authRoutes)
app.use('/api/clearance',     clearanceRoutes)
app.use('/api/stages',        stageRoutes)
app.use('/api/notifications', notifRoutes)
app.use('/api/admin',         adminRoutes)
app.use('/api/upload',        uploadRoutes)

// ── Health check ──
app.get('/api/health', (_, res) => res.json({ status: 'ok', time: new Date() }))

// ── Global error handler ──
app.use((err, req, res, next) => {
  console.error(err.stack)
  res.status(err.status || 500).json({
    ok:      false,
    message: err.message || 'Internal server error',
  })
})

const PORT = process.env.PORT || 5000
http.listen(PORT, () => {
  console.log(`OUI Clearance API running on http://localhost:${PORT}`)
})