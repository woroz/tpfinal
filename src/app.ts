import express from 'express'
import helmet from 'helmet'
import cors from 'cors'
import routes from './routes/routes.js'

const app = express()

const allowedOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173'
]

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true)
    } else {
      callback(new Error('Origen no permitido por CORS'))
    }
  },
  credentials: true
}))

app.use(helmet())
app.use(express.json())
app.use(cors())
app.use('/', routes)

app.get('/prueba', (req, res) => {
  res.json({
    status: 'ok'
})
})

export default app