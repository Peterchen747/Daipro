import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

const connectionString = process.env.DATABASE_URL!

// 在 Serverless 環境用 prepare: false 避免 prepared statement 問題
const client = postgres(connectionString, { prepare: false })

export const db = drizzle(client, { schema })
