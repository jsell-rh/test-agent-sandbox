import type { DomainEvent } from './DomainEvent.js'

export class TodoReopened implements DomainEvent {
  readonly eventName = 'TodoReopened'

  constructor(
    readonly todoId: string,
    readonly occurredAt: string,
  ) {}
}
