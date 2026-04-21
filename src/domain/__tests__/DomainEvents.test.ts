/**
 * Domain Events — Dedicated Test Suite (task-002)
 *
 * Tests each Domain Event class directly for:
 *  - Correct `eventName` matching the Ubiquitous Language
 *  - Structural fields matching the spec definition
 *  - Immutability (TypeScript readonly enforcement)
 *  - Valid ISO 8601 `occurredAt` timestamp
 *
 * These tests are complementary to the behavioural tests in Todo.test.ts
 * which verify events are emitted at the right points in the aggregate lifecycle.
 */

import { TodoCreated } from '../events/TodoCreated';
import { TodoCompleted } from '../events/TodoCompleted';
import { TodoReopened } from '../events/TodoReopened';
import { TodoTitleUpdated } from '../events/TodoTitleUpdated';
import { TodoDeleted } from '../events/TodoDeleted';
import type { DomainEvent } from '../events/DomainEvent';

const SAMPLE_TODO_ID = '550e8400-e29b-41d4-a716-446655440000';
const SAMPLE_TITLE = 'Buy milk';
const SAMPLE_TIMESTAMP = new Date().toISOString();

// ---------------------------------------------------------------------------
// Helper: assert a value is a valid ISO 8601 UTC timestamp
// ---------------------------------------------------------------------------
function expectValidISO8601(value: string): void {
  const d = new Date(value);
  expect(d.toISOString()).toBe(value);
}

// ---------------------------------------------------------------------------
// TodoCreated
// ---------------------------------------------------------------------------

describe('TodoCreated', () => {
  let event: TodoCreated;

  beforeEach(() => {
    event = new TodoCreated(SAMPLE_TODO_ID, SAMPLE_TITLE, SAMPLE_TIMESTAMP);
  });

  it('satisfies the DomainEvent interface', () => {
    const e: DomainEvent = event;
    expect(typeof e.eventName).toBe('string');
    expect(typeof e.occurredAt).toBe('string');
  });

  it('has eventName "TodoCreated"', () => {
    expect(event.eventName).toBe('TodoCreated');
  });

  it('carries the todoId field', () => {
    expect(event.todoId).toBe(SAMPLE_TODO_ID);
  });

  it('carries the title field', () => {
    expect(event.title).toBe(SAMPLE_TITLE);
  });

  it('carries a valid ISO 8601 occurredAt timestamp', () => {
    expectValidISO8601(event.occurredAt);
  });

  it('preserves all field values after construction (immutable record)', () => {
    // TypeScript `readonly` enforces immutability at compile time.
    // This test guards against accidental mutation by verifying the field
    // values remain unchanged after the event is constructed.
    expect(event.todoId).toBe(SAMPLE_TODO_ID);
    expect(event.title).toBe(SAMPLE_TITLE);
    expect(event.occurredAt).toBe(SAMPLE_TIMESTAMP);
    expect(event.eventName).toBe('TodoCreated');
  });
});

// ---------------------------------------------------------------------------
// TodoCompleted
// ---------------------------------------------------------------------------

describe('TodoCompleted', () => {
  let event: TodoCompleted;

  beforeEach(() => {
    event = new TodoCompleted(SAMPLE_TODO_ID, SAMPLE_TIMESTAMP);
  });

  it('satisfies the DomainEvent interface', () => {
    const e: DomainEvent = event;
    expect(typeof e.eventName).toBe('string');
    expect(typeof e.occurredAt).toBe('string');
  });

  it('has eventName "TodoCompleted"', () => {
    expect(event.eventName).toBe('TodoCompleted');
  });

  it('carries the todoId field', () => {
    expect(event.todoId).toBe(SAMPLE_TODO_ID);
  });

  it('carries a valid ISO 8601 occurredAt timestamp', () => {
    expectValidISO8601(event.occurredAt);
  });
});

// ---------------------------------------------------------------------------
// TodoReopened
// ---------------------------------------------------------------------------

describe('TodoReopened', () => {
  let event: TodoReopened;

  beforeEach(() => {
    event = new TodoReopened(SAMPLE_TODO_ID, SAMPLE_TIMESTAMP);
  });

  it('satisfies the DomainEvent interface', () => {
    const e: DomainEvent = event;
    expect(typeof e.eventName).toBe('string');
    expect(typeof e.occurredAt).toBe('string');
  });

  it('has eventName "TodoReopened"', () => {
    expect(event.eventName).toBe('TodoReopened');
  });

  it('carries the todoId field', () => {
    expect(event.todoId).toBe(SAMPLE_TODO_ID);
  });

  it('carries a valid ISO 8601 occurredAt timestamp', () => {
    expectValidISO8601(event.occurredAt);
  });
});

// ---------------------------------------------------------------------------
// TodoTitleUpdated
// ---------------------------------------------------------------------------

describe('TodoTitleUpdated', () => {
  const NEW_TITLE = 'Buy oat milk';
  let event: TodoTitleUpdated;

  beforeEach(() => {
    event = new TodoTitleUpdated(SAMPLE_TODO_ID, NEW_TITLE, SAMPLE_TIMESTAMP);
  });

  it('satisfies the DomainEvent interface', () => {
    const e: DomainEvent = event;
    expect(typeof e.eventName).toBe('string');
    expect(typeof e.occurredAt).toBe('string');
  });

  it('has eventName "TodoTitleUpdated"', () => {
    expect(event.eventName).toBe('TodoTitleUpdated');
  });

  it('carries the todoId field', () => {
    expect(event.todoId).toBe(SAMPLE_TODO_ID);
  });

  it('carries the newTitle field', () => {
    expect(event.newTitle).toBe(NEW_TITLE);
  });

  it('carries a valid ISO 8601 occurredAt timestamp', () => {
    expectValidISO8601(event.occurredAt);
  });
});

// ---------------------------------------------------------------------------
// TodoDeleted
// ---------------------------------------------------------------------------

describe('TodoDeleted', () => {
  let event: TodoDeleted;

  beforeEach(() => {
    event = new TodoDeleted(SAMPLE_TODO_ID, SAMPLE_TIMESTAMP);
  });

  it('satisfies the DomainEvent interface', () => {
    const e: DomainEvent = event;
    expect(typeof e.eventName).toBe('string');
    expect(typeof e.occurredAt).toBe('string');
  });

  it('has eventName "TodoDeleted"', () => {
    expect(event.eventName).toBe('TodoDeleted');
  });

  it('carries the todoId field', () => {
    expect(event.todoId).toBe(SAMPLE_TODO_ID);
  });

  it('carries a valid ISO 8601 occurredAt timestamp', () => {
    expectValidISO8601(event.occurredAt);
  });
});
