// Aggregate Root
export { Todo } from './Todo.js'

// Repository Interface
export type { TodoRepository } from './TodoRepository.js'

// Value Objects
export { TodoTitle } from './value-objects/TodoTitle.js'
export { TodoStatus } from './value-objects/TodoStatus.js'
export { FilterCriteria, DEFAULT_FILTER_CRITERIA } from './value-objects/FilterCriteria.js'
export { Timestamp } from './value-objects/Timestamp.js'

// Domain Events
export type { DomainEvent } from './events/DomainEvent.js'
export { TodoCreated } from './events/TodoCreated.js'
export { TodoCompleted } from './events/TodoCompleted.js'
export { TodoReopened } from './events/TodoReopened.js'
export { TodoTitleUpdated } from './events/TodoTitleUpdated.js'
export { TodoDeleted } from './events/TodoDeleted.js'

// Domain Errors
export { InvalidTitleError } from './errors/InvalidTitleError.js'
export { TodoNotFoundError } from './errors/TodoNotFoundError.js'
