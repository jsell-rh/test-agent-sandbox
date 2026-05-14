/**
 * Tests for domain error types.
 */

import { InvalidTitleError, TodoNotFoundError } from '../domain/errors';

describe('InvalidTitleError', () => {
  it('is an instance of Error', () => {
    const err = new InvalidTitleError('blank');
    expect(err).toBeInstanceOf(Error);
  });

  it('is an instance of InvalidTitleError', () => {
    const err = new InvalidTitleError('blank');
    expect(err).toBeInstanceOf(InvalidTitleError);
  });

  it('has name "InvalidTitleError"', () => {
    const err = new InvalidTitleError('blank');
    expect(err.name).toBe('InvalidTitleError');
  });

  it('carries the provided message', () => {
    const err = new InvalidTitleError('must not be blank');
    expect(err.message).toBe('must not be blank');
  });
});

describe('TodoNotFoundError', () => {
  it('is an instance of Error', () => {
    const err = new TodoNotFoundError('some-id');
    expect(err).toBeInstanceOf(Error);
  });

  it('is an instance of TodoNotFoundError', () => {
    const err = new TodoNotFoundError('some-id');
    expect(err).toBeInstanceOf(TodoNotFoundError);
  });

  it('has name "TodoNotFoundError"', () => {
    const err = new TodoNotFoundError('some-id');
    expect(err.name).toBe('TodoNotFoundError');
  });

  it('carries the offending todoId', () => {
    const err = new TodoNotFoundError('abc-123');
    expect(err.todoId).toBe('abc-123');
  });

  it('includes the id in the message', () => {
    const err = new TodoNotFoundError('abc-123');
    expect(err.message).toContain('abc-123');
  });
});
