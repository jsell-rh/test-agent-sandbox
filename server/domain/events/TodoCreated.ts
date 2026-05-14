import type { DomainEvent } from './DomainEvent.js'

export class TodoCreated implements DomainEvent {
  readonly eventName = 'TodoCreated'

  constructor(
    readonly todoId: string,
    readonly title: string,
    readonly occurredAt: string,
  ) {}
}
