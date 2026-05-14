/**
 * Raised when a storage operation fails unexpectedly.
 *
 * Wraps low-level database errors (SQLite constraint violations, I/O errors)
 * in a domain-neutral error type that the Application Layer can handle.
 */
export class PersistenceError extends Error {
  override readonly name = 'PersistenceError'

  constructor(
    message: string,
    override readonly cause?: unknown,
  ) {
    super(message)
    Object.setPrototypeOf(this, PersistenceError.prototype)
  }
}
