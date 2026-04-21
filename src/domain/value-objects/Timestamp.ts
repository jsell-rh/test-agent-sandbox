/**
 * ISO 8601 UTC datetime string. Immutable once set.
 * Equality by value.
 *
 * Spec-Ref: specs/domain-model.spec.md — Value Objects / Timestamp
 */
export class Timestamp {
  private readonly _value: string;

  constructor(value: string) {
    this._value = value;
  }

  /** Create a Timestamp representing the current moment in UTC. */
  static now(): Timestamp {
    return new Timestamp(new Date().toISOString());
  }

  get value(): string {
    return this._value;
  }

  equals(other: Timestamp): boolean {
    return this._value === other._value;
  }

  toString(): string {
    return this._value;
  }
}
