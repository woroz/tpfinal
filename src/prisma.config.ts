import dotenv from 'dotenv'
import path from 'path'
dotenv.config({ path: path.resolve(__dirname, '../.env') })

import { config } from './config/index.js'
import { defineConfig } from 'prisma/config'

export default defineConfig({
    schema: './prisma/schema.prisma',
    datasource: {
        url: config.DATABASE_URL,
    },
})