import Database from 'better-sqlite3';
import { readFileSync } from 'fs';
import { join } from 'path';
import { Todo } from '../domain/Todo';
import { TodoStatus } from '../domain/value-objects/TodoStatus';
import { FilterCriteria } from '../domain/value-objects/FilterCriteria';
import type { TodoRepository, TodoCounts } from '../domain/TodoRepository';
import { DatabaseInitError } from './errors/DatabaseInitError';
import { PersistenceError } from './errors/PersistenceError';

// ---------------------------------------------------------------------------
// Row shape returned from SQLite queries
// ---------------------------------------------------------------------------

interface TodoRow {
  id: string;
  title: string;
  status: string;
  created_at: string;
  updated_at: string;
}

interface MigrationRow {
  version: number;
  applied_at: string;
}

interface CountRow {
  all: number;
  active: number;
  completed: number;
}

// ---------------------------------------------------------------------------
// SqliteTodoRepository
// ---------------------------------------------------------------------------

/**
 * SQLite-backed implementation of the `TodoRepository` interface.
 *
 * - Uses `better-sqlite3` (synchronous API) — no async overhead.
 * - WAL journal mode + busy_timeout are enabled at connection open.
 * - Schema migrations are applied automatically on construction.
 * - Re-running migrations is idempotent: already-applied versions are skipped.
 *
 * Connection management:
 *   `dbPath` defaults to `process.env.DATABASE_PATH ?? './todos.db'`.
 *   Pass `':memory:'` for in-memory (test) databases.
 */
export class SqliteTodoRepository implements TodoRepository {
  private readonly db: Database.Database;

  constructor(dbPath?: string) {
    const resolvedPath = dbPath ?? process.env['DATABASE_PATH'] ?? './todos.db';

    if (!dbPath && !process.env['DATABASE_PATH']) {
      console.warn(
        '[SqliteTodoRepository] DATABASE_PATH env var not set; using default: ./todos.db',
      );
    }

    try {
      this.db = new Database(resolvedPath);
    } catch (err) {
      throw new DatabaseInitError(
        `Failed to open database at "${resolvedPath}": ${String(err)}`,
        err,
      );
    }

    try {
      // Enable WAL mode for durability and concurrent read performance.
      this.db.pragma('journal_mode=WAL');
      // Avoid immediate SQLITE_BUSY errors under concurrent writes.
      this.db.pragma('busy_timeout=5000');
    } catch (err) {
      throw new DatabaseInitError(`Failed to configure database pragmas: ${String(err)}`, err);
    }

    this._ensureMigrationsTable();
    this._runMigrations();
  }

  // ---------------------------------------------------------------------------
  // TodoRepository implementation
  // ---------------------------------------------------------------------------

  findById(id: string): Todo | null {
    try {
      const stmt = this.db.prepare<[string], TodoRow>(
        'SELECT * FROM todos WHERE id = ?',
      );
      const row = stmt.get(id);
      return row ? this._rowToTodo(row) : null;
    } catch (err) {
      throw new PersistenceError(`findById("${id}") failed: ${String(err)}`, err);
    }
  }

  findAll(filter?: FilterCriteria): Todo[] {
    try {
      let sql: string;

      switch (filter) {
        case FilterCriteria.active:
          sql = "SELECT * FROM todos WHERE status = 'active' ORDER BY created_at DESC";
          break;
        case FilterCriteria.completed:
          sql = "SELECT * FROM todos WHERE status = 'completed' ORDER BY created_at DESC";
          break;
        case FilterCriteria.all:
        default:
          sql = 'SELECT * FROM todos ORDER BY created_at DESC';
          break;
      }

      const rows = this.db.prepare<[], TodoRow>(sql).all();
      return rows.map((row) => this._rowToTodo(row));
    } catch (err) {
      throw new PersistenceError(`findAll(filter="${filter}") failed: ${String(err)}`, err);
    }
  }

  save(todo: Todo): void {
    try {
      this.db
        .prepare<[string, string, string, string, string]>(
          `INSERT INTO todos (id, title, status, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?)
           ON CONFLICT(id) DO UPDATE SET
             title      = excluded.title,
             status     = excluded.status,
             updated_at = excluded.updated_at`,
        )
        .run(todo.id, todo.title, todo.status, todo.createdAt, todo.updatedAt);
    } catch (err) {
      throw new PersistenceError(`save(id="${todo.id}") failed: ${String(err)}`, err);
    }
  }

  delete(id: string): void {
    try {
      this.db.prepare<[string]>('DELETE FROM todos WHERE id = ?').run(id);
      // No error if row did not exist — Application Layer pre-validates via findById.
    } catch (err) {
      throw new PersistenceError(`delete("${id}") failed: ${String(err)}`, err);
    }
  }

  counts(): TodoCounts {
    try {
      const row = this.db
        .prepare<[], CountRow>(
          `SELECT
            COUNT(*) AS "all",
            SUM(CASE WHEN status = 'active'    THEN 1 ELSE 0 END) AS active,
            SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completed
           FROM todos`,
        )
        .get()!;

      return {
        all: row.all ?? 0,
        active: row.active ?? 0,
        completed: row.completed ?? 0,
      };
    } catch (err) {
      throw new PersistenceError(`counts() failed: ${String(err)}`, err);
    }
  }

  // ---------------------------------------------------------------------------
  // Connection lifecycle
  // ---------------------------------------------------------------------------

  /**
   * Close the underlying database connection.
   *
   * Call this during graceful shutdown or at the end of test suites
   * that use file-based databases.
   */
  close(): void {
    this.db.close();
  }

  // ---------------------------------------------------------------------------
  // Mapping helpers
  // ---------------------------------------------------------------------------

  private _rowToTodo(row: TodoRow): Todo {
    const status =
      row.status === 'active' ? TodoStatus.active : TodoStatus.completed;

    return Todo.reconstitute(
      row.id,
      row.title,
      status,
      row.created_at,
      row.updated_at,
    );
  }

  // ---------------------------------------------------------------------------
  // Migration management
  // ---------------------------------------------------------------------------

  /**
   * Create the schema_migrations tracking table if it does not yet exist.
   * This is always safe to call — it uses CREATE TABLE IF NOT EXISTS.
   */
  private _ensureMigrationsTable(): void {
    try {
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS schema_migrations (
          version     INTEGER NOT NULL PRIMARY KEY,
          applied_at  TEXT    NOT NULL
        )
      `);
    } catch (err) {
      throw new DatabaseInitError(
        `Failed to create schema_migrations table: ${String(err)}`,
        err,
      );
    }
  }

  /**
   * Run all pending migrations in order.
   *
   * Migrations are SQL files stored in `./migrations/` relative to this
   * source file. Each file is named `NNN_description.sql` where NNN is the
   * integer version number.
   *
   * Already-applied versions (tracked in schema_migrations) are skipped,
   * making this operation idempotent.
   */
  _runMigrations(): void {
    const migrations = [
      { version: 1, file: '001_create_todos.sql' },
    ];

    const applied = new Set(
      (
        this.db
          .prepare<[], MigrationRow>('SELECT version FROM schema_migrations')
          .all()
      ).map((r) => r.version),
    );

    for (const migration of migrations) {
      if (applied.has(migration.version)) {
        continue; // already applied — idempotent
      }

      try {
        const sqlPath = join(__dirname, 'migrations', migration.file);
        const sql = readFileSync(sqlPath, 'utf8');

        // Run migration and record it atomically.
        this.db.transaction(() => {
          this.db.exec(sql);
          this.db
            .prepare<[number, string]>(
              'INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)',
            )
            .run(migration.version, new Date().toISOString());
        })();
      } catch (err) {
        throw new DatabaseInitError(
          `Migration ${migration.version} (${migration.file}) failed: ${String(err)}`,
          err,
        );
      }
    }
  }
}
