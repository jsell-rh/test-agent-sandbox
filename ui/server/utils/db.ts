/**
 * SQLite database connection management.
 *
 * Configuration:
 *   DATABASE_PATH environment variable (default: ./todos.db)
 *   WAL mode + 5000ms busy timeout per persistence.spec.md
 */
import Database from 'better-sqlite3'
import { join } from 'node:path'
import { existsSync, mkdirSync } from 'node:fs'

let _db: Database.Database | null = null

const SCHEMA_MIGRATIONS_TABLE = `
CREATE TABLE IF NOT EXISTS schema_migrations (
  version    INTEGER NOT NULL PRIMARY KEY,
  applied_at TEXT    NOT NULL
);
`

const MIGRATION_001 = `
CREATE TABLE IF NOT EXISTS todos (
  id         TEXT NOT NULL PRIMARY KEY,
  title      TEXT NOT NULL,
  status     TEXT NOT NULL CHECK (status IN ('active', 'completed')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_todos_status ON todos (status);
CREATE INDEX IF NOT EXISTS idx_todos_created_at ON todos (created_at DESC);
`

interface Migration {
  version: number
  sql: string
}

const MIGRATIONS: Migration[] = [
  { version: 1, sql: MIGRATION_001 },
]

function applyMigrations(db: Database.Database): void {
  db.exec(SCHEMA_MIGRATIONS_TABLE)
  const applied = db
    .prepare('SELECT version FROM schema_migrations')
    .all() as { version: number }[]
  const appliedVersions = new Set(applied.map((r) => r.version))

  for (const migration of MIGRATIONS) {
    if (!appliedVersions.has(migration.version)) {
      db.exec(migration.sql)
      db.prepare('INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)').run(
        migration.version,
        new Date().toISOString(),
      )
    }
  }
}

export function getDb(): Database.Database {
  if (_db) return _db

  const config = useRuntimeConfig()
  const dbPath = config.databasePath as string

  if (dbPath !== ':memory:') {
    const dir = dbPath.includes('/') ? dbPath.substring(0, dbPath.lastIndexOf('/')) : '.'
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true })
    }
  }

  const resolvedPath =
    dbPath === ':memory:'
      ? ':memory:'
      : dbPath.startsWith('/')
        ? dbPath
        : join(process.cwd(), dbPath)

  if (dbPath === './todos.db' || !process.env.DATABASE_PATH) {
    console.warn(
      '[db] DATABASE_PATH not set — using default: ./todos.db',
    )
  }

  _db = new Database(resolvedPath)
  _db.pragma('journal_mode = WAL')
  _db.pragma('busy_timeout = 5000')

  applyMigrations(_db)

  return _db
}

/** Reset for test isolation (called when DATABASE_PATH=:memory:) */
export function resetDb(): void {
  if (_db) {
    _db.close()
    _db = null
  }
}
