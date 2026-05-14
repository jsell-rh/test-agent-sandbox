/**
 * Value Objects for the Todo bounded context.
 *
 * All value objects are immutable. Equality is by value, not reference.
 */

import { randomUUID } from 'node:crypto';
import { InvalidTitleError } from './errors';

// ---------------------------------------------------------------------------
// TodoId — UUID v4 string, stable and globally unique
// ---------------------------------------------------------------------------

export type TodoId = string;

export function generateTodoId(): TodoId {
  return randomUUID();
}

// ---------------------------------------------------------------------------
// TodoTitle — non-empty, trimmed, max 500 characters
// ---------------------------------------------------------------------------

export class TodoTitle {
  /** Maximum allowed character count for a title (after trimming). */
  static readonly MAX_LENGTH = 500;

  private readonly _value: string;

  constructor(rawValue: string) {
    const trimmed = rawValue.trim();

    if (trimmed.length === 0) {
      throw new InvalidTitleError('TodoTitle must not be blank');
    }

    if (trimmed.length > TodoTitle.MAX_LENGTH) {
      throw new InvalidTitleError(
        `TodoTitle must not exceed ${TodoTitle.MAX_LENGTH} characters`,
      );
    }

    this._value = trimmed;
    // Freeze the instance so runtime reflection cannot mutate _value.
    // This ensures events that carry TodoTitle references are truly immutable.
    Object.freeze(this);
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

// ---------------------------------------------------------------------------
// TodoStatus — lifecycle state of a Todo
// ---------------------------------------------------------------------------

export const TodoStatus = {
  Active: 'active',
  Completed: 'completed',
} as const;

export type TodoStatus = (typeof TodoStatus)[keyof typeof TodoStatus];

// ---------------------------------------------------------------------------
// FilterCriteria — view selection used by the application layer
// ---------------------------------------------------------------------------

export const FilterCriteria = {
  All: 'all',
  Active: 'active',
  Completed: 'completed',
} as const;

export type FilterCriteria = (typeof FilterCriteria)[keyof typeof FilterCriteria];

/** Default filter when none is specified. */
export const DEFAULT_FILTER_CRITERIA: FilterCriteria = FilterCriteria.All;

// ---------------------------------------------------------------------------
// Timestamp — ISO 8601 UTC datetime string
// ---------------------------------------------------------------------------

export type Timestamp = string;

export function currentTimestamp(): Timestamp {
  return new Date().toISOString();
}
