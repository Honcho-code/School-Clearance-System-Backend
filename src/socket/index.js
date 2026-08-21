import { Server } from 'socket.io'
import jwt from 'jsonwebtoken'

export function initSocket(http) {
  const io = new Server(http, {
    cors: {
      origin:      process.env.CLIENT_URL || 'http://localhost:5173',
      credentials: true,
    },
  })

  // Auth middleware for socket
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token
    if (!token) return next(new Error('No token'))
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET)
      socket.userId = decoded.id
      socket.userRole = decoded.role
      next()
    } catch {
      next(new Error('Invalid token'))
    }
  })

  io.on('connection', (socket) => {
    // join personal room for targeted notifications
    socket.join(`user:${socket.userId}`)

    // staff join their role room (e.g. admin, medical, library, hod)
    if (socket.userRole !== 'student') {
      socket.join(`role:${socket.userRole}`)
    }

    socket.on('disconnect', () => {
      socket.leave(`user:${socket.userId}`)
    })
  })

  return io
}