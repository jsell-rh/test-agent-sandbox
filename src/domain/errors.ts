/**
 * Domain errors for the Todo bounded context.
 * All invariant violations are expressed through these typed errors.
 */

import type { TodoId } from './value-objects';

export class InvalidTitleError extends Error {
  public readonly name = 'InvalidTitleError';

  constructor(message: string) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class TodoNotFoundError extends Error {
  public readonly name = 'TodoNotFoundError';
  public readonly todoId: TodoId;

  constructor(todoId: TodoId) {
    super(`Todo not found: ${todoId}`);
    this.todoId = todoId;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
