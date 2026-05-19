/**
 * Shared types for the Todo application.
 * Mirrors the domain model defined in domain-model.spec.md.
 */

/** TodoStatus: lifecycle state of a Todo */
export type TodoStatus = 'active' | 'completed'

/** FilterCriteria: view selection */
export type FilterCriteria = 'all' | 'active' | 'completed'

/** Todo resource as returned by the REST API */
export interface Todo {
  id: string
  title: string
  status: TodoStatus
  createdAt: string
  updatedAt: string
}

/** Counts returned by GET /api/todos */
export interface TodoCounts {
  all: number
  active: number
  completed: number
}

/** Response shape of GET /api/todos */
export interface TodoListResponse {
  todos: Todo[]
  counts: TodoCounts
}

/** Error envelope for API errors */
export interface ApiError {
  error: 'INVALID_TITLE' | 'TODO_NOT_FOUND' | 'BAD_REQUEST' | 'INTERNAL_ERROR'
  message: string
}

/** Inline error for the UI notification system */
export interface UiError {
  id: string
  message: string
  timestamp: number
}

/** Error auto-dismiss timeout in milliseconds */
export const ERROR_DISMISS_MS = 5_000
