/**
 * Raised when a TodoId references a non-existent Todo.
 *
 * Spec-Ref: specs/domain-model.spec.md — Domain Errors
 */
export class TodoNotFoundError extends Error {
  constructor(todoId: string) {
    super(`TodoNotFoundError: No Todo found with id "${todoId}"`);
    this.name = 'TodoNotFoundError';
    // Maintain proper prototype chain in transpiled ES5 code
    Object.setPrototypeOf(this, TodoNotFoundError.prototype);
  }
}
