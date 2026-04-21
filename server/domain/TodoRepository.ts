import type { Todo } from './Todo.js'
import type { FilterCriteria } from './value-objects/FilterCriteria.js'

/**
 * Repository interface — owned by the Domain, implemented by Infrastructure.
 *
 * The domain defines this contract; no concrete implementation lives here.
 * Swapping storage backends (SQLite → PostgreSQL, in-memory) requires only
 * a new implementation — no Domain or Application Layer changes.
 */
export interface TodoRepository {
  /** Find a Todo by its TodoId. Returns null if not found. */
  findById(id: string): Todo | null

  /**
   * Return all Todos, ordered by createdAt descending.
   * Optional filter restricts to active or completed subsets.
   */
  findAll(filter?: FilterCriteria): Todo[]

  /** Insert or update a Todo (upsert semantics). */
  save(todo: Todo): void

  /** Permanently remove a Todo by its TodoId. No-op if not found. */
  delete(id: string): void

  /** Return counts for all, active, and completed todos in a single query. */
  counts(): { all: number; active: number; completed: number }
}
