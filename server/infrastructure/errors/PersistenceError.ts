/**
 * Raised when a storage operation fails unexpectedly.
 *
 * Wraps low-level database errors (SQLite constraint violations, I/O errors)
 * in a domain-neutral error type that the Application Layer can handle.
 */
export class PersistenceError extends Error {
  constructor(
    message: string,
    readonly cause?: unknown,
  ) {
    super(`PersistenceError: ${message}`)
    this.name = 'PersistenceError'
    Object.setPrototypeOf(this, PersistenceError.prototype)
  }
}
