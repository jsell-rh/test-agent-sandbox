/**
 * Raised when the database cannot be initialised at startup.
 *
 * Typically thrown when the database file path is not writable or
 * when a migration fails on a fresh database.
 *
 * The server must refuse to accept requests after this error.
 */
export class DatabaseInitError extends Error {
  override readonly name = 'DatabaseInitError'

  constructor(
    message: string,
    override readonly cause?: unknown,
  ) {
    super(message)
    Object.setPrototypeOf(this, DatabaseInitError.prototype)
  }
}
