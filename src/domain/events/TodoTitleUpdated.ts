import type { DomainEvent } from './DomainEvent';

/**
 * Domain Event emitted when a Todo's title is changed.
 */
export class TodoTitleUpdated implements DomainEvent {
  readonly eventName = 'TodoTitleUpdated';

  constructor(
    readonly todoId: string,
    readonly newTitle: string,
    readonly occurredAt: string,
  ) {}
}
