import { Todo } from '../Todo';
import { TodoTitle } from '../value-objects/TodoTitle';
import { TodoStatus } from '../value-objects/TodoStatus';
import { InvalidTitleError } from '../errors/InvalidTitleError';
import { TodoCreated } from '../events/TodoCreated';
import { TodoCompleted } from '../events/TodoCompleted';
import { TodoReopened } from '../events/TodoReopened';
import { TodoTitleUpdated } from '../events/TodoTitleUpdated';
import { TodoDeleted } from '../events/TodoDeleted';

describe('Todo.create()', () => {
  it('returns a Todo with status active', () => {
    const todo = Todo.create(new TodoTitle('Buy milk'));
    expect(todo.status).toBe(TodoStatus.active);
  });

  it('assigns a non-null TodoId', () => {
    const todo = Todo.create(new TodoTitle('Buy milk'));
    expect(todo.id).toBeTruthy();
    expect(typeof todo.id).toBe('string');
  });

  it('assigns different TodoIds to distinct Todos', () => {
    const a = Todo.create(new TodoTitle('Buy milk'));
    const b = Todo.create(new TodoTitle('Buy eggs'));
    expect(a.id).not.toBe(b.id);
  });

  it('emits exactly one TodoCreated event', () => {
    const todo = Todo.create(new TodoTitle('Buy milk'));
    const events = todo.domainEvents;
    expect(events).toHaveLength(1);
    expect(events[0]).toBeInstanceOf(TodoCreated);
  });

  it('emitted TodoCreated event carries the correct todoId and title', () => {
    const title = new TodoTitle('Buy milk');
    const todo = Todo.create(title);
    const event = todo.domainEvents[0] as TodoCreated;
    expect(event.todoId).toBe(todo.id);
    expect(event.title).toBe(title.value);
  });

  it('emitted TodoCreated event has an occurredAt timestamp', () => {
    const todo = Todo.create(new TodoTitle('Buy milk'));
    const event = todo.domainEvents[0] as TodoCreated;
    expect(event.occurredAt).toBeTruthy();
    // Should be a valid ISO 8601 date
    expect(() => new Date(event.occurredAt)).not.toThrow();
  });

  it('raises InvalidTitleError when the title is invalid', () => {
    expect(() => Todo.create(new TodoTitle(''))).toThrow(InvalidTitleError);
  });

  it('sets createdAt and updatedAt timestamps', () => {
    const todo = Todo.create(new TodoTitle('Buy milk'));
    expect(todo.createdAt).toBeTruthy();
    expect(todo.updatedAt).toBeTruthy();
    expect(todo.createdAt).toBe(todo.updatedAt);
  });
});

describe('todo.complete()', () => {
  it('transitions active -> completed and emits TodoCompleted', () => {
    const todo = Todo.create(new TodoTitle('Buy milk'));
    todo.clearDomainEvents(); // clear creation event

    todo.complete();

    expect(todo.status).toBe(TodoStatus.completed);
    expect(todo.domainEvents).toHaveLength(1);
    expect(todo.domainEvents[0]).toBeInstanceOf(TodoCompleted);
  });

  it('emitted TodoCompleted event carries the correct todoId', () => {
    const todo = Todo.create(new TodoTitle('Buy milk'));
    todo.clearDomainEvents();

    todo.complete();

    const event = todo.domainEvents[0] as TodoCompleted;
    expect(event.todoId).toBe(todo.id);
  });

  it('is idempotent: calling complete() on an already-completed Todo emits no event', () => {
    const todo = Todo.create(new TodoTitle('Buy milk'));
    todo.complete();
    todo.clearDomainEvents();

    todo.complete(); // second call — no-op

    expect(todo.status).toBe(TodoStatus.completed);
    expect(todo.domainEvents).toHaveLength(0);
  });

  it('updates updatedAt on first completion', () => {
    const todo = Todo.create(new TodoTitle('Buy milk'));
    const beforeComplete = todo.updatedAt;

    // Ensure time difference
    jest.useFakeTimers();
    jest.setSystemTime(new Date(Date.now() + 1000));

    todo.complete();
    expect(todo.updatedAt).not.toBe(beforeComplete);

    jest.useRealTimers();
  });
});

describe('todo.reopen()', () => {
  it('transitions completed -> active and emits TodoReopened', () => {
    const todo = Todo.create(new TodoTitle('Buy milk'));
    todo.complete();
    todo.clearDomainEvents();

    todo.reopen();

    expect(todo.status).toBe(TodoStatus.active);
    expect(todo.domainEvents).toHaveLength(1);
    expect(todo.domainEvents[0]).toBeInstanceOf(TodoReopened);
  });

  it('emitted TodoReopened event carries the correct todoId', () => {
    const todo = Todo.create(new TodoTitle('Buy milk'));
    todo.complete();
    todo.clearDomainEvents();

    todo.reopen();

    const event = todo.domainEvents[0] as TodoReopened;
    expect(event.todoId).toBe(todo.id);
  });

  it('is idempotent: calling reopen() on an already-active Todo emits no event', () => {
    const todo = Todo.create(new TodoTitle('Buy milk'));
    todo.clearDomainEvents();

    todo.reopen(); // already active — no-op

    expect(todo.status).toBe(TodoStatus.active);
    expect(todo.domainEvents).toHaveLength(0);
  });
});

describe('todo.updateTitle()', () => {
  it('updates the title and emits TodoTitleUpdated', () => {
    const todo = Todo.create(new TodoTitle('Buy milk'));
    todo.clearDomainEvents();

    const newTitle = new TodoTitle('Buy oat milk');
    todo.updateTitle(newTitle);

    expect(todo.title).toBe(newTitle.value);
    expect(todo.domainEvents).toHaveLength(1);
    expect(todo.domainEvents[0]).toBeInstanceOf(TodoTitleUpdated);
  });

  it('emitted TodoTitleUpdated event carries the correct todoId and newTitle', () => {
    const todo = Todo.create(new TodoTitle('Buy milk'));
    todo.clearDomainEvents();

    const newTitle = new TodoTitle('Buy oat milk');
    todo.updateTitle(newTitle);

    const event = todo.domainEvents[0] as TodoTitleUpdated;
    expect(event.todoId).toBe(todo.id);
    expect(event.newTitle).toBe(newTitle.value);
  });

  it('raises InvalidTitleError when new title is invalid and leaves original title unchanged', () => {
    const original = new TodoTitle('Buy milk');
    const todo = Todo.create(original);

    expect(() => todo.updateTitle(new TodoTitle('   '))).toThrow(InvalidTitleError);
    expect(todo.title).toBe(original.value);
  });
});

describe('todo.delete()', () => {
  it('emits a TodoDeleted event', () => {
    const todo = Todo.create(new TodoTitle('Buy milk'));
    todo.clearDomainEvents();

    todo.delete();

    expect(todo.domainEvents).toHaveLength(1);
    expect(todo.domainEvents[0]).toBeInstanceOf(TodoDeleted);
  });

  it('emitted TodoDeleted event carries the correct todoId', () => {
    const todo = Todo.create(new TodoTitle('Buy milk'));
    todo.clearDomainEvents();

    todo.delete();

    const event = todo.domainEvents[0] as TodoDeleted;
    expect(event.todoId).toBe(todo.id);
  });
});

describe('TodoId immutability', () => {
  it('is a UUID v4 string', () => {
    const todo = Todo.create(new TodoTitle('Buy milk'));
    const uuidV4Regex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    expect(todo.id).toMatch(uuidV4Regex);
  });
});
