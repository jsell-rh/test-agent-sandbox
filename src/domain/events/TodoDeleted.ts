import type { DomainEvent } from './DomainEvent';

/**
 * Domain Event emitted when a Todo is permanently removed.
 */
export class TodoDeleted implements DomainEvent {
  readonly eventName = 'TodoDeleted';

  constructor(
    readonly todoId: string,
    readonly occurredAt: string,
  ) {}
}
