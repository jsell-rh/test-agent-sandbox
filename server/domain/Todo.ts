import { v4 as uuidv4 } from 'uuid'
import { TodoTitle } from './value-objects/TodoTitle.js'
import { TodoStatus } from './value-objects/TodoStatus.js'
import { Timestamp } from './value-objects/Timestamp.js'
import type { DomainEvent } from './events/DomainEvent.js'
import { TodoCreated } from './events/TodoCreated.js'
import { TodoCompleted } from './events/TodoCompleted.js'
import { TodoReopened } from './events/TodoReopened.js'
import { TodoTitleUpdated } from './events/TodoTitleUpdated.js'
import { TodoDeleted } from './events/TodoDeleted.js'

/**
 * Todo — Aggregate Root of the Todo Management Bounded Context.
 *
 * Enforces all business invariants around Todo lifecycle:
 * creation, title updates, status transitions, and deletion.
 *
 * All business logic lives here. There are no Domain Services.
 * An Anemic Domain Model (logic in Services, dumb entities) is explicitly rejected.
 */
export class Todo {
  private readonly _id: string
  private _title: string
  private _status: TodoStatus
  private readonly _createdAt: string
  private _updatedAt: string
  private _domainEvents: DomainEvent[] = []

  private constructor(
    id: string,
    title: string,
    status: TodoStatus,
    createdAt: string,
    updatedAt: string,
  ) {
    this._id = id
    this._title = title
    this._status = status
    this._createdAt = createdAt
    this._updatedAt = updatedAt
  }

  // ---------------------------------------------------------------------------
  // Factory Methods
  // ---------------------------------------------------------------------------

  /**
   * Create a new Todo.
   *
   * Validates the title invariants, assigns a new TodoId (UUID v4), sets
   * status to `active`, records createdAt/updatedAt, and emits TodoCreated.
   *
   * Invariant 5: cannot be created without a valid TodoTitle.
   */
  static create(title: TodoTitle): Todo {
    const id = uuidv4()
    const now = Timestamp.now().value

    const todo = new Todo(id, title.value, TodoStatus.active, now, now)
    todo._record(new TodoCreated(id, title.value, now))
    return todo
  }

  /**
   * Reconstitute a Todo from persistent storage.
   *
   * Distinct from `create()`: does NOT emit any Domain Events.
   * Called exclusively by the persistence infrastructure when loading
   * a row from the database.
   *
   * Re-validates the title on reconstitution to maintain invariants.
   */
  static reconstitute(
    id: string,
    rawTitle: string,
    status: TodoStatus,
    createdAt: string,
    updatedAt: string,
  ): Todo {
    // Re-validate title invariants — throws InvalidTitleError on corrupt data
    new TodoTitle(rawTitle)
    return new Todo(id, rawTitle, status, createdAt, updatedAt)
  }

  // ---------------------------------------------------------------------------
  // Command Methods
  // ---------------------------------------------------------------------------

  /**
   * Transition to `completed`.
   *
   * Invariant 3: idempotent — calling complete() on an already-completed
   * Todo is a no-op: no state change, no event emitted.
   */
  complete(): void {
    if (this._status === TodoStatus.completed) {
      return // idempotent no-op
    }
    this._status = TodoStatus.completed
    this._updatedAt = Timestamp.now().value
    this._record(new TodoCompleted(this._id, this._updatedAt))
  }

  /**
   * Transition back to `active`.
   *
   * Invariant 4: idempotent — calling reopen() on an already-active
   * Todo is a no-op: no state change, no event emitted.
   */
  reopen(): void {
    if (this._status === TodoStatus.active) {
      return // idempotent no-op
    }
    this._status = TodoStatus.active
    this._updatedAt = Timestamp.now().value
    this._record(new TodoReopened(this._id, this._updatedAt))
  }

  /**
   * Replace the title of this Todo.
   *
   * Invariants 1 & 2 are enforced by the TodoTitle constructor; this method
   * validates before mutating so the original title is preserved on error.
   */
  updateTitle(newTitle: TodoTitle): void {
    this._title = newTitle.value
    this._updatedAt = Timestamp.now().value
    this._record(new TodoTitleUpdated(this._id, newTitle.value, this._updatedAt))
  }

  /**
   * Signal that this Todo should be permanently removed.
   *
   * The actual removal is delegated to the TodoRepository; this method
   * simply emits TodoDeleted so downstream handlers are notified.
   */
  delete(): void {
    const now = Timestamp.now().value
    this._updatedAt = now
    this._record(new TodoDeleted(this._id, now))
  }

  // ---------------------------------------------------------------------------
  // Domain Event Helpers
  // ---------------------------------------------------------------------------

  private _record(event: DomainEvent): void {
    this._domainEvents.push(event)
  }

  /** Return accumulated domain events (read-only view). */
  get domainEvents(): ReadonlyArray<DomainEvent> {
    return [...this._domainEvents]
  }

  /**
   * Clear accumulated domain events.
   *
   * Called by the Application Layer after events have been dispatched
   * (or by tests to isolate assertions to a single operation).
   */
  clearDomainEvents(): void {
    this._domainEvents = []
  }

  // ---------------------------------------------------------------------------
  // Read-only State
  // ---------------------------------------------------------------------------

  /** TodoId — UUID v4, immutable after creation. */
  get id(): string {
    return this._id
  }

  /** Current title value. */
  get title(): string {
    return this._title
  }

  /** Current lifecycle status. */
  get status(): TodoStatus {
    return this._status
  }

  /** ISO 8601 UTC timestamp when this Todo was created. Immutable. */
  get createdAt(): string {
    return this._createdAt
  }

  /** ISO 8601 UTC timestamp of the last mutation. */
  get updatedAt(): string {
    return this._updatedAt
  }
}
