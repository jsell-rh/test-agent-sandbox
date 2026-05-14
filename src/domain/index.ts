/**
 * Public API of the Todo domain layer.
 *
 * Consumers import from this file only; internal module paths are an
 * implementation detail.
 */

export { InvalidTitleError, TodoNotFoundError } from './errors';

export {
  TodoTitle,
  TodoStatus,
  FilterCriteria,
  DEFAULT_FILTER_CRITERIA,
  generateTodoId,
  currentTimestamp,
} from './value-objects';
export type { TodoId, Timestamp } from './value-objects';

export type {
  DomainEvent,
  TodoCreated,
  TodoCompleted,
  TodoReopened,
  TodoTitleUpdated,
  TodoDeleted,
} from './events';

export { Todo } from './todo';

export type { TodoRepository } from './repository';
