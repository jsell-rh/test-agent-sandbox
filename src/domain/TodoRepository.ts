import type { Todo } from './Todo';

/**
 * Repository interface — owned by the Domain, implemented by Infrastructure.
 *
 * The domain defines this contract; no concrete implementation lives here.
 */
export interface TodoRepository {
  /** Find a Todo by its TodoId. Returns null if not found. */
  findById(id: string): Todo | null;

  /** Return all Todos. */
  findAll(): Todo[];

  /** Insert or update a Todo. */
  save(todo: Todo): void;

  /** Permanently remove a Todo by its TodoId. */
  delete(id: string): void;
}
