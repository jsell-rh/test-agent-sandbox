/**
 * Domain errors for the Todo bounded context.
 * All invariant violations are expressed through these typed errors.
 */

export class InvalidTitleError extends Error {
  public readonly name = 'InvalidTitleError';

  constructor(message: string) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class TodoNotFoundError extends Error {
  public readonly name = 'TodoNotFoundError';
  public readonly todoId: string;

  constructor(todoId: string) {
    super(`Todo not found: ${todoId}`);
    this.todoId = todoId;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
