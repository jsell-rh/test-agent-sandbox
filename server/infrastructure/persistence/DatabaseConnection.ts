import Database from 'better-sqlite3'
import { DatabaseInitError } from '../errors/DatabaseInitError.js'

/**
 * Opens and configures a SQLite connection.
 *
 * Configuration applied at connection open:
 * - WAL (Write-Ahead Logging) mode — ensures committed writes survive process crash.
 * - busy_timeout = 5000ms — second writers wait rather than throwing immediately.
 *
 * DATABASE_PATH environment variable controls the database file location.
 * Defaults to `./todos.db` and logs a warning when the variable is absent.
 *
 * For test environments, set DATABASE_PATH=:memory: to get an in-memory database.
 */
export function openDatabase(databasePath?: string): Database.Database {
  let resolvedPath = databasePath ?? process.env['DATABASE_PATH']

  if (!resolvedPath) {
    console.warn(
      '[persistence] DATABASE_PATH env var not set — falling back to ./todos.db',
    )
    resolvedPath = './todos.db'
  }

  try {
    const db = new Database(resolvedPath)

    // Enable WAL mode for durability and concurrent-read performance
    db.pragma('journal_mode = WAL')

    // Wait up to 5 s before failing on a locked database
    db.pragma('busy_timeout = 5000')

    return db
  }
  catch (err) {
    throw new DatabaseInitError(
      `Failed to open database at "${resolvedPath}": ${String(err)}`,
      err,
    )
  }
}
