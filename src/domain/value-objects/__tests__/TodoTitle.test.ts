import { TodoTitle } from '../TodoTitle';
import { InvalidTitleError } from '../../errors/InvalidTitleError';

describe('TodoTitle', () => {
  // ---------------------------------------------------------------------------
  // Valid inputs
  // ---------------------------------------------------------------------------

  it('accepts a non-empty string', () => {
    const title = new TodoTitle('Buy milk');
    expect(title.value).toBe('Buy milk');
  });

  it('accepts a 500-character string (boundary — maximum allowed)', () => {
    const raw = 'a'.repeat(500);
    const title = new TodoTitle(raw);
    expect(title.value).toBe(raw);
  });

  // ---------------------------------------------------------------------------
  // Whitespace trimming
  // ---------------------------------------------------------------------------

  it('trims leading whitespace', () => {
    const title = new TodoTitle('  Buy milk');
    expect(title.value).toBe('Buy milk');
  });

  it('trims trailing whitespace', () => {
    const title = new TodoTitle('Buy milk  ');
    expect(title.value).toBe('Buy milk');
  });

  it('trims both ends', () => {
    const title = new TodoTitle('  Buy milk  ');
    expect(title.value).toBe('Buy milk');
  });

  it('validates trimmed length — 502 raw chars that trim to 500 is valid', () => {
    const raw = ' ' + 'a'.repeat(500) + ' ';
    expect(() => new TodoTitle(raw)).not.toThrow();
    expect(new TodoTitle(raw).value).toBe('a'.repeat(500));
  });

  // ---------------------------------------------------------------------------
  // Invalid inputs — blank
  // ---------------------------------------------------------------------------

  it('raises InvalidTitleError for a blank string', () => {
    expect(() => new TodoTitle('')).toThrow(InvalidTitleError);
  });

  it('raises InvalidTitleError for a whitespace-only string', () => {
    expect(() => new TodoTitle('   ')).toThrow(InvalidTitleError);
  });

  it('raises InvalidTitleError for a tab-only string', () => {
    expect(() => new TodoTitle('\t')).toThrow(InvalidTitleError);
  });

  // ---------------------------------------------------------------------------
  // Invalid inputs — too long
  // ---------------------------------------------------------------------------

  it('raises InvalidTitleError for a 501-character string', () => {
    expect(() => new TodoTitle('a'.repeat(501))).toThrow(InvalidTitleError);
  });

  it('validates trimmed length — 501 non-space chars with a leading space is invalid', () => {
    const raw = ' ' + 'a'.repeat(501);
    expect(() => new TodoTitle(raw)).toThrow(InvalidTitleError);
  });

  // ---------------------------------------------------------------------------
  // Equality (value-based, case-sensitive)
  // ---------------------------------------------------------------------------

  it('equals another TodoTitle with the same value', () => {
    const a = new TodoTitle('Buy milk');
    const b = new TodoTitle('Buy milk');
    expect(a.equals(b)).toBe(true);
  });

  it('does not equal a TodoTitle with a different value', () => {
    const a = new TodoTitle('Buy milk');
    const b = new TodoTitle('Buy eggs');
    expect(a.equals(b)).toBe(false);
  });

  it('equality is case-sensitive', () => {
    const a = new TodoTitle('Buy milk');
    const b = new TodoTitle('buy milk');
    expect(a.equals(b)).toBe(false);
  });

  // ---------------------------------------------------------------------------
  // toString
  // ---------------------------------------------------------------------------

  it('toString returns the trimmed value', () => {
    const title = new TodoTitle('  Buy milk  ');
    expect(title.toString()).toBe('Buy milk');
  });
});
