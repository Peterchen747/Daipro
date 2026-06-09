import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

type DB = ReturnType<typeof drizzle<typeof schema>>
let _db: DB | undefined

function getDb(): DB {
  if (!_db) {
    // prepare: false 避免 Serverless 環境的 prepared statement 問題
    _db = drizzle(postgres(process.env.DATABASE_URL!, { prepare: false }), { schema })
  }
  return _db
}

export const db = new Proxy({} as DB, {
  get(_, prop) {
    return Reflect.get(getDb(), prop)
  },
})
