import { InvalidTitleError } from '../errors/InvalidTitleError';

/**
 * The human-readable description of the work to be done.
 * Non-empty string, max 500 characters, leading/trailing whitespace trimmed.
 * Immutable — replacing a title produces a new TodoTitle.
 * Equality by value (case-sensitive).
 *
 * Spec-Ref: specs/domain-model.spec.md — Value Objects / TodoTitle
 */
export class TodoTitle {
  static readonly MAX_LENGTH = 500;

  private readonly _value: string;

  constructor(rawValue: string) {
    const trimmed = rawValue.trim();

    if (trimmed.length === 0) {
      throw new InvalidTitleError('title must not be blank');
    }

    if (trimmed.length > TodoTitle.MAX_LENGTH) {
      throw new InvalidTitleError(
        `title must not exceed ${TodoTitle.MAX_LENGTH} characters`,
      );
    }

    this._value = trimmed;
  }

  get value(): string {
    return this._value;
  }

  equals(other: TodoTitle): boolean {
    return this._value === other._value;
  }

  toString(): string {
    return this._value;
  }
}
