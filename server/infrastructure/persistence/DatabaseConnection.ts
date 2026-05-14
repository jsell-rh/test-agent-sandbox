import Database from 'better-sqlite3'
import { DatabaseInitError } from '../errors/DatabaseInitError.js'

/** Default database file path when DATABASE_PATH env var is absent. */
const DEFAULT_DATABASE_PATH = './todos.db'

/**
 * Opens and configures a SQLite connection.
 *
 * Configuration applied at connection open:
 * - WAL (Write-Ahead Logging) mode — ensures committed writes survive process crash.
 * - busy_timeout = 5000ms — second writers wait rather than throwing immediately.
 *
 * @param databasePath Override path (e.g. ':memory:' for tests). When omitted,
 *   falls back to the DATABASE_PATH env var, then the default file path.
 */
export function openDatabase(databasePath?: string): Database.Database {
  let resolvedPath = databasePath ?? process.env['DATABASE_PATH']

  if (!resolvedPath) {
    console.warn(
      '[persistence] DATABASE_PATH env var not set — falling back to ' + DEFAULT_DATABASE_PATH,
    )
    resolvedPath = DEFAULT_DATABASE_PATH
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
