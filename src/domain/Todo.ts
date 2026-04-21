import { v4 as uuidv4 } from 'uuid';
import { TodoTitle } from './value-objects/TodoTitle';
import { TodoStatus } from './value-objects/TodoStatus';
import { Timestamp } from './value-objects/Timestamp';
import type { DomainEvent } from './events/DomainEvent';
import { TodoCreated } from './events/TodoCreated';
import { TodoCompleted } from './events/TodoCompleted';
import { TodoReopened } from './events/TodoReopened';
import { TodoTitleUpdated } from './events/TodoTitleUpdated';
import { TodoDeleted } from './events/TodoDeleted';

/**
 * Todo — Aggregate Root of the Todo Management Bounded Context.
 *
 * Enforces all business invariants around Todo lifecycle:
 * creation, title updates, status transitions, and deletion.
 *
 * All business logic lives here. There are no Domain Services.
 */
export class Todo {
  private readonly _id: string;
  private _title: string;
  private _status: TodoStatus;
  private readonly _createdAt: string;
  private _updatedAt: string;
  private _domainEvents: DomainEvent[] = [];

  private constructor(
    id: string,
    title: string,
    status: TodoStatus,
    createdAt: string,
    updatedAt: string,
  ) {
    this._id = id;
    this._title = title;
    this._status = status;
    this._createdAt = createdAt;
    this._updatedAt = updatedAt;
  }

  // ---------------------------------------------------------------------------
  // Factory Method
  // ---------------------------------------------------------------------------

  /**
   * Create a new Todo.
   *
   * Validates the title invariants, assigns a new TodoId (UUID v4), sets
   * status to `active`, records createdAt/updatedAt, and emits TodoCreated.
   */
  static create(title: TodoTitle): Todo {
    // TodoTitle constructor already enforces the invariants; re-throw is fine.
    const id = uuidv4();
    const now = Timestamp.now().value;

    const todo = new Todo(id, title.value, TodoStatus.active, now, now);
    todo._record(new TodoCreated(id, title.value, now));
    return todo;
  }

  // ---------------------------------------------------------------------------
  // Command Methods
  // ---------------------------------------------------------------------------

  /**
   * Transition to `completed`.
   *
   * Invariant (§3): Calling complete() on an already-completed Todo is a
   * no-op — no state change, no event.
   */
  complete(): void {
    if (this._status === TodoStatus.completed) {
      return; // idempotent no-op
    }
    this._status = TodoStatus.completed;
    this._updatedAt = Timestamp.now().value;
    this._record(new TodoCompleted(this._id, this._updatedAt));
  }

  /**
   * Transition back to `active`.
   *
   * Invariant (§4): Calling reopen() on an already-active Todo is a
   * no-op — no state change, no event.
   */
  reopen(): void {
    if (this._status === TodoStatus.active) {
      return; // idempotent no-op
    }
    this._status = TodoStatus.active;
    this._updatedAt = Timestamp.now().value;
    this._record(new TodoReopened(this._id, this._updatedAt));
  }

  /**
   * Update the title.
   *
   * Validates the new title (may throw InvalidTitleError) before mutating
   * state, ensuring the original title is preserved on error.
   */
  updateTitle(newTitle: TodoTitle): void {
    // Validation already happened inside TodoTitle constructor.
    // If we reach here the title is valid.
    this._title = newTitle.value;
    this._updatedAt = Timestamp.now().value;
    this._record(new TodoTitleUpdated(this._id, newTitle.value, this._updatedAt));
  }

  /**
   * Mark intent to delete this Todo.
   *
   * The actual removal is delegated to the TodoRepository; this method
   * simply emits TodoDeleted so downstream handlers are notified.
   */
  delete(): void {
    const now = Timestamp.now().value;
    this._updatedAt = now;
    this._record(new TodoDeleted(this._id, now));
  }

  // ---------------------------------------------------------------------------
  // Domain Event Helpers
  // ---------------------------------------------------------------------------

  private _record(event: DomainEvent): void {
    this._domainEvents.push(event);
  }

  /** Return accumulated domain events (read-only view). */
  get domainEvents(): ReadonlyArray<DomainEvent> {
    return [...this._domainEvents];
  }

  /**
   * Clear accumulated domain events.
   *
   * Called by the Application Layer after events have been dispatched
   * (or by tests to isolate assertions to a single operation).
   */
  clearDomainEvents(): void {
    this._domainEvents = [];
  }

  // ---------------------------------------------------------------------------
  // Read-only State
  // ---------------------------------------------------------------------------

  /** TodoId — UUID v4, immutable after creation. */
  get id(): string {
    return this._id;
  }

  /** Current title value. */
  get title(): string {
    return this._title;
  }

  /** Current lifecycle status. */
  get status(): TodoStatus {
    return this._status;
  }

  /** ISO 8601 UTC timestamp when this Todo was created. Immutable. */
  get createdAt(): string {
    return this._createdAt;
  }

  /** ISO 8601 UTC timestamp of the last mutation. */
  get updatedAt(): string {
    return this._updatedAt;
  }
}
