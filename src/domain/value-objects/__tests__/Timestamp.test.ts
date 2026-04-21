import { Timestamp } from '../Timestamp';

describe('Timestamp', () => {
  // ---------------------------------------------------------------------------
  // Factory
  // ---------------------------------------------------------------------------

  it('now() returns a Timestamp instance', () => {
    const ts = Timestamp.now();
    expect(ts).toBeInstanceOf(Timestamp);
  });

  it('now() produces a valid ISO 8601 UTC string', () => {
    const ts = Timestamp.now();
    const parsed = new Date(ts.value);
    // If the string is a valid ISO 8601 date, re-serialising it produces the same string.
    expect(parsed.toISOString()).toBe(ts.value);
  });

  it('now() ends with "Z" (UTC indicator)', () => {
    const ts = Timestamp.now();
    expect(ts.value).toMatch(/Z$/);
  });

  // ---------------------------------------------------------------------------
  // Construction
  // ---------------------------------------------------------------------------

  it('constructor accepts an existing ISO string', () => {
    const ts = new Timestamp('2024-01-01T00:00:00.000Z');
    expect(ts.value).toBe('2024-01-01T00:00:00.000Z');
  });

  // ---------------------------------------------------------------------------
  // Equality
  // ---------------------------------------------------------------------------

  it('equals another Timestamp with the same value', () => {
    const a = new Timestamp('2024-01-01T00:00:00.000Z');
    const b = new Timestamp('2024-01-01T00:00:00.000Z');
    expect(a.equals(b)).toBe(true);
  });

  it('does not equal a Timestamp with a different value', () => {
    const a = new Timestamp('2024-01-01T00:00:00.000Z');
    const b = new Timestamp('2024-12-31T23:59:59.999Z');
    expect(a.equals(b)).toBe(false);
  });

  // ---------------------------------------------------------------------------
  // toString
  // ---------------------------------------------------------------------------

  it('toString returns the ISO string value', () => {
    const ts = new Timestamp('2024-06-15T12:00:00.000Z');
    expect(ts.toString()).toBe('2024-06-15T12:00:00.000Z');
  });
});
