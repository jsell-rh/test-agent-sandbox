/**
 * Value Object (enumeration): the view selection used by the Application Layer.
 *
 * Used by the Application Layer only — never on the Aggregate itself.
 * Default: `all`.
 */
export enum FilterCriteria {
  all = 'all',
  active = 'active',
  completed = 'completed',
}

export const DEFAULT_FILTER_CRITERIA = FilterCriteria.all
