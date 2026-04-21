/**
 * Raised when a TodoTitle is blank or exceeds 500 characters.
 */
export class InvalidTitleError extends Error {
  constructor(reason: string) {
    super(`InvalidTitleError: ${reason}`)
    this.name = 'InvalidTitleError'
    // Maintain proper prototype chain in transpiled code
    Object.setPrototypeOf(this, InvalidTitleError.prototype)
  }
}
