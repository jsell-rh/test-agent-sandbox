/**
 * TodoRepository — domain-owned interface for Todo persistence.
 *
 * The domain defines the contract; infrastructure implements it.
 * This keeps the domain layer independent of any persistence technology.
 */

import type { TodoId } from './value-objects';
import type { Todo } from './todo';

export interface TodoRepository {
  /** Find a Todo by its identity. Returns null when not found. */
  findById(id: TodoId): Todo | null;

  /** Return all persisted Todos in insertion order. */
  findAll(): Todo[];

  /** Persist a Todo (insert if new, update if existing). */
  save(todo: Todo): void;

  /** Permanently remove a Todo by its identity. */
  delete(id: TodoId): void;
}
