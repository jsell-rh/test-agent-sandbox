import { TodoId } from '../value-objects/TodoId';
import { TodoTitle } from '../value-objects/TodoTitle';
import { TodoStatus } from '../value-objects/TodoStatus';
import { Timestamp } from '../value-objects/Timestamp';
import {
  DomainEvent,
  TodoCreated,
  TodoCompleted,
  TodoReopened,
  TodoTitleUpdated,
  TodoDeleted,
} from '../events';

/**
 * Todo Aggregate Root.
 *
 * Manages the lifecycle of a Todo item and enforces all business invariants.
 * All domain logic lives here — no anemic service layer.
 *
 * Invariants enforced:
 *   1. TodoTitle must not be blank or exceed 500 chars (enforced by TodoTitle VO).
 *   2. complete() is idempotent — no-op if already completed.
 *   3. reopen()   is idempotent — no-op if already active.
 *   4. A Todo cannot be created without a valid TodoTitle.
 *
 * Spec-Ref: specs/domain-model.spec.md — Aggregates / Todo
 */
export class Todo {
  private readonly _id: TodoId;
  private _title: TodoTitle;
  private _status: TodoStatus;
  private readonly _createdAt: Timestamp;
  private _updatedAt: Timestamp;
  private readonly _domainEvents: DomainEvent[];

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
    this._domainEvents = [];
  }

  // ---------------------------------------------------------------------------
  // Factory
  // ---------------------------------------------------------------------------

  /**
   * Create a new Todo.
   *
   * Validates invariants via the TodoTitle value object, assigns a new TodoId,
   * sets status to active, and emits a TodoCreated event.
   */
  static create(title: TodoTitle): Todo {
    const now = Timestamp.now();
    const id = TodoId.generate();
    const todo = new Todo(id, title, TodoStatus.Active, now, now);
    todo._domainEvents.push(new TodoCreated(id, title, now));
    return todo;
  }

  // ---------------------------------------------------------------------------
  // Getters
  // ---------------------------------------------------------------------------

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

  /** All events accumulated since creation or last pullDomainEvents() call. */
  get domainEvents(): ReadonlyArray<DomainEvent> {
    return this._domainEvents;
  }

  // ---------------------------------------------------------------------------
  // Commands
  // ---------------------------------------------------------------------------

  /**
   * Mark this Todo as completed.
   * Idempotent — if already completed, returns void and emits no event.
   */
  complete(): TodoCompleted | void {
    if (this._status === TodoStatus.Completed) {
      return;
    }
    const now = Timestamp.now();
    this._status = TodoStatus.Completed;
    this._updatedAt = now;
    const event = new TodoCompleted(this._id, now);
    this._domainEvents.push(event);
    return event;
  }

  /**
   * Re-open a completed Todo back to active.
   * Idempotent — if already active, returns void and emits no event.
   */
  reopen(): TodoReopened | void {
    if (this._status === TodoStatus.Active) {
      return;
    }
    const now = Timestamp.now();
    this._status = TodoStatus.Active;
    this._updatedAt = now;
    const event = new TodoReopened(this._id, now);
    this._domainEvents.push(event);
    return event;
  }

  /**
   * Update the title of this Todo.
   * The TodoTitle value object enforces the no-blank / max-500-chars invariants.
   */
  updateTitle(newTitle: TodoTitle): TodoTitleUpdated {
    const now = Timestamp.now();
    this._title = newTitle;
    this._updatedAt = now;
    const event = new TodoTitleUpdated(this._id, newTitle, now);
    this._domainEvents.push(event);
    return event;
  }

  /**
   * Mark deletion intent and emit a TodoDeleted event.
   * Actual removal is delegated to the repository.
   */
  delete(): TodoDeleted {
    const now = Timestamp.now();
    this._updatedAt = now;
    const event = new TodoDeleted(this._id, now);
    this._domainEvents.push(event);
    return event;
  }
}
