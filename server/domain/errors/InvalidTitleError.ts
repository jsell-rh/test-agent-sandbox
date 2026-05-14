/**
 * Raised when a TodoTitle is blank or exceeds 500 characters.
 *
 * Invariant enforcement lives in the TodoTitle value object; this error
 * surfaces the violation to the Application Layer.
 */
export class InvalidTitleError extends Error {
  override readonly name = 'InvalidTitleError'

  constructor(reason: string) {
    super(reason)
    // Maintain proper prototype chain in transpiled code
    Object.setPrototypeOf(this, InvalidTitleError.prototype)
  }
}
