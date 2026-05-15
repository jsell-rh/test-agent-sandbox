/**
 * Raised when a TodoId references a non-existent Todo.
 *
 * The Application Layer is responsible for converting a null repository
 * response into this error before surfacing it to the HTTP layer.
 */
export class TodoNotFoundError extends Error {
  override readonly name = 'TodoNotFoundError'
  readonly todoId: string

  constructor(todoId: string) {
    super(`No Todo found with id "${todoId}"`)
    this.todoId = todoId
    // Maintain proper prototype chain in transpiled code
    Object.setPrototypeOf(this, TodoNotFoundError.prototype)
  }
}
