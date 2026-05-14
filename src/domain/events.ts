/**
 * Domain Events for the Todo bounded context.
 *
 * Events are immutable records emitted by the Todo Aggregate after a
 * state change has been applied. They describe what happened in the past.
 */

import type { TodoId, Timestamp, TodoTitle } from './value-objects';

// ---------------------------------------------------------------------------
// Individual event shapes (all fields readonly for immutability)
// ---------------------------------------------------------------------------

export interface TodoCreated {
  readonly type: 'TodoCreated';
  readonly todoId: TodoId;
  readonly title: TodoTitle;
  readonly occurredAt: Timestamp;
}

export interface TodoCompleted {
  readonly type: 'TodoCompleted';
  readonly todoId: TodoId;
  readonly occurredAt: Timestamp;
}

export interface TodoReopened {
  readonly type: 'TodoReopened';
  readonly todoId: TodoId;
  readonly occurredAt: Timestamp;
}

export interface TodoTitleUpdated {
  readonly type: 'TodoTitleUpdated';
  readonly todoId: TodoId;
  readonly newTitle: TodoTitle;
  readonly occurredAt: Timestamp;
}

export interface TodoDeleted {
  readonly type: 'TodoDeleted';
  readonly todoId: TodoId;
  readonly occurredAt: Timestamp;
}

// ---------------------------------------------------------------------------
// Discriminated union of all domain events
// ---------------------------------------------------------------------------

export type DomainEvent =
  | TodoCreated
  | TodoCompleted
  | TodoReopened
  | TodoTitleUpdated
  | TodoDeleted;
