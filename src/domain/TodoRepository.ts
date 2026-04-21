import type { Todo } from './Todo';
import type { FilterCriteria } from './value-objects/FilterCriteria';

/** Counts broken down by status. */
export interface TodoCounts {
  all: number;
  active: number;
  completed: number;
}

/**
 * Repository interface — owned by the Domain, implemented by Infrastructure.
 *
 * The domain defines this contract; no concrete implementation lives here.
 */
export interface TodoRepository {
  /** Find a Todo by its TodoId. Returns null if not found. */
  findById(id: string): Todo | null;

  /**
   * Return all Todos, optionally filtered by status.
   * Results are ordered by createdAt descending (newest first).
   */
  findAll(filter?: FilterCriteria): Todo[];

  /** Insert or update a Todo. */
  save(todo: Todo): void;

  /** Permanently remove a Todo by its TodoId. */
  delete(id: string): void;

  /**
   * Return aggregate counts by status.
   * Used to populate the `counts` field on list responses without a second query.
   */
  counts(): TodoCounts;
}
