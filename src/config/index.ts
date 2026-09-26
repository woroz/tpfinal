import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(import.meta.dirname, '../../.env') })
function requireEnv(name: string): string {
    const val = process.env[name]
    if (!val) throw new Error(`Variable de entorno requerida: ${name}`)
    return val
}

export const config = {
    port: requireEnv('PORT'),
    nodeEnv: requireEnv('NODE_ENV'),
    DATABASE_URL: requireEnv('DATABASE_URL'),
    jwt: {
        secret: requireEnv('JWT_SECRET'),
        refreshSecret: requireEnv('JWT_REFRESH_SECRET'),
        expire: '2h'
    }
}