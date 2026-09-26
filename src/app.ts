import express from 'express'
import helmet from 'helmet'
import routes from './routes/routes.js'

const app = express()

app.use(helmet())
app.use(express.json())
app.use('/', routes)

app.get('/prueba', (req, res) => {
  res.json({
    status: 'ok'
})
})

export default app