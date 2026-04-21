/**
 * Shared TypeScript types for the Todo application.
 *
 * These mirror the Domain Model spec's Ubiquitous Language and the
 * API contract defined in the Interface Spec.
 */

// ── Value types ──────────────────────────────────────────────────────────────

/** UUID v4 string. */
export type TodoId = string

/** Non-empty string, max 500 characters. */
export type TodoTitle = string

/** Lifecycle state of a Todo item. */
export type TodoStatus = 'active' | 'completed'

/** Filter applied to the list view. */
export type FilterCriteria = 'all' | 'active' | 'completed'

// ── Resource representation (matches API JSON schema) ────────────────────────

export interface Todo {
  id: TodoId
  title: TodoTitle
  status: TodoStatus
  createdAt: string // ISO 8601 UTC
  updatedAt: string // ISO 8601 UTC
}

// ── API response shapes ───────────────────────────────────────────────────────

export interface TodoCounts {
  all: number
  active: number
  completed: number
}

export interface TodoListResponse {
  todos: Todo[]
  counts: TodoCounts
}

export interface DeleteCompletedResponse {
  deletedCount: number
}

// ── API request shapes ────────────────────────────────────────────────────────

export interface CreateTodoRequest {
  title: string
}

export interface UpdateTodoRequest {
  title?: string
  status?: TodoStatus
}

// ── API error envelope ────────────────────────────────────────────────────────

export type ApiErrorCode =
  | 'TODO_NOT_FOUND'
  | 'INVALID_TITLE'
  | 'BAD_REQUEST'
  | 'INTERNAL_ERROR'

export interface ApiError {
  error: ApiErrorCode
  message: string
}
