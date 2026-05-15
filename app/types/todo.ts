/**
 * Shared types for the Todo application UI layer.
 *
 * These types mirror the API contract defined in specs/interface.spec.md
 * and the Ubiquitous Language from specs/domain-model.spec.md.
 */

export type TodoStatus = 'active' | 'completed'

export type FilterCriteria = 'all' | 'active' | 'completed'

/** JSON representation of a Todo resource as returned by the API. */
export interface TodoResource {
  id: string
  title: string
  status: TodoStatus
  createdAt: string
  updatedAt: string
}

/** Response envelope for GET /api/todos. */
export interface TodoListResponse {
  todos: TodoResource[]
  counts: {
    all: number
    active: number
    completed: number
  }
}

/** The three filter tabs, in display order. */
export const FILTER_TABS: FilterCriteria[] = ['all', 'active', 'completed']

/** Human-readable labels for each filter tab. */
export const FILTER_LABELS: Record<FilterCriteria, string> = {
  all: 'All',
  active: 'Active',
  completed: 'Completed',
}

/** Default filter when none is specified. */
export const DEFAULT_FILTER: FilterCriteria = 'all'

/** Delay in milliseconds before auto-dismissing error notifications. */
export const ERROR_AUTO_DISMISS_MS = 5_000
