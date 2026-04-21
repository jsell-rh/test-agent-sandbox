import { Todo } from '../aggregates/Todo';
import { TodoId } from '../value-objects/TodoId';

/**
 * Repository interface for Todo aggregates.
 * The domain defines the contract; infrastructure implements it.
 *
 * Spec-Ref: specs/domain-model.spec.md — Repository Interface
 */
export interface TodoRepository {
  findById(id: TodoId): Todo | null;
  findAll(): Todo[];
  save(todo: Todo): void;
  delete(id: TodoId): void;
}
