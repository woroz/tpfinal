import jwt from 'jsonwebtoken'
import type { JwtUser } from './types/jwt.js'
import { createServer } from 'http'
import { Server } from 'socket.io'
import { initSocketService } from './services/socketService.js'

const PORT = Number(process.env.PORT) || 3001

const server = createServer()

const io = new Server(server, {
  cors: {
    origin: [
      'http://localhost:5173',
      process.env.FRONTEND_URL
    ].filter(Boolean) as string[],
    credentials: true
  }
})

io.use((socket, next) => {
  const token = socket.handshake.auth?.token
  const secret = process.env.JWT_SECRET

  if (typeof token !== 'string' || !token) {
    return next(new Error('No se proporcionó un token de autenticación'))
  }

  if (!secret) {
    console.error('Falta la variable JWT_SECRET')
    return next(new Error('Error de configuración del servidor'))
  }

  try {
    const usuario = jwt.verify(token, secret) as JwtUser

    if (!usuario.id_usuario) {
      return next(new Error('Token inválido'))
    }

    socket.data.usuario = usuario

    next()
  } catch {
    next(new Error('Token inválido o expirado'))
  }
})

initSocketService(io)

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor de chat escuchando en el puerto ${PORT}`)
})