import { InvalidTitleError } from '../InvalidTitleError';
import { TodoNotFoundError } from '../TodoNotFoundError';

// ---------------------------------------------------------------------------
// InvalidTitleError
// ---------------------------------------------------------------------------

describe('InvalidTitleError', () => {
  it('is an instance of Error', () => {
    const err = new InvalidTitleError('blank title');
    expect(err).toBeInstanceOf(Error);
  });

  it('is an instance of InvalidTitleError (prototype chain preserved)', () => {
    const err = new InvalidTitleError('blank title');
    expect(err).toBeInstanceOf(InvalidTitleError);
  });

  it('has name set to "InvalidTitleError"', () => {
    const err = new InvalidTitleError('blank title');
    expect(err.name).toBe('InvalidTitleError');
  });

  it('includes the reason in the message', () => {
    const err = new InvalidTitleError('title must not be blank');
    expect(err.message).toContain('title must not be blank');
  });

  it('includes "InvalidTitleError" prefix in the message', () => {
    const err = new InvalidTitleError('exceeds max length');
    expect(err.message).toContain('InvalidTitleError');
  });

  it('can be caught as a generic Error', () => {
    const throwIt = () => { throw new InvalidTitleError('blank'); };
    expect(throwIt).toThrow(Error);
  });

  it('can be caught specifically as InvalidTitleError', () => {
    const throwIt = () => { throw new InvalidTitleError('blank'); };
    expect(throwIt).toThrow(InvalidTitleError);
  });

  it('has a stack trace', () => {
    const err = new InvalidTitleError('blank title');
    expect(err.stack).toBeDefined();
  });

  it('blank reason still produces a valid error', () => {
    const err = new InvalidTitleError('');
    expect(err).toBeInstanceOf(InvalidTitleError);
    expect(err.name).toBe('InvalidTitleError');
  });

  it('message differs for different reasons', () => {
    const err1 = new InvalidTitleError('blank');
    const err2 = new InvalidTitleError('exceeds 500 characters');
    expect(err1.message).not.toBe(err2.message);
  });
});

// ---------------------------------------------------------------------------
// TodoNotFoundError
// ---------------------------------------------------------------------------

describe('TodoNotFoundError', () => {
  it('is an instance of Error', () => {
    const err = new TodoNotFoundError('abc-123');
    expect(err).toBeInstanceOf(Error);
  });

  it('is an instance of TodoNotFoundError (prototype chain preserved)', () => {
    const err = new TodoNotFoundError('abc-123');
    expect(err).toBeInstanceOf(TodoNotFoundError);
  });

  it('has name set to "TodoNotFoundError"', () => {
    const err = new TodoNotFoundError('abc-123');
    expect(err.name).toBe('TodoNotFoundError');
  });

  it('includes the todoId in the message', () => {
    const todoId = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
    const err = new TodoNotFoundError(todoId);
    expect(err.message).toContain(todoId);
  });

  it('includes "TodoNotFoundError" prefix in the message', () => {
    const err = new TodoNotFoundError('some-id');
    expect(err.message).toContain('TodoNotFoundError');
  });

  it('can be caught as a generic Error', () => {
    const throwIt = () => { throw new TodoNotFoundError('id-1'); };
    expect(throwIt).toThrow(Error);
  });

  it('can be caught specifically as TodoNotFoundError', () => {
    const throwIt = () => { throw new TodoNotFoundError('id-1'); };
    expect(throwIt).toThrow(TodoNotFoundError);
  });

  it('has a stack trace', () => {
    const err = new TodoNotFoundError('id-1');
    expect(err.stack).toBeDefined();
  });

  it('message differs for different todoIds', () => {
    const err1 = new TodoNotFoundError('id-A');
    const err2 = new TodoNotFoundError('id-B');
    expect(err1.message).not.toBe(err2.message);
  });

  it('InvalidTitleError and TodoNotFoundError are not interchangeable', () => {
    const titleErr = new InvalidTitleError('blank');
    const notFoundErr = new TodoNotFoundError('id-1');

    expect(titleErr).not.toBeInstanceOf(TodoNotFoundError);
    expect(notFoundErr).not.toBeInstanceOf(InvalidTitleError);
  });
});
