import type { DomainEvent } from './DomainEvent.js'

export class TodoTitleUpdated implements DomainEvent {
  readonly eventName = 'TodoTitleUpdated'

  constructor(
    readonly todoId: string,
    readonly newTitle: string,
    readonly occurredAt: string,
  ) {}
}
