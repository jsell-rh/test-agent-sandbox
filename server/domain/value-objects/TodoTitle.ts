import { InvalidTitleError } from '../errors/InvalidTitleError.js'

const MAX_LENGTH = 500

/**
 * Value Object: the human-readable description of the work to be done.
 *
 * Invariants:
 * - Must not be blank (empty or whitespace-only) after trimming.
 * - Must not exceed 500 characters after trimming.
 * - Immutable: producing a new title creates a new instance.
 * - Equality by value (case-sensitive).
 */
export class TodoTitle {
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
