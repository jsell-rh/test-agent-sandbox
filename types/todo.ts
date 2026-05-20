/** Lifecycle state of a Todo. */
export type TodoStatus = 'active' | 'completed'

/**
 * Filter criteria for the todo list view.
 * Default value: 'all'.
 */
export type FilterCriteria = 'all' | 'active' | 'completed'

/** REST resource representation of a Todo. */
export interface Todo {
  id: string
  title: string
  status: TodoStatus
  createdAt: string
  updatedAt: string
}

/** Aggregate counts returned alongside a filtered todo list. */
export interface TodoCounts {
  all: number
  active: number
  completed: number
}

/** Shape of the GET /api/todos response. */
export interface TodoListResponse {
  todos: Todo[]
  counts: TodoCounts
}

/** Standard API error envelope. */
export interface ApiError {
  error: string
  message: string
}
