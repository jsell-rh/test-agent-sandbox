/**
 * Raised when a TodoId references a non-existent Todo.
 */
export class TodoNotFoundError extends Error {
  constructor(todoId: string) {
    super(`TodoNotFoundError: No Todo found with id "${todoId}"`)
    this.name = 'TodoNotFoundError'
    // Maintain proper prototype chain in transpiled code
    Object.setPrototypeOf(this, TodoNotFoundError.prototype)
  }
}
