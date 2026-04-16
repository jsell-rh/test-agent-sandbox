import type { DomainEvent } from './DomainEvent';

/**
 * Domain Event emitted when a new Todo is persisted.
 */
export class TodoCreated implements DomainEvent {
  readonly eventName = 'TodoCreated';

  constructor(
    readonly todoId: string,
    readonly title: string,
    readonly occurredAt: string,
  ) {}
}
