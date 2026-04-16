import type { DomainEvent } from './DomainEvent';

/**
 * Domain Event emitted when a Todo transitions back to `active`.
 */
export class TodoReopened implements DomainEvent {
  readonly eventName = 'TodoReopened';

  constructor(
    readonly todoId: string,
    readonly occurredAt: string,
  ) {}
}
