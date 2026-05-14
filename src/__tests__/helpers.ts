/**
 * Shared test helpers and fakes.
 *
 * Uses fakes (real in-memory implementations) instead of mocks.
 */

import { Todo } from '../domain/todo';
import { TodoTitle, TodoStatus, type TodoId } from '../domain/value-objects';
import { TodoNotFoundError } from '../domain/errors';
import type { TodoRepository } from '../domain/repository';
import type { DomainEvent } from '../domain/events';

// ---------------------------------------------------------------------------
// UUID v4 regex — for asserting generated IDs look correct
// ---------------------------------------------------------------------------

export const UUID_V4_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// ---------------------------------------------------------------------------
// ISO 8601 UTC timestamp regex
// ---------------------------------------------------------------------------

export const ISO_TIMESTAMP_PATTERN =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

// ---------------------------------------------------------------------------
// Factory helpers for tests
// ---------------------------------------------------------------------------

/** Create a valid TodoTitle without boilerplate. */
export function makeTitle(value = 'Buy groceries'): TodoTitle {
  return new TodoTitle(value);
}

/** Create a valid, active Todo. */
export function makeTodo(titleValue = 'Buy groceries'): Todo {
  return Todo.create(makeTitle(titleValue));
}

/** Create a completed Todo (drains TodoCreated event). */
export function makeCompletedTodo(titleValue = 'Buy groceries'): Todo {
  const todo = makeTodo(titleValue);
  todo.pullPendingEvents(); // clear TodoCreated
  todo.complete();
  todo.pullPendingEvents(); // clear TodoCompleted
  return todo;
}

// ---------------------------------------------------------------------------
// InMemoryTodoRepository — fake implementation for integration-style tests
// ---------------------------------------------------------------------------

export class InMemoryTodoRepository implements TodoRepository {
  private readonly store = new Map<TodoId, Todo>();

  findById(id: TodoId): Todo | null {
    return this.store.get(id) ?? null;
  }

  findAll(): Todo[] {
    return [...this.store.values()];
  }

  save(todo: Todo): void {
    this.store.set(todo.id, todo);
  }

  delete(id: TodoId): void {
    if (!this.store.has(id)) {
      throw new TodoNotFoundError(id);
    }
    this.store.delete(id);
  }

  /** Test helper: return the count of stored todos. */
  size(): number {
    return this.store.size;
  }
}

// ---------------------------------------------------------------------------
// Event assertion helpers
// ---------------------------------------------------------------------------

/** Assert that exactly one event of the given type was emitted. */
export function assertSingleEvent<T extends DomainEvent>(
  events: DomainEvent[],
  type: T['type'],
): T {
  expect(events).toHaveLength(1);
  expect(events[0].type).toBe(type);
  return events[0] as T;
}
