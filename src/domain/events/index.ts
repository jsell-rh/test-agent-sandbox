import { TodoId } from '../value-objects/TodoId';
import { TodoTitle } from '../value-objects/TodoTitle';
import { Timestamp } from '../value-objects/Timestamp';

/**
 * Domain Events for the Todo Management bounded context.
 * All events are immutable records emitted by the Aggregate after a state change is applied.
 *
 * Spec-Ref: specs/domain-model.spec.md — Domain Events
 */

export class TodoCreated {
  constructor(
    readonly todoId: TodoId,
    readonly title: TodoTitle,
    readonly occurredAt: Timestamp,
  ) {}
}

export class TodoCompleted {
  constructor(
    readonly todoId: TodoId,
    readonly occurredAt: Timestamp,
  ) {}
}

export class TodoReopened {
  constructor(
    readonly todoId: TodoId,
    readonly occurredAt: Timestamp,
  ) {}
}

export class TodoTitleUpdated {
  constructor(
    readonly todoId: TodoId,
    readonly newTitle: TodoTitle,
    readonly occurredAt: Timestamp,
  ) {}
}

export class TodoDeleted {
  constructor(
    readonly todoId: TodoId,
    readonly occurredAt: Timestamp,
  ) {}
}

/** Discriminated union of all domain events in this bounded context. */
export type DomainEvent =
  | TodoCreated
  | TodoCompleted
  | TodoReopened
  | TodoTitleUpdated
  | TodoDeleted;
