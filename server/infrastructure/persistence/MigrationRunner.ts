import type Database from 'better-sqlite3'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { DatabaseInitError } from '../errors/DatabaseInitError.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

/** A single migration entry. */
interface Migration {
  version: number
  filename: string
  sql: string
}

/**
 * Versioned migration runner.
 *
 * Behaviour:
 * - Ensures the `schema_migrations` tracking table exists.
 * - Reads SQL files from the `migrations/` directory, ordered by version number.
 * - Applies only migrations whose version is not yet recorded in `schema_migrations`.
 * - Each migration is run inside a transaction so partial failures leave the schema clean.
 * - Re-running is fully idempotent — already-applied migrations are skipped.
 */
export class MigrationRunner {
  private readonly db: Database.Database

  constructor(db: Database.Database) {
    this.db = db
  }

  /**
   * Apply all pending migrations.
   * Called once at server startup before the first request is served.
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

  /** Return migrations from disk that have not yet been applied. */
  private _pendingMigrations(): Migration[] {
    const applied = this._appliedVersions()
    const all = this._loadMigrations()
    return all.filter(m => !applied.has(m.version))
  }

  /** Return the set of migration versions already recorded in schema_migrations. */
  private _appliedVersions(): Set<number> {
    const rows = this.db
      .prepare<[], { version: number }>('SELECT version FROM schema_migrations')
      .all()
    return new Set(rows.map(r => r.version))
  }

  /** Load and parse migration SQL files from the migrations/ directory. */
  private _loadMigrations(): Migration[] {
    const migrationsDir = join(__dirname, 'migrations')

    // Known migrations — extend this list as new SQL files are added
    const knownFiles = [
      { version: 1, filename: '001_create_todos.sql' },
    ]

    return knownFiles.map(({ version, filename }) => {
      const filePath = join(migrationsDir, filename)
      try {
        const sql = readFileSync(filePath, 'utf-8')
        return { version, filename, sql }
      }
      catch (err) {
        throw new DatabaseInitError(
          `Failed to read migration file "${filePath}": ${String(err)}`,
          err,
        )
      }
    })
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
