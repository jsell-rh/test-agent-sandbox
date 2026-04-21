/**
 * Value Object: an ISO 8601 UTC datetime string.
 *
 * Immutable once set. Equality by value.
 */
export class Timestamp {
  private readonly _value: string

  private constructor(isoString: string) {
    this._value = isoString
  }

  /** Create a Timestamp representing the current moment. */
  static now(): Timestamp {
    return new Timestamp(new Date().toISOString())
  }

  /** Create a Timestamp from an existing ISO 8601 string. */
  static from(isoString: string): Timestamp {
    return new Timestamp(isoString)
  }

  get value(): string {
    return this._value
  }

  equals(other: Timestamp): boolean {
    return this._value === other._value
  }

  toString(): string {
    return this._value
  }
}
