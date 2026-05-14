/**
 * Todo — Aggregate Root for the Todo bounded context.
 *
 * All business rules and invariants are enforced here, inside the Aggregate.
 * No anemic model; no logic in services.
 *
 * Entry point: `Todo.create(title)` — the only public factory.
 * Persistence load: `Todo.reconstitute(...)` — bypasses event emission.
 */

import {
  type TodoId,
  type TodoStatus,
  type Timestamp,
  TodoTitle,
  generateTodoId,
  currentTimestamp,
} from './value-objects';
import { TodoStatus as TodoStatusValues } from './value-objects';
import type {
  DomainEvent,
  TodoCreated,
  TodoCompleted,
  TodoReopened,
  TodoTitleUpdated,
  TodoDeleted,
} from './events';

export class Todo {
  private readonly _id: TodoId;
  private _title: TodoTitle;
  private _status: TodoStatus;
  private readonly _createdAt: Timestamp;
  private _updatedAt: Timestamp;

  /** Domain events accumulated since last `pullPendingEvents()` call. */
  private _pendingEvents: DomainEvent[] = [];

  // -------------------------------------------------------------------------
  // Private constructor — use factory methods only
  // -------------------------------------------------------------------------

  private constructor(
    id: TodoId,
    title: TodoTitle,
    status: TodoStatus,
    createdAt: Timestamp,
    updatedAt: Timestamp,
  ) {
    this._id = id;
    this._title = title;
    this._status = status;
    this._createdAt = createdAt;
    this._updatedAt = updatedAt;
  }

  // -------------------------------------------------------------------------
  // Factory method (Invariant 5: cannot be created without a TodoTitle)
  // -------------------------------------------------------------------------

  /**
   * Create a new Todo with a validated title.
   * Assigns a new TodoId, sets status to `active`, emits `TodoCreated`.
   */
  static create(title: TodoTitle): Todo {
    const id = generateTodoId();
    const now = currentTimestamp();
    const todo = new Todo(id, title, TodoStatusValues.Active, now, now);

    const event: TodoCreated = Object.freeze({
      type: 'TodoCreated',
      todoId: id,
      title,
      occurredAt: now,
    });

    todo._pendingEvents.push(event);
    return todo;
  }

  /**
   * Reconstitute a Todo from persisted state WITHOUT emitting events.
   * For use by the repository / infrastructure layer only.
   */
  static reconstitute(
    id: TodoId,
    title: TodoTitle,
    status: TodoStatus,
    createdAt: Timestamp,
    updatedAt: Timestamp,
  ): Todo {
    return new Todo(id, title, status, createdAt, updatedAt);
  }

  // -------------------------------------------------------------------------
  // Read-only accessors
  // -------------------------------------------------------------------------

  get id(): TodoId {
    return this._id;
  }

  get title(): TodoTitle {
    return this._title;
  }

  get status(): TodoStatus {
    return this._status;
  }

  get createdAt(): Timestamp {
    return this._createdAt;
  }

  get updatedAt(): Timestamp {
    return this._updatedAt;
  }

  // -------------------------------------------------------------------------
  // Domain event collection
  // -------------------------------------------------------------------------

  /**
   * Return all pending domain events and clear the internal buffer.
   * Callers (application layer, repositories) drain this after each operation.
   */
  pullPendingEvents(): DomainEvent[] {
    const events = [...this._pendingEvents];
    this._pendingEvents = [];
    return events;
  }

  // -------------------------------------------------------------------------
  // Command methods
  // -------------------------------------------------------------------------

  /**
   * Mark this Todo as completed.
   * Invariant 3: idempotent — calling on an already-completed Todo is a no-op.
   */
  complete(): TodoCompleted | void {
    if (this._status === TodoStatusValues.Completed) {
      return;
    }

    this._status = TodoStatusValues.Completed;
    this._updatedAt = currentTimestamp();

    const event: TodoCompleted = Object.freeze({
      type: 'TodoCompleted',
      todoId: this._id,
      occurredAt: this._updatedAt,
    });

    this._pendingEvents.push(event);
    return event;
  }

  /**
   * Return this Todo to active status.
   * Invariant 4: idempotent — calling on an already-active Todo is a no-op.
   */
  reopen(): TodoReopened | void {
    if (this._status === TodoStatusValues.Active) {
      return;
    }

    this._status = TodoStatusValues.Active;
    this._updatedAt = currentTimestamp();

    const event: TodoReopened = Object.freeze({
      type: 'TodoReopened',
      todoId: this._id,
      occurredAt: this._updatedAt,
    });

    this._pendingEvents.push(event);
    return event;
  }

  /**
   * Replace the title of this Todo.
   * Invariant 1 & 2 are enforced by TodoTitle's constructor.
   */
  updateTitle(newTitle: TodoTitle): TodoTitleUpdated {
    this._title = newTitle;
    this._updatedAt = currentTimestamp();

    const event: TodoTitleUpdated = Object.freeze({
      type: 'TodoTitleUpdated',
      todoId: this._id,
      newTitle,
      occurredAt: this._updatedAt,
    });

    this._pendingEvents.push(event);
    return event;
  }

  /**
   * Signal that this Todo should be permanently removed.
   * Actual deletion is delegated to the TodoRepository.
   */
  delete(): TodoDeleted {
    const now = currentTimestamp();

    const event: TodoDeleted = Object.freeze({
      type: 'TodoDeleted',
      todoId: this._id,
      occurredAt: now,
    });

    this._pendingEvents.push(event);
    return event;
  }
}
