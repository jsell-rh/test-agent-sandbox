/**
 * Raised when the database cannot be initialised at startup.
 *
 * Typically thrown when the database file path is not writable or
 * when a migration fails on a fresh database.
 *
 * The server should refuse to accept requests after this error.
 */
export class DatabaseInitError extends Error {
  constructor(
    message: string,
    readonly cause?: unknown,
  ) {
    super(`DatabaseInitError: ${message}`)
    this.name = 'DatabaseInitError'
    Object.setPrototypeOf(this, DatabaseInitError.prototype)
  }
}
