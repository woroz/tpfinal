import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(import.meta.dirname, '../../.env') })

function requireEnv(name: string): string {
    const val = process.env[name]
    if (!val) throw new Error(`Variable de entorno requerida: ${name}`)
    return val
}

function optionalEnv(name: string): string | undefined {
    const val = process.env[name]
    return val ? val : undefined
}

function numberEnv(name: string, fallback: number): number {
    const raw = process.env[name]
    const val = raw ? Number(raw) : fallback
    return Number.isFinite(val) && val > 0 ? val : fallback
}

export const config = {
    port: requireEnv('PORT'),
    nodeEnv: requireEnv('NODE_ENV'),
    DATABASE_URL: requireEnv('DATABASE_URL'),
    frontendUrl: (optionalEnv('FRONTEND_URL') ?? 'http://localhost:5173').replace(/\/$/, ''),
    appReturnUrl: optionalEnv('APP_RETURN_URL'),
    publicApiUrl: optionalEnv('PUBLIC_API_URL')?.replace(/\/$/, ''),
    jwt: {
        secret: requireEnv('JWT_SECRET'),
        refreshSecret: requireEnv('JWT_REFRESH_SECRET'),
        expire: '2h'
    },
    mercadoPago: {
        accessToken: optionalEnv('MP_ACCESS_TOKEN'),
        webhookSecret: optionalEnv('MP_WEBHOOK_SECRET')
    },
    mail: {
        host: optionalEnv('SMTP_HOST'),
        port: Number(optionalEnv('SMTP_PORT') ?? 587),
        user: optionalEnv('SMTP_USER'),
        pass: optionalEnv('SMTP_PASS'),
        from: optionalEnv('MAIL_FROM') ?? 'MentorAr <no-reply@mentorar.local>'
    },
    reservas: {
        duracionMin: 60,
        anticipacionMin: 60,
        retencionMin: numberEnv('RESERVA_RETENCION_MIN', 15),
        diasMaximos: 60,
        zonaOffsetMin: -180
    }
}