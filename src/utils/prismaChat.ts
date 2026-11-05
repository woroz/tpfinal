import { PrismaClient } from '../generated/prisma/client.js'
import { PrismaPg } from '@prisma/adapter-pg'
import dotenv from 'dotenv'
import path from 'path'

dotenv.config({
  path: path.resolve(import.meta.dirname, '../../.env')
})

const databaseUrl = process.env.DATABASE_URL

if (!databaseUrl) {
  throw new Error('Falta la variable de entorno DATABASE_URL')
}

const adapter = new PrismaPg({
  connectionString: databaseUrl
})

export const prismaChat = new PrismaClient({ adapter })