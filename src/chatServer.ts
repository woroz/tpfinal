import jwt from 'jsonwebtoken'
import type { JwtUser } from './types/jwt.js'
import { createServer } from 'http'
import { Server } from 'socket.io'
import { initSocketService } from './services/socketService.js'
import { prismaChat } from './utils/prismaChat.js'


const PORT = Number(
  process.env.NODE_ENV === 'development'
    ? process.env.CHAT_PORT || 3001
    : process.env.PORT || 3001
)

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

io.use(async (socket, next) => {
  const token = socket.handshake.auth?.token
  const secret = process.env.JWT_SECRET

  if (typeof token !== 'string' || !token) {
    return next(new Error('No se proporcionó un token de autenticación'))
  }

  if (!secret) {
    console.error('Falta la variable JWT_SECRET')
    return next(new Error('Error de configuración del servidor'))
  }

  let info: JwtUser

  try {
    info = jwt.verify(token, secret) as JwtUser

    if (!info.id_usuario) {
      return next(new Error('Token inválido'))
    }
  } catch {
    return next(new Error('Token inválido o expirado'))
  }

  try {
    const usuario = await prismaChat.usuario.findUnique({
      where: {
        id_usuario: info.id_usuario
      },
      select: {
        id_usuario: true,
        rol: true,
        bloqueado: true
      }
    })

    if (!usuario) {
      return next(new Error('Usuario no encontrado'))
    }

    if (usuario.bloqueado && usuario.rol === 'profesor') {
      return next(new Error('Tu cuenta de profesor se encuentra bloqueada'))
    }

    socket.data.usuario = {
      ...info,
      rol: usuario.rol
    }

    next()
  } catch (error) {
    console.error('Error al validar usuario del chat:', error)
    next(new Error('No se pudo validar el acceso al chat'))
  }
})

initSocketService(io)

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor de chat escuchando en el puerto ${PORT}`)
})