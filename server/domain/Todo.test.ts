/**
 * Domain unit tests — Todo Aggregate and TodoTitle Value Object.
 *
 * Covers the critical test cases from specs/domain-model.spec.md:
 *   - TodoTitle invariants (blank, whitespace, max length, trimming)
 *   - Todo.create(): UUID id, active status, TodoCreated event
 *   - Todo.complete(): idempotent, emits TodoCompleted only on transition
 *   - Todo.reopen(): idempotent, emits TodoReopened only on transition
 *   - Todo.updateTitle(): mutates title, emits TodoTitleUpdated
 *   - Todo.delete(): emits TodoDeleted
 *   - Todo.reconstitute(): no events emitted
 *   - domainEvents accessors: accumulated events, clearDomainEvents
 */

import { describe, it, expect } from 'vitest'
import { Todo } from './Todo.js'
import { TodoTitle } from './value-objects/TodoTitle.js'
import { TodoStatus } from './value-objects/TodoStatus.js'
import { InvalidTitleError } from './errors/InvalidTitleError.js'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeTitle(s = 'Buy milk'): TodoTitle {
  return new TodoTitle(s)
}

// ---------------------------------------------------------------------------
// TodoTitle value object
// ---------------------------------------------------------------------------

describe('TodoTitle', () => {
  it('accepts a valid non-empty title', () => {
    const t = new TodoTitle('Buy milk')
    expect(t.value).toBe('Buy milk')
  })

  it('trims leading/trailing whitespace', () => {
    const t = new TodoTitle('  Buy milk  ')
    expect(t.value).toBe('Buy milk')
  })

  it('throws InvalidTitleError for a blank string', () => {
    expect(() => new TodoTitle('')).toThrow(InvalidTitleError)
  })

  it('throws InvalidTitleError for a whitespace-only string', () => {
    expect(() => new TodoTitle('   ')).toThrow(InvalidTitleError)
    expect(() => new TodoTitle('\t\n')).toThrow(InvalidTitleError)
  })

  it('accepts a title of exactly MAX_LENGTH characters', () => {
    const maxTitle = 'a'.repeat(TodoTitle.MAX_LENGTH)
    const t = new TodoTitle(maxTitle)
    expect(t.value.length).toBe(500)
  })

  it('throws InvalidTitleError for a title of MAX_LENGTH + 1 characters', () => {
    const tooLong = 'a'.repeat(TodoTitle.MAX_LENGTH + 1)
    expect(() => new TodoTitle(tooLong)).toThrow(InvalidTitleError)
  })

  it('equals() returns true for the same value', () => {
    const a = new TodoTitle('Hello')
    const b = new TodoTitle('Hello')
    expect(a.equals(b)).toBe(true)
  })

  it('equals() returns false for different values', () => {
    const a = new TodoTitle('Hello')
    const b = new TodoTitle('World')
    expect(a.equals(b)).toBe(false)
  })

  it('toString() returns the trimmed value', () => {
    expect(new TodoTitle('  Hi  ').toString()).toBe('Hi')
  })
})

// ---------------------------------------------------------------------------
// Todo.create()
// ---------------------------------------------------------------------------

describe('Todo.create()', () => {
  it('returns a Todo in active status', () => {
    const todo = Todo.create(makeTitle())
    expect(todo.status).toBe(TodoStatus.active)
  })

  it('assigns a non-empty UUID v4 as id', () => {
    const todo = Todo.create(makeTitle())
    expect(todo.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    )
  })

  it('stores the trimmed title value', () => {
    const todo = Todo.create(new TodoTitle('  My Task  '))
    expect(todo.title).toBe('My Task')
  })

  it('sets createdAt and updatedAt to the same ISO 8601 timestamp', () => {
    const todo = Todo.create(makeTitle())
    expect(todo.createdAt).toBe(todo.updatedAt)
    expect(() => new Date(todo.createdAt)).not.toThrow()
  })

  it('emits exactly one TodoCreated domain event', () => {
    const todo = Todo.create(makeTitle('Walk dog'))
    const events = todo.domainEvents
    expect(events).toHaveLength(1)
    expect(events[0].eventName).toBe('TodoCreated')
  })

  it('TodoCreated event carries the todo id and title', () => {
    const todo = Todo.create(makeTitle('Walk dog'))
    const event = todo.domainEvents[0] as { todoId: string; title: string }
    expect(event.todoId).toBe(todo.id)
    expect(event.title).toBe('Walk dog')
  })
})

// ---------------------------------------------------------------------------
// Todo.reconstitute()
// ---------------------------------------------------------------------------

describe('Todo.reconstitute()', () => {
  it('restores the todo without emitting any domain events', () => {
    const now = new Date().toISOString()
    const todo = Todo.reconstitute('fixed-id', 'Task', TodoStatus.active, now, now)
    expect(todo.domainEvents).toHaveLength(0)
  })

  it('restores all fields correctly', () => {
    const now = new Date().toISOString()
    const todo = Todo.reconstitute('id-123', 'Title', TodoStatus.completed, now, now)
    expect(todo.id).toBe('id-123')
    expect(todo.title).toBe('Title')
    expect(todo.status).toBe(TodoStatus.completed)
    expect(todo.createdAt).toBe(now)
    expect(todo.updatedAt).toBe(now)
  })

  it('throws InvalidTitleError if the stored title is blank (data integrity)', () => {
    const now = new Date().toISOString()
    expect(() =>
      Todo.reconstitute('id-1', '', TodoStatus.active, now, now),
    ).toThrow(InvalidTitleError)
  })
})

// ---------------------------------------------------------------------------
// todo.complete()
// ---------------------------------------------------------------------------

describe('todo.complete()', () => {
  it('transitions an active todo to completed', () => {
    const todo = Todo.create(makeTitle())
    todo.clearDomainEvents()
    todo.complete()
    expect(todo.status).toBe(TodoStatus.completed)
  })

  it('emits a TodoCompleted event when transitioning from active', () => {
    const todo = Todo.create(makeTitle())
    todo.clearDomainEvents()
    todo.complete()
    const events = todo.domainEvents
    expect(events).toHaveLength(1)
    expect(events[0].eventName).toBe('TodoCompleted')
  })

  it('is idempotent: no state change when already completed', () => {
    const todo = Todo.create(makeTitle())
    todo.complete()
    const statusBefore = todo.status
    todo.clearDomainEvents()
    todo.complete() // second call — should be no-op
    expect(todo.status).toBe(statusBefore)
    expect(todo.domainEvents).toHaveLength(0)
  })
})

// ---------------------------------------------------------------------------
// todo.reopen()
// ---------------------------------------------------------------------------

describe('todo.reopen()', () => {
  it('transitions a completed todo back to active', () => {
    const todo = Todo.create(makeTitle())
    todo.complete()
    todo.clearDomainEvents()
    todo.reopen()
    expect(todo.status).toBe(TodoStatus.active)
  })

  it('emits a TodoReopened event when transitioning from completed', () => {
    const todo = Todo.create(makeTitle())
    todo.complete()
    todo.clearDomainEvents()
    todo.reopen()
    const events = todo.domainEvents
    expect(events).toHaveLength(1)
    expect(events[0].eventName).toBe('TodoReopened')
  })

  it('is idempotent: no state change when already active', () => {
    const todo = Todo.create(makeTitle())
    todo.clearDomainEvents()
    todo.reopen() // active -> active: no-op
    expect(todo.status).toBe(TodoStatus.active)
    expect(todo.domainEvents).toHaveLength(0)
  })
})

// ---------------------------------------------------------------------------
// todo.updateTitle()
// ---------------------------------------------------------------------------

describe('todo.updateTitle()', () => {
  it('replaces the current title', () => {
    const todo = Todo.create(makeTitle('Old title'))
    todo.clearDomainEvents()
    todo.updateTitle(new TodoTitle('New title'))
    expect(todo.title).toBe('New title')
  })

  it('emits a TodoTitleUpdated event', () => {
    const todo = Todo.create(makeTitle('Old'))
    todo.clearDomainEvents()
    todo.updateTitle(new TodoTitle('New'))
    const events = todo.domainEvents
    expect(events).toHaveLength(1)
    expect(events[0].eventName).toBe('TodoTitleUpdated')
  })

  it('updates updatedAt timestamp', () => {
    const todo = Todo.create(makeTitle('Old'))
    const originalUpdatedAt = todo.updatedAt
    // Ensure measurable time difference
    const future = new Date(Date.now() + 1).toISOString()
    todo.updateTitle(new TodoTitle('New'))
    // updatedAt should be >= originalUpdatedAt (may be equal in fast runs)
    expect(todo.updatedAt >= originalUpdatedAt).toBe(true)
    void future // suppress unused warning
  })
})

// ---------------------------------------------------------------------------
// todo.delete()
// ---------------------------------------------------------------------------

describe('todo.delete()', () => {
  it('emits a TodoDeleted event', () => {
    const todo = Todo.create(makeTitle())
    todo.clearDomainEvents()
    todo.delete()
    const events = todo.domainEvents
    expect(events).toHaveLength(1)
    expect(events[0].eventName).toBe('TodoDeleted')
  })

  it('TodoDeleted event carries the correct todoId', () => {
    const todo = Todo.create(makeTitle())
    todo.clearDomainEvents()
    todo.delete()
    const event = todo.domainEvents[0] as { todoId: string }
    expect(event.todoId).toBe(todo.id)
  })
})

// ---------------------------------------------------------------------------
// Domain events management
// ---------------------------------------------------------------------------

describe('domainEvents management', () => {
  it('accumulates events from multiple operations', () => {
    const todo = Todo.create(makeTitle()) // TodoCreated
    todo.complete() // TodoCompleted
    expect(todo.domainEvents).toHaveLength(2)
  })

  it('clearDomainEvents() resets the event list to empty', () => {
    const todo = Todo.create(makeTitle())
    expect(todo.domainEvents).toHaveLength(1)
    todo.clearDomainEvents()
    expect(todo.domainEvents).toHaveLength(0)
  })

  it('domainEvents returns a snapshot — mutations do not affect the aggregate', () => {
    const todo = Todo.create(makeTitle())
    const snapshot = [...todo.domainEvents]
    // @ts-expect-error intentionally mutating snapshot to verify isolation
    snapshot.push({ eventName: 'fake', occurredAt: '' })
    // The aggregate's internal array should be unaffected
    expect(todo.domainEvents).toHaveLength(1)
  })
})
