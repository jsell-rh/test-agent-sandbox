/**
 * Shared server-side constants.
 *
 * These mirror the domain model constraints from domain-model.spec.md.
 */

/** Maximum allowed TodoTitle length. Must match domain invariant 2. */
export const TODO_TITLE_MAX_LENGTH = 500

/** Valid TodoStatus values. */
export const VALID_STATUSES = new Set<string>(['active', 'completed'])

/** Valid FilterCriteria values. */
export const VALID_FILTERS = new Set<string>(['all', 'active', 'completed'])
