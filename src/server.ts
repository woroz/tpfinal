import { createServer } from 'http'
import { Server } from 'socket.io'
import { config } from './config/index.js'
import app from './app.js'
import { prisma } from './utils/prisma.js'
import { initSocketService } from './services/socketService.js'

process.on('uncaughtException', (error: Error) => {
    console.error('Excepcion sincronica detectada', { name: error.name, message: error.message, stack: error.stack })
    process.exit(1)
})

process.on('unhandledRejection', (error: Error) => {
    console.error('Rechazo de promesa no detectado', { message: error.message || error })
    process.exit(1)
})

try {
    await prisma.$queryRaw`SELECT 1`
    console.log('base de datos conectada')
} catch (error) {
    console.error('Error al conectar la base de datos', { message: (error as Error).message })
    process.exit(1)
}

const server = createServer(app)

const io = new Server(server, {
    cors: {
        origin: (origin, callback) => {
            const allowedOrigins = new Set([
                'http://localhost:5173',
                'http://127.0.0.1:5173',
                config.frontendUrl
            ])
            if (!origin || allowedOrigins.has(origin)) {
                callback(null, true)
            } else {
                callback(new Error('Origen no permitido por CORS en Sockets'))
            }
        },
        credentials: true
    }
})
initSocketService(io)


if (process.env.VERCEL !== '1') {
    server.listen(config.port, () => {
        console.log(`Servidor escuchando en el puerto ${config.port}`)
    })
}
export default app