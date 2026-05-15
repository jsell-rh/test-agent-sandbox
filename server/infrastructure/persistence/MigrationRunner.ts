import type Database from 'better-sqlite3'
import { DatabaseInitError } from '../errors/DatabaseInitError.js'

/** A single migration entry. */
interface Migration {
  version: number
  filename: string
  sql: string
}

/**
 * Known migrations with SQL embedded inline.
 *
 * SQL is embedded directly rather than loaded from disk at runtime, because
 * Nitro bundles the server into a single chunk where `import.meta.url` /
 * `__dirname` resolves before the server entry point sets the correct URL —
 * making relative file-system reads unreliable in production.
 */
const KNOWN_MIGRATIONS: ReadonlyArray<Migration> = [
  {
    version: 1,
    filename: '001_create_todos.sql',
    sql: `
-- Migration 001: Create todos table and supporting indexes
-- Tracked by schema_migrations table (version = 1)

-- Create the todos table
CREATE TABLE IF NOT EXISTS todos (
  id          TEXT        NOT NULL PRIMARY KEY,
  title       TEXT        NOT NULL,
  status      TEXT        NOT NULL
                CHECK (status IN ('active', 'completed')),
  created_at  TEXT        NOT NULL,
  updated_at  TEXT        NOT NULL
);

-- idx_todos_status supports filtered queries (WHERE status = ?)
CREATE INDEX IF NOT EXISTS idx_todos_status ON todos (status);

-- idx_todos_created_at supports list ordering (newest first)
CREATE INDEX IF NOT EXISTS idx_todos_created_at ON todos (created_at DESC);
    `.trim(),
  },
]

/**
 * Versioned migration runner.
 *
 * Behaviour:
 * - Ensures the `schema_migrations` tracking table exists.
 * - Applies only migrations whose version is not yet recorded in `schema_migrations`.
 * - Each migration is run inside a transaction so partial failures leave the schema clean.
 * - Re-running is fully idempotent — already-applied migrations are skipped.
 *
 * Called once at server startup before the first request is served.
 */
export class MigrationRunner {
  private readonly db: Database.Database

  constructor(db: Database.Database) {
    this.db = db
  }

  /**
   * Apply all pending migrations.
   * Blocking, synchronous — must complete before the server accepts requests.
   */
  run(): void {
    this._ensureMigrationsTable()

    const pending = this._pendingMigrations()

    if (pending.length === 0) {
      return
    }

    for (const migration of pending) {
      this._applyMigration(migration)
    }
  }

  /** Create the schema_migrations table if it does not already exist. */
  private _ensureMigrationsTable(): void {
    try {
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS schema_migrations (
          version     INTEGER NOT NULL PRIMARY KEY,
          applied_at  TEXT    NOT NULL
        );
      `)
    }
    catch (err) {
      throw new DatabaseInitError(
        `Failed to create schema_migrations table: ${String(err)}`,
        err,
      )
    }
  }

  /** Return migrations that have not yet been applied. */
  private _pendingMigrations(): Migration[] {
    const applied = this._appliedVersions()
    return KNOWN_MIGRATIONS.filter(m => !applied.has(m.version))
  }

  /** Return the set of migration versions already recorded in schema_migrations. */
  private _appliedVersions(): Set<number> {
    const rows = this.db
      .prepare<[], { version: number }>('SELECT version FROM schema_migrations')
      .all()
    return new Set(rows.map(r => r.version))
  }

  /** Apply a single migration inside a transaction and record it. */
  private _applyMigration(migration: Migration): void {
    try {
      const applyTx = this.db.transaction(() => {
        this.db.exec(migration.sql)

        this.db
          .prepare(
            'INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)',
          )
          .run(migration.version, new Date().toISOString())
      })

      applyTx()
    }
    catch (err) {
      throw new DatabaseInitError(
        `Failed to apply migration ${migration.version} (${migration.filename}): ${String(err)}`,
        err,
      )
    }
  }
}
