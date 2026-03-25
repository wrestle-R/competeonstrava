import fs from "node:fs/promises"
import path from "node:path"
import process from "node:process"
import { fileURLToPath } from "node:url"

import pg from "pg"

const { Client } = pg

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const migrationsDir = path.join(__dirname, "..", "migrations")
const envFiles = [
  path.join(__dirname, "..", ".env.local"),
  path.join(__dirname, "..", ".env"),
]

async function loadLocalEnv() {
  for (const envFile of envFiles) {
    try {
      const content = await fs.readFile(envFile, "utf8")

      for (const line of content.split("\n")) {
        const trimmed = line.trim()

        if (!trimmed || trimmed.startsWith("#")) {
          continue
        }

        const separatorIndex = trimmed.indexOf("=")

        if (separatorIndex === -1) {
          continue
        }

        const key = trimmed.slice(0, separatorIndex).trim()
        const rawValue = trimmed.slice(separatorIndex + 1).trim()
        const value = rawValue.replace(/^"(.*)"$/, "$1")

        if (!(key in process.env)) {
          process.env[key] = value
        }
      }
    } catch {
      // Ignore missing env files.
    }
  }
}

async function main() {
  await loadLocalEnv()

  const connectionString = process.env.DATABASE_URL

  if (!connectionString) {
    throw new Error("DATABASE_URL is not configured.")
  }

  const client = new Client({
    connectionString,
    ssl: connectionString.includes("localhost")
      ? false
      : { rejectUnauthorized: false },
  })

  await client.connect()

  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id SERIAL PRIMARY KEY,
        filename TEXT NOT NULL UNIQUE,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `)

    const files = (await fs.readdir(migrationsDir))
      .filter((file) => file.endsWith(".sql"))
      .sort()

    for (const file of files) {
      const alreadyApplied = await client.query(
        `SELECT 1 FROM schema_migrations WHERE filename = $1 LIMIT 1`,
        [file]
      )

      if (alreadyApplied.rowCount) {
        continue
      }

      const sql = await fs.readFile(path.join(migrationsDir, file), "utf8")

      await client.query("BEGIN")
      await client.query(sql)
      await client.query(
        `INSERT INTO schema_migrations (filename) VALUES ($1)`,
        [file]
      )
      await client.query("COMMIT")

      console.log(`Applied migration: ${file}`)
    }
  } catch (error) {
    await client.query("ROLLBACK")
    throw error
  } finally {
    await client.end()
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
