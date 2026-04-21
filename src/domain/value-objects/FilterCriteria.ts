/**
 * A Value Object representing the view selection for listing Todos.
 * Used by the Application Layer only — never on the Aggregate itself.
 * Default value: all.
 *
 * Spec-Ref: specs/domain-model.spec.md — Value Objects / FilterCriteria
 */
export enum FilterCriteria {
  All = 'all',
  Active = 'active',
  Completed = 'completed',
}

export const DEFAULT_FILTER_CRITERIA = FilterCriteria.All;
