import { InvalidTitleError } from '../errors/InvalidTitleError.js'

/** Maximum allowed character count for a TodoTitle (after trimming). */
const MAX_LENGTH = 500

/**
 * Value Object: the human-readable description of the work to be done.
 *
 * Invariants (enforced in constructor):
 * - Must not be blank (empty or whitespace-only) after trimming.
 * - Must not exceed 500 characters after trimming.
 * - Leading/trailing whitespace is trimmed before validation.
 *
 * Immutable: producing a new title creates a new instance.
 * Equality: by value (case-sensitive).
 */
export class TodoTitle {
  /** Maximum allowed character count. */
  static readonly MAX_LENGTH = MAX_LENGTH

  private readonly _value: string

  constructor(raw: string) {
    const trimmed = raw.trim()

    if (trimmed.length === 0) {
      throw new InvalidTitleError('Title must not be blank or whitespace-only.')
    }

    if (trimmed.length > MAX_LENGTH) {
      throw new InvalidTitleError(
        `Title must not exceed ${MAX_LENGTH} characters (got ${trimmed.length}).`,
      )
    }

    this._value = trimmed
  }

  get value(): string {
    return this._value
  }

  equals(other: TodoTitle): boolean {
    return this._value === other._value
  }

  toString(): string {
    return this._value
  }
}
