/**
 * Tests for all Value Objects: TodoTitle, TodoId, TodoStatus, FilterCriteria,
 * and Timestamp utilities.
 *
 * TDD plan coverage (spec §TDD Plan → TodoTitle):
 *  ✓ Blank string raises InvalidTitleError
 *  ✓ Whitespace-only string raises InvalidTitleError
 *  ✓ 500-character string is valid
 *  ✓ 501-character string raises InvalidTitleError
 *  ✓ Leading/trailing whitespace is trimmed before validation
 */

import { InvalidTitleError } from '../domain/errors';
import {
  TodoTitle,
  TodoStatus,
  FilterCriteria,
  DEFAULT_FILTER_CRITERIA,
  generateTodoId,
  currentTimestamp,
} from '../domain/value-objects';
import { UUID_V4_PATTERN, ISO_TIMESTAMP_PATTERN } from './helpers';

// ---------------------------------------------------------------------------
// TodoTitle
// ---------------------------------------------------------------------------

describe('TodoTitle', () => {
  describe('valid titles', () => {
    it('accepts a normal non-empty string', () => {
      const title = new TodoTitle('Buy groceries');
      expect(title.value).toBe('Buy groceries');
    });

    it('accepts a 500-character string', () => {
      const raw = 'a'.repeat(TodoTitle.MAX_LENGTH);
      const title = new TodoTitle(raw);
      expect(title.value).toBe(raw);
      expect(title.value).toHaveLength(500);
    });

    it('trims leading whitespace before validation and storage', () => {
      const title = new TodoTitle('  Hello world');
      expect(title.value).toBe('Hello world');
    });

    it('trims trailing whitespace before validation and storage', () => {
      const title = new TodoTitle('Hello world   ');
      expect(title.value).toBe('Hello world');
    });

    it('trims both leading and trailing whitespace', () => {
      const title = new TodoTitle('  Hello world  ');
      expect(title.value).toBe('Hello world');
    });

    it('accepts a single non-whitespace character', () => {
      const title = new TodoTitle('X');
      expect(title.value).toBe('X');
    });
  });

  describe('invalid titles — InvalidTitleError', () => {
    it('raises InvalidTitleError for a blank (empty) string', () => {
      expect(() => new TodoTitle('')).toThrow(InvalidTitleError);
    });

    it('raises InvalidTitleError for a whitespace-only string', () => {
      expect(() => new TodoTitle('   ')).toThrow(InvalidTitleError);
    });

    it('raises InvalidTitleError for a tab-only string', () => {
      expect(() => new TodoTitle('\t')).toThrow(InvalidTitleError);
    });

    it('raises InvalidTitleError for a 501-character string', () => {
      const raw = 'a'.repeat(TodoTitle.MAX_LENGTH + 1);
      expect(() => new TodoTitle(raw)).toThrow(InvalidTitleError);
    });

    it('raises InvalidTitleError even when the overflow is after trimming', () => {
      // 501 non-whitespace chars — trim has no effect but should still fail
      const raw = 'a'.repeat(TodoTitle.MAX_LENGTH + 1);
      expect(() => new TodoTitle(raw)).toThrow(InvalidTitleError);
    });

    it('InvalidTitleError has the correct name', () => {
      try {
        new TodoTitle('');
      } catch (e) {
        expect((e as Error).name).toBe('InvalidTitleError');
        expect(e).toBeInstanceOf(InvalidTitleError);
      }
    });
  });

  describe('immutability and equality', () => {
    it('equals() returns true for two titles with the same value', () => {
      const a = new TodoTitle('Clean house');
      const b = new TodoTitle('Clean house');
      expect(a.equals(b)).toBe(true);
    });

    it('equals() returns false for titles with different values', () => {
      const a = new TodoTitle('Clean house');
      const b = new TodoTitle('Clean office');
      expect(a.equals(b)).toBe(false);
    });

    it('equality is case-sensitive', () => {
      const a = new TodoTitle('clean house');
      const b = new TodoTitle('Clean house');
      expect(a.equals(b)).toBe(false);
    });

    it('toString() returns the trimmed value', () => {
      const title = new TodoTitle('  Write tests  ');
      expect(title.toString()).toBe('Write tests');
    });

    it('value property is the trimmed, validated string', () => {
      const title = new TodoTitle('  Write tests  ');
      expect(title.value).toBe('Write tests');
    });
  });
});

// ---------------------------------------------------------------------------
// TodoStatus
// ---------------------------------------------------------------------------

describe('TodoStatus', () => {
  it('has an Active variant with value "active"', () => {
    expect(TodoStatus.Active).toBe('active');
  });

  it('has a Completed variant with value "completed"', () => {
    expect(TodoStatus.Completed).toBe('completed');
  });

  it('covers exactly two statuses', () => {
    const keys = Object.keys(TodoStatus);
    expect(keys).toHaveLength(2);
    expect(keys).toContain('Active');
    expect(keys).toContain('Completed');
  });
});

// ---------------------------------------------------------------------------
// FilterCriteria
// ---------------------------------------------------------------------------

describe('FilterCriteria', () => {
  it('has an All variant with value "all"', () => {
    expect(FilterCriteria.All).toBe('all');
  });

  it('has an Active variant with value "active"', () => {
    expect(FilterCriteria.Active).toBe('active');
  });

  it('has a Completed variant with value "completed"', () => {
    expect(FilterCriteria.Completed).toBe('completed');
  });

  it('default filter criteria is All', () => {
    expect(DEFAULT_FILTER_CRITERIA).toBe(FilterCriteria.All);
  });
});

// ---------------------------------------------------------------------------
// TodoId generation
// ---------------------------------------------------------------------------

describe('generateTodoId', () => {
  it('generates a UUID v4 string', () => {
    const id = generateTodoId();
    expect(id).toMatch(UUID_V4_PATTERN);
  });

  it('generates unique IDs on successive calls', () => {
    const ids = new Set(Array.from({ length: 100 }, () => generateTodoId()));
    expect(ids.size).toBe(100);
  });
});

// ---------------------------------------------------------------------------
// Timestamp generation
// ---------------------------------------------------------------------------

describe('currentTimestamp', () => {
  it('returns an ISO 8601 UTC string', () => {
    const ts = currentTimestamp();
    expect(ts).toMatch(ISO_TIMESTAMP_PATTERN);
  });

  it('returns a string that round-trips through Date parsing', () => {
    const ts = currentTimestamp();
    const parsed = new Date(ts);
    expect(Number.isNaN(parsed.getTime())).toBe(false);
  });
});
