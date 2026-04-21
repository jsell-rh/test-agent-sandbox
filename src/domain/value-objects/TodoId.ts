import { randomUUID } from 'crypto';

/**
 * A stable, globally-unique identifier for a Todo.
 * UUID v4 string. Immutable. Equality by value, not reference.
 *
 * Spec-Ref: specs/domain-model.spec.md — Value Objects / TodoId
 */
export class TodoId {
  private readonly _value: string;

  constructor(value: string) {
    this._value = value;
  }

  /** Generate a new unique TodoId using UUID v4. */
  static generate(): TodoId {
    return new TodoId(randomUUID());
  }

  get value(): string {
    return this._value;
  }

  equals(other: TodoId): boolean {
    return this._value === other._value;
  }

  toString(): string {
    return this._value;
  }
}
