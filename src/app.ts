import express from 'express'
import helmet from 'helmet'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import routes from './routes/routes.js'
import { config } from './config/index.js'
import { errorMiddleware } from './middlewares/errorMiddleware.js'
import { AppError } from './utils/error.js'

const app = express()

const allowedOrigins = new Set([
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  config.frontendUrl
])

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.has(origin)) {
      callback(null, true)
    } else {
      callback(new Error('Origen no permitido por CORS'))
    }
  },
  credentials: true
}))

app.use(helmet())
app.use(express.json())
app.use(cookieParser())
app.use('/', routes)

app.get('/prueba', (req, res) => {
  res.json({
    status: 'ok'
})
})

app.use((req, res, next) => {
  next(new AppError('Ruta no encontrada', 404))
})
app.use(errorMiddleware)

export default app
