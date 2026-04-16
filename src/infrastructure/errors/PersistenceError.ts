/**
 * Raised when a repository operation fails at the database layer.
 *
 * Wraps low-level SQLite errors so callers do not depend on the
 * specific driver implementation.
 */
export class PersistenceError extends Error {
  constructor(operation: string, cause?: unknown) {
    super(`PersistenceError: ${operation}`);
    this.name = 'PersistenceError';
    if (cause !== undefined) {
      this.cause = cause;
    }
    // Maintain proper prototype chain in transpiled code
    Object.setPrototypeOf(this, PersistenceError.prototype);
  }
}
