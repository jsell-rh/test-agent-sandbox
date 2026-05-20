/**
 * TypeScript types mirroring the API resource shapes from interface.spec.md.
 * These are the external representations; domain objects live in the Python backend.
 */

export interface TodoResource {
  id: string
  title: string
  status: 'active' | 'completed'
  createdAt: string
  updatedAt: string
}

export interface Counts {
  all: number
  active: number
  completed: number
}

/** Matches the FilterCriteria value object from the domain model. */
export type FilterCriteria = 'all' | 'active' | 'completed'

export interface AppError {
  id: string
  message: string
}

/** API response for GET /api/todos */
export interface ListTodosResponse {
  todos: TodoResource[]
  counts: Counts
}

/** API response for DELETE /api/todos?status=completed */
export interface DeleteCompletedResponse {
  deletedCount: number
}
