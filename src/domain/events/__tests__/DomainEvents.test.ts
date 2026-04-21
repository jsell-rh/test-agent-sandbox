import {
  TodoCreated,
  TodoCompleted,
  TodoReopened,
  TodoTitleUpdated,
  TodoDeleted,
} from '../index';
import { TodoId } from '../../value-objects/TodoId';
import { TodoTitle } from '../../value-objects/TodoTitle';
import { Timestamp } from '../../value-objects/Timestamp';

const todoId = new TodoId('f47ac10b-58cc-4372-a567-0e02b2c3d479');
const title = new TodoTitle('Buy milk');
const newTitle = new TodoTitle('Buy eggs');
const timestamp = new Timestamp('2024-01-01T00:00:00.000Z');

describe('TodoCreated', () => {
  it('stores todoId, title, and occurredAt', () => {
    const event = new TodoCreated(todoId, title, timestamp);
    expect(event.todoId).toBe(todoId);
    expect(event.title).toBe(title);
    expect(event.occurredAt).toBe(timestamp);
  });

  it('is an instance of TodoCreated', () => {
    const event = new TodoCreated(todoId, title, timestamp);
    expect(event).toBeInstanceOf(TodoCreated);
  });

  it('is not an instance of other event classes', () => {
    const event = new TodoCreated(todoId, title, timestamp);
    expect(event).not.toBeInstanceOf(TodoCompleted);
    expect(event).not.toBeInstanceOf(TodoDeleted);
  });
});

describe('TodoCompleted', () => {
  it('stores todoId and occurredAt', () => {
    const event = new TodoCompleted(todoId, timestamp);
    expect(event.todoId).toBe(todoId);
    expect(event.occurredAt).toBe(timestamp);
  });

  it('is an instance of TodoCompleted', () => {
    const event = new TodoCompleted(todoId, timestamp);
    expect(event).toBeInstanceOf(TodoCompleted);
  });

  it('is not an instance of TodoCreated', () => {
    const event = new TodoCompleted(todoId, timestamp);
    expect(event).not.toBeInstanceOf(TodoCreated);
  });
});

describe('TodoReopened', () => {
  it('stores todoId and occurredAt', () => {
    const event = new TodoReopened(todoId, timestamp);
    expect(event.todoId).toBe(todoId);
    expect(event.occurredAt).toBe(timestamp);
  });

  it('is an instance of TodoReopened', () => {
    const event = new TodoReopened(todoId, timestamp);
    expect(event).toBeInstanceOf(TodoReopened);
  });

  it('is not an instance of TodoCompleted', () => {
    const event = new TodoReopened(todoId, timestamp);
    expect(event).not.toBeInstanceOf(TodoCompleted);
  });
});

describe('TodoTitleUpdated', () => {
  it('stores todoId, newTitle, and occurredAt', () => {
    const event = new TodoTitleUpdated(todoId, newTitle, timestamp);
    expect(event.todoId).toBe(todoId);
    expect(event.newTitle).toBe(newTitle);
    expect(event.occurredAt).toBe(timestamp);
  });

  it('is an instance of TodoTitleUpdated', () => {
    const event = new TodoTitleUpdated(todoId, newTitle, timestamp);
    expect(event).toBeInstanceOf(TodoTitleUpdated);
  });
});

describe('TodoDeleted', () => {
  it('stores todoId and occurredAt', () => {
    const event = new TodoDeleted(todoId, timestamp);
    expect(event.todoId).toBe(todoId);
    expect(event.occurredAt).toBe(timestamp);
  });

  it('is an instance of TodoDeleted', () => {
    const event = new TodoDeleted(todoId, timestamp);
    expect(event).toBeInstanceOf(TodoDeleted);
  });

  it('is not an instance of TodoCreated', () => {
    const event = new TodoDeleted(todoId, timestamp);
    expect(event).not.toBeInstanceOf(TodoCreated);
  });
});
