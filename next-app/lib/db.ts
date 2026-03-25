import { Pool, type PoolClient, type QueryResult, type QueryResultRow } from "pg"

const globalForDb = globalThis as typeof globalThis & {
  pgPool?: Pool
}

function createPool() {
  const connectionString = process.env.DATABASE_URL

  if (!connectionString) {
    throw new Error("DATABASE_URL is not configured.")
  }

  return new Pool({
    connectionString,
    ssl: connectionString.includes("localhost")
      ? false
      : { rejectUnauthorized: false },
  })
}

export const pool = globalForDb.pgPool ?? createPool()

if (process.env.NODE_ENV !== "production") {
  globalForDb.pgPool = pool
}

export function dbQuery<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[]
): Promise<QueryResult<T>> {
  return pool.query<T>(text, params)
}

export async function withDbClient<T>(
  callback: (client: PoolClient) => Promise<T>
) {
  const client = await pool.connect()

  try {
    await client.query("BEGIN")
    const result = await callback(client)
    await client.query("COMMIT")
    return result
  } catch (error) {
    await client.query("ROLLBACK")
    throw error
  } finally {
    client.release()
  }
}
