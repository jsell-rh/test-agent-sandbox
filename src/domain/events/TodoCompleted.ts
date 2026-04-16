import type { DomainEvent } from './DomainEvent';

/**
 * Domain Event emitted when a Todo transitions to `completed`.
 */
export class TodoCompleted implements DomainEvent {
  readonly eventName = 'TodoCompleted';

  constructor(
    readonly todoId: string,
    readonly occurredAt: string,
  ) {}
}
