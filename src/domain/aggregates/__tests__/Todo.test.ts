import { Todo } from '../Todo';
import { TodoTitle } from '../../value-objects/TodoTitle';
import { TodoStatus } from '../../value-objects/TodoStatus';
import { InvalidTitleError } from '../../errors/InvalidTitleError';
import {
  TodoCreated,
  TodoCompleted,
  TodoReopened,
  TodoTitleUpdated,
  TodoDeleted,
} from '../../events';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeTitle(s: string): TodoTitle {
  return new TodoTitle(s);
}

// ---------------------------------------------------------------------------
// Todo.create()
// ---------------------------------------------------------------------------

describe('Todo.create()', () => {
  it('returns a Todo with status active', () => {
    const todo = Todo.create(makeTitle('Buy milk'));
    expect(todo.status).toBe(TodoStatus.Active);
  });

  it('assigns a non-null TodoId', () => {
    const todo = Todo.create(makeTitle('Buy milk'));
    expect(todo.id).toBeDefined();
    expect(todo.id.value).toBeTruthy();
  });

  it('stores the provided title', () => {
    const title = makeTitle('Buy milk');
    const todo = Todo.create(title);
    expect(todo.title.equals(title)).toBe(true);
  });

  it('emits exactly one TodoCreated event', () => {
    const todo = Todo.create(makeTitle('Buy milk'));
    expect(todo.domainEvents).toHaveLength(1);
    expect(todo.domainEvents[0]).toBeInstanceOf(TodoCreated);
  });

  it('emitted TodoCreated carries the correct todoId', () => {
    const todo = Todo.create(makeTitle('Buy milk'));
    const event = todo.domainEvents[0] as TodoCreated;
    expect(event.todoId.equals(todo.id)).toBe(true);
  });

  it('emitted TodoCreated carries the correct title', () => {
    const title = makeTitle('Buy milk');
    const todo = Todo.create(title);
    const event = todo.domainEvents[0] as TodoCreated;
    expect(event.title.equals(title)).toBe(true);
  });

  it('raises InvalidTitleError when title is blank', () => {
    expect(() => Todo.create(new TodoTitle(''))).toThrow(InvalidTitleError);
  });

  it('raises InvalidTitleError when title is whitespace-only', () => {
    expect(() => Todo.create(new TodoTitle('   '))).toThrow(InvalidTitleError);
  });

  it('sets createdAt', () => {
    const todo = Todo.create(makeTitle('Buy milk'));
    expect(todo.createdAt).toBeDefined();
    expect(todo.createdAt.value).toBeTruthy();
  });

  it('sets updatedAt equal to createdAt on creation', () => {
    const todo = Todo.create(makeTitle('Buy milk'));
    expect(todo.updatedAt.value).toBe(todo.createdAt.value);
  });

  it('assigns unique ids for different todos', () => {
    const a = Todo.create(makeTitle('Task A'));
    const b = Todo.create(makeTitle('Task B'));
    expect(a.id.equals(b.id)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// todo.complete()
// ---------------------------------------------------------------------------

describe('todo.complete()', () => {
  it('transitions active -> completed', () => {
    const todo = Todo.create(makeTitle('Buy milk'));
    todo.complete();
    expect(todo.status).toBe(TodoStatus.Completed);
  });

  it('returns a TodoCompleted event', () => {
    const todo = Todo.create(makeTitle('Buy milk'));
    const result = todo.complete();
    expect(result).toBeInstanceOf(TodoCompleted);
  });

  it('emitted TodoCompleted carries the correct todoId', () => {
    const todo = Todo.create(makeTitle('Buy milk'));
    const event = todo.complete() as TodoCompleted;
    expect(event.todoId.equals(todo.id)).toBe(true);
  });

  it('event appears in domainEvents', () => {
    const todo = Todo.create(makeTitle('Buy milk'));
    todo.complete();
    const completed = todo.domainEvents.filter(e => e instanceof TodoCompleted);
    expect(completed).toHaveLength(1);
  });

  it('is idempotent — returns void if already completed', () => {
    const todo = Todo.create(makeTitle('Buy milk'));
    todo.complete();
    const result = todo.complete();
    expect(result).toBeUndefined();
  });

  it('is idempotent — no additional event emitted on second call', () => {
    const todo = Todo.create(makeTitle('Buy milk'));
    todo.complete();
    const eventCountAfterFirst = todo.domainEvents.length;
    todo.complete();
    expect(todo.domainEvents.length).toBe(eventCountAfterFirst);
  });

  it('is idempotent — status remains completed after second call', () => {
    const todo = Todo.create(makeTitle('Buy milk'));
    todo.complete();
    todo.complete();
    expect(todo.status).toBe(TodoStatus.Completed);
  });
});

// ---------------------------------------------------------------------------
// todo.reopen()
// ---------------------------------------------------------------------------

describe('todo.reopen()', () => {
  it('transitions completed -> active', () => {
    const todo = Todo.create(makeTitle('Buy milk'));
    todo.complete();
    todo.reopen();
    expect(todo.status).toBe(TodoStatus.Active);
  });

  it('returns a TodoReopened event', () => {
    const todo = Todo.create(makeTitle('Buy milk'));
    todo.complete();
    const result = todo.reopen();
    expect(result).toBeInstanceOf(TodoReopened);
  });

  it('emitted TodoReopened carries the correct todoId', () => {
    const todo = Todo.create(makeTitle('Buy milk'));
    todo.complete();
    const event = todo.reopen() as TodoReopened;
    expect(event.todoId.equals(todo.id)).toBe(true);
  });

  it('event appears in domainEvents', () => {
    const todo = Todo.create(makeTitle('Buy milk'));
    todo.complete();
    todo.reopen();
    const reopened = todo.domainEvents.filter(e => e instanceof TodoReopened);
    expect(reopened).toHaveLength(1);
  });

  it('is idempotent — returns void if already active', () => {
    const todo = Todo.create(makeTitle('Buy milk'));
    const result = todo.reopen();
    expect(result).toBeUndefined();
  });

  it('is idempotent — no additional event emitted when already active', () => {
    const todo = Todo.create(makeTitle('Buy milk'));
    const eventCountBefore = todo.domainEvents.length;
    todo.reopen();
    expect(todo.domainEvents.length).toBe(eventCountBefore);
  });

  it('is idempotent — status remains active after second reopen call', () => {
    const todo = Todo.create(makeTitle('Buy milk'));
    todo.reopen();
    expect(todo.status).toBe(TodoStatus.Active);
  });
});

// ---------------------------------------------------------------------------
// todo.updateTitle()
// ---------------------------------------------------------------------------

describe('todo.updateTitle()', () => {
  it('updates the title to the new value', () => {
    const todo = Todo.create(makeTitle('Buy milk'));
    const newTitle = makeTitle('Buy eggs');
    todo.updateTitle(newTitle);
    expect(todo.title.equals(newTitle)).toBe(true);
  });

  it('returns a TodoTitleUpdated event', () => {
    const todo = Todo.create(makeTitle('Buy milk'));
    const result = todo.updateTitle(makeTitle('Buy eggs'));
    expect(result).toBeInstanceOf(TodoTitleUpdated);
  });

  it('emitted event carries the new title', () => {
    const todo = Todo.create(makeTitle('Buy milk'));
    const newTitle = makeTitle('Buy eggs');
    const event = todo.updateTitle(newTitle);
    expect(event.newTitle.equals(newTitle)).toBe(true);
  });

  it('emitted event carries the correct todoId', () => {
    const todo = Todo.create(makeTitle('Buy milk'));
    const event = todo.updateTitle(makeTitle('Buy eggs'));
    expect(event.todoId.equals(todo.id)).toBe(true);
  });

  it('event appears in domainEvents', () => {
    const todo = Todo.create(makeTitle('Buy milk'));
    todo.updateTitle(makeTitle('Buy eggs'));
    const updated = todo.domainEvents.filter(e => e instanceof TodoTitleUpdated);
    expect(updated).toHaveLength(1);
  });

  it('raises InvalidTitleError when the new title is blank', () => {
    const todo = Todo.create(makeTitle('Buy milk'));
    // TodoTitle invariant fires before updateTitle is reached
    expect(() => todo.updateTitle(new TodoTitle(''))).toThrow(InvalidTitleError);
  });

  it('raises InvalidTitleError when the new title is whitespace-only', () => {
    const todo = Todo.create(makeTitle('Buy milk'));
    expect(() => todo.updateTitle(new TodoTitle('   '))).toThrow(InvalidTitleError);
  });

  it('leaves original title unchanged when new title is invalid', () => {
    const todo = Todo.create(makeTitle('Buy milk'));
    try {
      todo.updateTitle(new TodoTitle(''));
    } catch {
      // expected
    }
    expect(todo.title.value).toBe('Buy milk');
  });
});

// ---------------------------------------------------------------------------
// todo.delete()
// ---------------------------------------------------------------------------

describe('todo.delete()', () => {
  it('returns a TodoDeleted event', () => {
    const todo = Todo.create(makeTitle('Buy milk'));
    const result = todo.delete();
    expect(result).toBeInstanceOf(TodoDeleted);
  });

  it('emitted TodoDeleted carries the correct todoId', () => {
    const todo = Todo.create(makeTitle('Buy milk'));
    const event = todo.delete();
    expect(event.todoId.equals(todo.id)).toBe(true);
  });

  it('event appears in domainEvents', () => {
    const todo = Todo.create(makeTitle('Buy milk'));
    todo.delete();
    const deleted = todo.domainEvents.filter(e => e instanceof TodoDeleted);
    expect(deleted).toHaveLength(1);
  });
});
