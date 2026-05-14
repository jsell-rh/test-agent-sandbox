/**
 * Tests for the Todo Aggregate Root.
 *
 * TDD plan coverage (spec §TDD Plan):
 *
 * Todo.create():
 *  ✓ Returns a Todo with status: active
 *  ✓ Assigns a non-null TodoId
 *  ✓ Emits exactly one TodoCreated event
 *  ✓ Raises InvalidTitleError when title is invalid
 *
 * todo.complete():
 *  ✓ Transitions active -> completed, emits TodoCompleted
 *  ✓ Calling on already-completed Todo: no state change, no event emitted
 *
 * todo.reopen():
 *  ✓ Transitions completed -> active, emits TodoReopened
 *  ✓ Calling on already-active Todo: no state change, no event emitted
 *
 * todo.updateTitle():
 *  ✓ Updates title, emits TodoTitleUpdated
 *  ✓ Raises InvalidTitleError when new title is invalid
 *
 * Failure modes:
 *  ✓ Create with empty title → InvalidTitleError thrown before any persistence
 *  ✓ Update to whitespace title → InvalidTitleError thrown; original title unchanged
 *  ✓ Complete an already-completed Todo → idempotent no-op; no duplicate event
 *  ✓ Delete a non-existent TodoId → TodoNotFoundError thrown by Repository
 */

import { Todo } from '../domain/todo';
import { TodoTitle, TodoStatus } from '../domain/value-objects';
import { InvalidTitleError, TodoNotFoundError } from '../domain/errors';
import type { TodoCreated, TodoCompleted, TodoReopened, TodoTitleUpdated, TodoDeleted } from '../domain/events';
import {
  makeTodo,
  makeTitle,
  makeCompletedTodo,
  assertSingleEvent,
  UUID_V4_PATTERN,
  ISO_TIMESTAMP_PATTERN,
  InMemoryTodoRepository,
} from './helpers';

// ---------------------------------------------------------------------------
// Todo.create()
// ---------------------------------------------------------------------------

describe('Todo.create()', () => {
  it('returns a Todo with status active', () => {
    const todo = makeTodo();
    expect(todo.status).toBe(TodoStatus.Active);
  });

  it('assigns a non-null TodoId (UUID v4)', () => {
    const todo = makeTodo();
    expect(todo.id).toBeTruthy();
    expect(todo.id).toMatch(UUID_V4_PATTERN);
  });

  it('emits exactly one TodoCreated event', () => {
    const todo = makeTodo('Write documentation');
    const events = todo.pullPendingEvents();
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe('TodoCreated');
  });

  it('TodoCreated event carries the correct todoId', () => {
    const todo = makeTodo();
    const events = todo.pullPendingEvents();
    const event = events[0] as TodoCreated;
    expect(event.todoId).toBe(todo.id);
  });

  it('TodoCreated event carries the correct title', () => {
    const todo = Todo.create(new TodoTitle('Buy milk'));
    const events = todo.pullPendingEvents();
    const event = events[0] as TodoCreated;
    expect(event.title.value).toBe('Buy milk');
  });

  it('TodoCreated event has a valid ISO timestamp', () => {
    const todo = makeTodo();
    const events = todo.pullPendingEvents();
    const event = events[0] as TodoCreated;
    expect(event.occurredAt).toMatch(ISO_TIMESTAMP_PATTERN);
  });

  it('sets createdAt and updatedAt to valid ISO timestamps', () => {
    const todo = makeTodo();
    expect(todo.createdAt).toMatch(ISO_TIMESTAMP_PATTERN);
    expect(todo.updatedAt).toMatch(ISO_TIMESTAMP_PATTERN);
  });

  it('createdAt equals updatedAt at creation', () => {
    const todo = makeTodo();
    expect(todo.createdAt).toBe(todo.updatedAt);
  });

  it('two Todos created in sequence have different IDs', () => {
    const a = makeTodo();
    const b = makeTodo();
    expect(a.id).not.toBe(b.id);
  });

  it('stores the provided title (trimmed)', () => {
    const todo = Todo.create(new TodoTitle('  Write tests  '));
    expect(todo.title.value).toBe('Write tests');
  });

  it('raises InvalidTitleError when the TodoTitle is blank', () => {
    expect(() => new TodoTitle('')).toThrow(InvalidTitleError);
  });

  it('raises InvalidTitleError before any side-effects when title is invalid', () => {
    // No repository involved — error must be thrown by TodoTitle constructor
    // before the Todo aggregate even gets a chance to call generateTodoId()
    const repo = new InMemoryTodoRepository();
    expect(() => {
      const todo = Todo.create(new TodoTitle(''));
      repo.save(todo);
    }).toThrow(InvalidTitleError);
    expect(repo.size()).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// todo.complete()
// ---------------------------------------------------------------------------

describe('todo.complete()', () => {
  it('transitions an active Todo to completed', () => {
    const todo = makeTodo();
    todo.pullPendingEvents(); // drain TodoCreated
    todo.complete();
    expect(todo.status).toBe(TodoStatus.Completed);
  });

  it('emits exactly one TodoCompleted event', () => {
    const todo = makeTodo();
    todo.pullPendingEvents();
    todo.complete();
    const events = todo.pullPendingEvents();
    assertSingleEvent<TodoCompleted>(events, 'TodoCompleted');
  });

  it('TodoCompleted event carries the correct todoId', () => {
    const todo = makeTodo();
    todo.pullPendingEvents();
    todo.complete();
    const events = todo.pullPendingEvents();
    expect((events[0] as TodoCompleted).todoId).toBe(todo.id);
  });

  it('updates updatedAt after completing', () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-01-01T00:00:00.000Z'));

    const todo = makeTodo();
    expect(todo.createdAt).toBe('2024-01-01T00:00:00.000Z');

    jest.setSystemTime(new Date('2024-01-01T00:00:01.000Z'));
    todo.pullPendingEvents();
    todo.complete();

    expect(todo.updatedAt).toBe('2024-01-01T00:00:01.000Z');
    expect(todo.updatedAt).not.toBe(todo.createdAt);

    jest.useRealTimers();
  });

  it('is idempotent — no state change when already completed', () => {
    const todo = makeCompletedTodo();
    const statusBefore = todo.status;
    const updatedAtBefore = todo.updatedAt;

    todo.complete(); // second call

    expect(todo.status).toBe(statusBefore);
    expect(todo.updatedAt).toBe(updatedAtBefore);
  });

  it('emits no event when already completed', () => {
    const todo = makeCompletedTodo();
    todo.complete(); // second call
    const events = todo.pullPendingEvents();
    expect(events).toHaveLength(0);
  });

  it('returns void when already completed', () => {
    const todo = makeCompletedTodo();
    const result = todo.complete();
    expect(result).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// todo.reopen()
// ---------------------------------------------------------------------------

describe('todo.reopen()', () => {
  it('transitions a completed Todo back to active', () => {
    const todo = makeCompletedTodo();
    todo.reopen();
    expect(todo.status).toBe(TodoStatus.Active);
  });

  it('emits exactly one TodoReopened event', () => {
    const todo = makeCompletedTodo();
    todo.reopen();
    const events = todo.pullPendingEvents();
    assertSingleEvent<TodoReopened>(events, 'TodoReopened');
  });

  it('TodoReopened event carries the correct todoId', () => {
    const todo = makeCompletedTodo();
    todo.reopen();
    const events = todo.pullPendingEvents();
    expect((events[0] as TodoReopened).todoId).toBe(todo.id);
  });

  it('updates updatedAt after reopening', () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-01-01T00:00:00.000Z'));

    const todo = makeTodo();
    todo.pullPendingEvents();
    todo.complete(); // move to completed first

    jest.setSystemTime(new Date('2024-01-01T00:00:02.000Z'));
    todo.pullPendingEvents();
    todo.reopen();

    expect(todo.updatedAt).toBe('2024-01-01T00:00:02.000Z');
    expect(todo.updatedAt).not.toBe(todo.createdAt);

    jest.useRealTimers();
  });

  it('is idempotent — no state change when already active', () => {
    const todo = makeTodo();
    todo.pullPendingEvents(); // drain TodoCreated
    const statusBefore = todo.status;
    const updatedAtBefore = todo.updatedAt;

    todo.reopen(); // already active

    expect(todo.status).toBe(statusBefore);
    expect(todo.updatedAt).toBe(updatedAtBefore);
  });

  it('emits no event when already active', () => {
    const todo = makeTodo();
    todo.pullPendingEvents();
    todo.reopen(); // no-op
    const events = todo.pullPendingEvents();
    expect(events).toHaveLength(0);
  });

  it('returns void when already active', () => {
    const todo = makeTodo();
    todo.pullPendingEvents();
    const result = todo.reopen();
    expect(result).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// todo.updateTitle()
// ---------------------------------------------------------------------------

describe('todo.updateTitle()', () => {
  it('updates the title of the Todo', () => {
    const todo = makeTodo('Old title');
    todo.pullPendingEvents();
    const newTitle = new TodoTitle('New title');
    todo.updateTitle(newTitle);
    expect(todo.title.value).toBe('New title');
  });

  it('emits exactly one TodoTitleUpdated event', () => {
    const todo = makeTodo();
    todo.pullPendingEvents();
    const newTitle = new TodoTitle('Updated task');
    todo.updateTitle(newTitle);
    const events = todo.pullPendingEvents();
    assertSingleEvent<TodoTitleUpdated>(events, 'TodoTitleUpdated');
  });

  it('TodoTitleUpdated event carries the new title', () => {
    const todo = makeTodo();
    todo.pullPendingEvents();
    const newTitle = new TodoTitle('Refactored title');
    todo.updateTitle(newTitle);
    const events = todo.pullPendingEvents();
    const event = events[0] as TodoTitleUpdated;
    expect(event.newTitle.value).toBe('Refactored title');
  });

  it('TodoTitleUpdated event carries the correct todoId', () => {
    const todo = makeTodo();
    todo.pullPendingEvents();
    todo.updateTitle(new TodoTitle('Something new'));
    const events = todo.pullPendingEvents();
    expect((events[0] as TodoTitleUpdated).todoId).toBe(todo.id);
  });

  it('updates updatedAt after updating the title', () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-01-01T00:00:00.000Z'));

    const todo = makeTodo('Original');
    jest.setSystemTime(new Date('2024-01-01T00:00:03.000Z'));
    todo.pullPendingEvents();
    todo.updateTitle(new TodoTitle('Updated'));

    expect(todo.updatedAt).toBe('2024-01-01T00:00:03.000Z');
    expect(todo.updatedAt).not.toBe(todo.createdAt);

    jest.useRealTimers();
  });

  it('raises InvalidTitleError when new title is blank', () => {
    const todo = makeTodo('Original title');
    todo.pullPendingEvents();
    expect(() => todo.updateTitle(new TodoTitle(''))).toThrow(InvalidTitleError);
  });

  it('raises InvalidTitleError when new title is whitespace-only', () => {
    const todo = makeTodo('Original title');
    todo.pullPendingEvents();
    expect(() => todo.updateTitle(new TodoTitle('   '))).toThrow(InvalidTitleError);
  });

  it('leaves the original title unchanged when the new title is invalid', () => {
    const todo = makeTodo('Original title');
    todo.pullPendingEvents();

    try {
      todo.updateTitle(new TodoTitle(''));
    } catch {
      // expected — InvalidTitleError
    }

    expect(todo.title.value).toBe('Original title');
  });

  it('emits no event when the new title is invalid', () => {
    const todo = makeTodo('Original title');
    todo.pullPendingEvents();

    try {
      todo.updateTitle(new TodoTitle(''));
    } catch {
      // expected
    }

    expect(todo.pullPendingEvents()).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// todo.delete()
// ---------------------------------------------------------------------------

describe('todo.delete()', () => {
  it('emits a TodoDeleted event', () => {
    const todo = makeTodo();
    todo.pullPendingEvents();
    todo.delete();
    const events = todo.pullPendingEvents();
    assertSingleEvent<TodoDeleted>(events, 'TodoDeleted');
  });

  it('TodoDeleted event carries the correct todoId', () => {
    const todo = makeTodo();
    todo.pullPendingEvents();
    todo.delete();
    const events = todo.pullPendingEvents();
    expect((events[0] as TodoDeleted).todoId).toBe(todo.id);
  });

  it('TodoDeleted event has a valid ISO timestamp', () => {
    const todo = makeTodo();
    todo.pullPendingEvents();
    todo.delete();
    const events = todo.pullPendingEvents();
    expect((events[0] as TodoDeleted).occurredAt).toMatch(ISO_TIMESTAMP_PATTERN);
  });

  it('updates updatedAt when delete is signalled', () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-01-01T00:00:00.000Z'));

    const todo = makeTodo();
    jest.setSystemTime(new Date('2024-01-01T00:00:04.000Z'));
    todo.pullPendingEvents();
    todo.delete();

    expect(todo.updatedAt).toBe('2024-01-01T00:00:04.000Z');
    expect(todo.updatedAt).not.toBe(todo.createdAt);

    jest.useRealTimers();
  });

  it('end-to-end: delete() event triggers repository removal', () => {
    const repo = new InMemoryTodoRepository();
    const todo = makeTodo('Task to delete');
    repo.save(todo);
    expect(repo.findById(todo.id)).not.toBeNull();

    // Application layer: aggregate signals deletion, then repository acts
    todo.delete();
    const events = todo.pullPendingEvents();
    const deleteEvent = events.find((e) => e.type === 'TodoDeleted');
    expect(deleteEvent).toBeDefined();

    // Repository removes the record
    repo.delete(todo.id);
    expect(repo.findById(todo.id)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// pullPendingEvents() behaviour
// ---------------------------------------------------------------------------

describe('pullPendingEvents()', () => {
  it('clears events after pulling', () => {
    const todo = makeTodo();
    todo.pullPendingEvents(); // first pull
    const second = todo.pullPendingEvents();
    expect(second).toHaveLength(0);
  });

  it('accumulates multiple events between pulls', () => {
    const todo = makeTodo();
    todo.pullPendingEvents(); // clear TodoCreated
    todo.complete();
    todo.reopen();
    const events = todo.pullPendingEvents();
    expect(events).toHaveLength(2);
    expect(events[0].type).toBe('TodoCompleted');
    expect(events[1].type).toBe('TodoReopened');
  });
});

// ---------------------------------------------------------------------------
// Reconstitute (persistence round-trip)
// ---------------------------------------------------------------------------

describe('Todo.reconstitute()', () => {
  it('restores a Todo from persisted fields without emitting events', () => {
    const original = makeTodo('Write docs');
    const id = original.id;
    const title = original.title;
    const status = original.status;
    const createdAt = original.createdAt;
    const updatedAt = original.updatedAt;
    original.pullPendingEvents(); // drain original's events

    const restored = Todo.reconstitute(id, title, status, createdAt, updatedAt);

    expect(restored.id).toBe(id);
    expect(restored.title.value).toBe('Write docs');
    expect(restored.status).toBe(TodoStatus.Active);
    expect(restored.createdAt).toBe(createdAt);
    expect(restored.updatedAt).toBe(updatedAt);
    // No events emitted during reconstitution
    expect(restored.pullPendingEvents()).toHaveLength(0);
  });

  it('allows command methods on reconstituted Todos', () => {
    const original = makeTodo();
    const restored = Todo.reconstitute(
      original.id,
      original.title,
      original.status,
      original.createdAt,
      original.updatedAt,
    );
    restored.complete();
    expect(restored.status).toBe(TodoStatus.Completed);
    const events = restored.pullPendingEvents();
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe('TodoCompleted');
  });
});

// ---------------------------------------------------------------------------
// InMemoryTodoRepository (fake — integration-style verification)
// ---------------------------------------------------------------------------

describe('InMemoryTodoRepository', () => {
  let repo: InMemoryTodoRepository;

  beforeEach(() => {
    repo = new InMemoryTodoRepository();
  });

  it('save() and findById() round-trip', () => {
    const todo = makeTodo('Task A');
    repo.save(todo);
    const found = repo.findById(todo.id);
    expect(found).toBe(todo);
  });

  it('findById() returns null for an unknown id', () => {
    expect(repo.findById('00000000-0000-4000-8000-000000000000')).toBeNull();
  });

  it('findAll() returns all saved Todos', () => {
    const a = makeTodo('Task A');
    const b = makeTodo('Task B');
    repo.save(a);
    repo.save(b);
    const all = repo.findAll();
    expect(all).toHaveLength(2);
    expect(all).toContain(a);
    expect(all).toContain(b);
  });

  it('delete() removes the Todo', () => {
    const todo = makeTodo();
    repo.save(todo);
    repo.delete(todo.id);
    expect(repo.findById(todo.id)).toBeNull();
  });

  it('delete() throws TodoNotFoundError for a non-existent TodoId', () => {
    expect(() => repo.delete('00000000-0000-4000-8000-000000000000')).toThrow(
      TodoNotFoundError,
    );
  });

  it('save() is idempotent — second save overwrites the first', () => {
    const todo = makeTodo();
    repo.save(todo);
    repo.save(todo);
    expect(repo.size()).toBe(1);
  });
});
