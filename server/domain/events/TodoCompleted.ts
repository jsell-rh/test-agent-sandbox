import type { DomainEvent } from './DomainEvent.js'

export class TodoCompleted implements DomainEvent {
  readonly eventName = 'TodoCompleted'

  constructor(
    readonly todoId: string,
    readonly occurredAt: string,
  ) {}
}
