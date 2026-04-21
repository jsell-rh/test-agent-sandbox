import { TodoId } from '../TodoId';

describe('TodoId', () => {
  // ---------------------------------------------------------------------------
  // Generation
  // ---------------------------------------------------------------------------

  it('generate() returns a TodoId', () => {
    const id = TodoId.generate();
    expect(id).toBeInstanceOf(TodoId);
  });

  it('generate() produces a non-empty value', () => {
    const id = TodoId.generate();
    expect(id.value).toBeTruthy();
  });

  it('generate() produces a UUID v4 format', () => {
    const id = TodoId.generate();
    const uuidV4Regex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    expect(id.value).toMatch(uuidV4Regex);
  });

  it('generate() produces unique IDs each call', () => {
    const ids = Array.from({ length: 5 }, () => TodoId.generate().value);
    const unique = new Set(ids);
    expect(unique.size).toBe(5);
  });

  // ---------------------------------------------------------------------------
  // Construction
  // ---------------------------------------------------------------------------

  it('constructor accepts an existing value', () => {
    const id = new TodoId('abc-123');
    expect(id.value).toBe('abc-123');
  });

  // ---------------------------------------------------------------------------
  // Equality (value-based)
  // ---------------------------------------------------------------------------

  it('equals another TodoId with the same value', () => {
    const a = new TodoId('same-id');
    const b = new TodoId('same-id');
    expect(a.equals(b)).toBe(true);
  });

  it('does not equal a TodoId with a different value', () => {
    const a = new TodoId('first');
    const b = new TodoId('second');
    expect(a.equals(b)).toBe(false);
  });

  it('two generated ids are not equal', () => {
    const a = TodoId.generate();
    const b = TodoId.generate();
    expect(a.equals(b)).toBe(false);
  });

  // ---------------------------------------------------------------------------
  // toString
  // ---------------------------------------------------------------------------

  it('toString returns the underlying value', () => {
    const id = new TodoId('abc-123');
    expect(id.toString()).toBe('abc-123');
  });
});
