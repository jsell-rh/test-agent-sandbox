// ── Ubiquitous Language (matches domain-model.spec.md) ──────────────────────

/** Status of a Todo item: either being worked on or finished. */
export type TodoStatus = 'active' | 'completed'

/** Which subset of todos the user wants to view. */
export type FilterCriteria = 'all' | 'active' | 'completed'

// ── API Resource Representations ─────────────────────────────────────────────

/** A single Todo resource as returned by the API. */
export interface Todo {
  /** TodoId – UUID v4 */
  id: string
  /** TodoTitle – non-empty string */
  title: string
  /** TodoStatus */
  status: TodoStatus
  /** ISO 8601 UTC */
  createdAt: string
  /** ISO 8601 UTC */
  updatedAt: string
}

/** Counts breakdown returned by GET /api/todos. */
export interface Counts {
  all: number
  active: number
  completed: number
}

/** Response shape for GET /api/todos. */
export interface TodoListResponse {
  todos: Todo[]
  counts: Counts
}

/** Request body for POST /api/todos. */
export interface CreateTodoRequest {
  title: string
}

/** Request body for PATCH /api/todos/:id. */
export interface UpdateTodoRequest {
  title?: string
  status?: TodoStatus
}

/** Response shape for DELETE /api/todos?status=completed. */
export interface BulkDeleteResponse {
  deletedCount: number
}

/** Standard error envelope returned by 4xx/5xx responses. */
export interface ApiError {
  error: string
  message: string
}

// ── UI-Only Types ─────────────────────────────────────────────────────────────

/** A non-blocking notification shown to the user. */
export interface AppNotification {
  /** Unique ID for dismiss tracking. */
  id: string
  /** Human-readable message. */
  message: string
  /** Severity level. */
  level: 'error' | 'warning' | 'info'
}
