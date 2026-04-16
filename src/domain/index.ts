// Aggregate Root
export { Todo } from './Todo';

// Repository Interface
export type { TodoRepository, TodoCounts } from './TodoRepository';

// Value Objects
export { TodoTitle } from './value-objects/TodoTitle';
export { TodoStatus } from './value-objects/TodoStatus';
export { FilterCriteria, DEFAULT_FILTER_CRITERIA } from './value-objects/FilterCriteria';
export { Timestamp } from './value-objects/Timestamp';

// Domain Events
export type { DomainEvent } from './events/DomainEvent';
export { TodoCreated } from './events/TodoCreated';
export { TodoCompleted } from './events/TodoCompleted';
export { TodoReopened } from './events/TodoReopened';
export { TodoTitleUpdated } from './events/TodoTitleUpdated';
export { TodoDeleted } from './events/TodoDeleted';

// Domain Errors
export { InvalidTitleError } from './errors/InvalidTitleError';
export { TodoNotFoundError } from './errors/TodoNotFoundError';
