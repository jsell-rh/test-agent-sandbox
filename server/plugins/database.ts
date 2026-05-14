import type Database from 'better-sqlite3'
import { openDatabase } from '../infrastructure/persistence/DatabaseConnection.js'
import { MigrationRunner } from '../infrastructure/persistence/MigrationRunner.js'
import { SqliteTodoRepository } from '../infrastructure/persistence/SqliteTodoRepository.js'
import { DatabaseInitError } from '../infrastructure/errors/DatabaseInitError.js'

/**
 * Nitro server plugin — initialises the SQLite database on startup.
 *
 * This plugin is the single entry point for the persistence infrastructure.
 * It runs synchronously before any request is served:
 *   1. Opens the database connection (WAL mode, 5s busy timeout).
 *   2. Applies any unapplied migrations.
 *   3. Exposes the `TodoRepository` via `getTodoRepository()`.
 *
 * If initialisation fails, the server refuses to start (DatabaseInitError
 * propagates and kills the process with a clear message).
 */

let _db: Database.Database | null = null

export default defineNitroPlugin(() => {
  const config = useRuntimeConfig()
  const databasePath = config.databasePath as string | undefined

  try {
    _db = openDatabase(databasePath)
    const runner = new MigrationRunner(_db)
    runner.run()

    console.info(
      '[persistence] Database ready at "' + (databasePath ?? process.env['DATABASE_PATH'] ?? './todos.db') + '"',
    )
  }
  catch (err) {
    if (err instanceof DatabaseInitError) {
      console.error('[persistence] FATAL — database initialisation failed:', err.message)
    }
    else {
      console.error('[persistence] FATAL — unexpected error during database init:', err)
    }
    // Re-throw to prevent the server from accepting requests
    throw err
  }
})

/**
 * Returns the shared database connection opened during plugin initialisation.
 *
 * Throws DatabaseInitError if called before the plugin has run.
 */
export function getDb(): Database.Database {
  if (!_db) {
    throw new DatabaseInitError(
      'Database has not been initialised. Ensure the database plugin ran before this call.',
    )
  }
  return _db
}

/**
 * Convenience factory — returns a `SqliteTodoRepository` backed by the shared connection.
 *
 * Intended for use in `server/api/` route handlers.
 */
export function getTodoRepository(): SqliteTodoRepository {
  return new SqliteTodoRepository(getDb())
}
