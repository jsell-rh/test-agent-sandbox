import type Database from 'better-sqlite3'
import { Todo } from '../../domain/Todo.js'
import { TodoStatus } from '../../domain/value-objects/TodoStatus.js'
import { FilterCriteria } from '../../domain/value-objects/FilterCriteria.js'
import type { TodoRepository } from '../../domain/TodoRepository.js'
import { PersistenceError } from '../errors/PersistenceError.js'

/** Shape of a row in the `todos` table. */
interface TodoRow {
  id: string
  title: string
  status: string
  created_at: string
  updated_at: string
}

/** Shape of the counts query result (SQL alias avoids reserved word "all"). */
interface CountsRow {
  total: number
  active: number
  completed: number
}

/**
 * SQLite implementation of TodoRepository.
 *
 * Uses `better-sqlite3` (synchronous API — safe in Nitro server handlers).
 * All SQL is raw — no ORM layer. Mapping between rows and the Todo aggregate
 * happens via `Todo.reconstitute()` (no domain events emitted on load).
 *
 * Separation rule: this class has zero knowledge of HTTP, UI, or Domain
 * business rules. It only maps data.
 */
export class SqliteTodoRepository implements TodoRepository {
  private readonly db: Database.Database

  constructor(db: Database.Database) {
    this.db = db
  }

  // ---------------------------------------------------------------------------
  // findById
  // ---------------------------------------------------------------------------

  /**
   * Find a Todo by its TodoId.
   *
   * Returns null (not an error) when no row is found.
   * The Application Layer is responsible for converting null → TodoNotFoundError.
   */
  findById(id: string): Todo | null {
    try {
      const row = this.db
        .prepare<[string], TodoRow>('SELECT * FROM todos WHERE id = ?')
        .get(id)

      if (!row) return null

      return this._rowToTodo(row)
    }
    catch (err) {
      throw new PersistenceError(`findById failed for id "${id}"`, err)
    }
  }

  // ---------------------------------------------------------------------------
  // findAll
  // ---------------------------------------------------------------------------

  /**
   * Return all Todos, ordered by createdAt descending.
   *
   * Optional filter restricts to `active` or `completed` subsets.
   * `FilterCriteria.all` (or omitted) returns all todos.
   */
  findAll(filter?: FilterCriteria): Todo[] {
    try {
      let rows: TodoRow[]

      if (!filter || filter === FilterCriteria.all) {
        rows = this.db
          .prepare<[], TodoRow>('SELECT * FROM todos ORDER BY created_at DESC')
          .all()
      }
      else {
        rows = this.db
          .prepare<[string], TodoRow>(
            'SELECT * FROM todos WHERE status = ? ORDER BY created_at DESC',
          )
          .all(filter)
      }

      return rows.map(r => this._rowToTodo(r))
    }
    catch (err) {
      throw new PersistenceError(`findAll failed (filter: ${filter ?? 'all'})`, err)
    }
  }

  // ---------------------------------------------------------------------------
  // save (upsert)
  // ---------------------------------------------------------------------------

  /**
   * Insert or update a Todo.
   *
   * On conflict (same id), updates title, status, and updated_at.
   * created_at is intentionally excluded from the DO UPDATE clause so it
   * is never overwritten after the first insert.
   */
  save(todo: Todo): void {
    try {
      this.db
        .prepare<[string, string, string, string, string]>(`
          INSERT INTO todos (id, title, status, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            title      = excluded.title,
            status     = excluded.status,
            updated_at = excluded.updated_at
        `)
        .run(todo.id, todo.title, todo.status, todo.createdAt, todo.updatedAt)
    }
    catch (err) {
      throw new PersistenceError(`save failed for Todo id "${todo.id}"`, err)
    }
  }

  // ---------------------------------------------------------------------------
  // delete
  // ---------------------------------------------------------------------------

  /**
   * Permanently remove a Todo by its TodoId.
   *
   * No error if the row does not exist — the Application Layer validates
   * existence via findById before calling delete.
   */
  delete(id: string): void {
    try {
      this.db
        .prepare<[string]>('DELETE FROM todos WHERE id = ?')
        .run(id)
    }
    catch (err) {
      throw new PersistenceError(`delete failed for id "${id}"`, err)
    }
  }

  // ---------------------------------------------------------------------------
  // counts
  // ---------------------------------------------------------------------------

  /**
   * Return counts for all, active, and completed todos in a single query.
   *
   * Used by list endpoints to populate the `counts` field without a second query.
   * Returns zeros when the table is empty.
   */
  counts(): { all: number; active: number; completed: number } {
    try {
      const row = this.db
        .prepare<[], CountsRow>(`
          SELECT
            COUNT(*)                                                  AS total,
            SUM(CASE WHEN status = 'active'    THEN 1 ELSE 0 END)    AS active,
            SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END)    AS completed
          FROM todos
        `)
        .get()

      // SUM returns NULL on an empty table — coerce to 0
      return {
        all: row?.total ?? 0,
        active: row?.active ?? 0,
        completed: row?.completed ?? 0,
      }
    }
    catch (err) {
      throw new PersistenceError('counts query failed', err)
    }
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  /**
   * Map a database row to a Todo aggregate via Todo.reconstitute().
   *
   * Reconstitution re-validates the title but does NOT emit domain events.
   */
  private _rowToTodo(row: TodoRow): Todo {
    const status
      = row.status === TodoStatus.completed
        ? TodoStatus.completed
        : TodoStatus.active

    return Todo.reconstitute(
      row.id,
      row.title,
      status,
      row.created_at,
      row.updated_at,
    )
  }
}
