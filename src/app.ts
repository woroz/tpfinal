import express from 'express'
import helmet from 'helmet'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import routes from './routes/routes.js'
import { config } from './config/index.js'
import { errorMiddleware } from './middlewares/errorMiddleware.js'
import { AppError } from './utils/error.js'

const app = express()

app.use(helmet())
app.use(cors({ origin: config.frontendUrl, credentials: true }))
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
