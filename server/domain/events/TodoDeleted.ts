import type { DomainEvent } from './DomainEvent.js'

export class TodoDeleted implements DomainEvent {
  readonly eventName = 'TodoDeleted'

  constructor(
    readonly todoId: string,
    readonly occurredAt: string,
  ) {}
}
