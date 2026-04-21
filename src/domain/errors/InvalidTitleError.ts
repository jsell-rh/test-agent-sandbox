/**
 * Raised when a TodoTitle is blank or exceeds 500 characters.
 *
 * Spec-Ref: specs/domain-model.spec.md — Domain Errors
 */
export class InvalidTitleError extends Error {
  constructor(reason: string) {
    super(`InvalidTitleError: ${reason}`);
    this.name = 'InvalidTitleError';
    // Maintain proper prototype chain in transpiled ES5 code
    Object.setPrototypeOf(this, InvalidTitleError.prototype);
  }
}
