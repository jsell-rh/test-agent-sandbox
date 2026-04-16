/**
 * Raised when the database cannot be initialized at startup.
 *
 * Examples: file not writable, migrations fail to apply.
 * This error is fatal — the application MUST NOT accept requests after it.
 */
export class DatabaseInitError extends Error {
  constructor(reason: string, cause?: unknown) {
    super(`DatabaseInitError: ${reason}`);
    this.name = 'DatabaseInitError';
    if (cause !== undefined) {
      this.cause = cause;
    }
    // Maintain proper prototype chain in transpiled code
    Object.setPrototypeOf(this, DatabaseInitError.prototype);
  }
}
