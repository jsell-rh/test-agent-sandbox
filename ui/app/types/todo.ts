/** Lifecycle state of a Todo — matches the domain's TodoStatus. */
export type TodoStatus = 'active' | 'completed'

/** View-selection filter — matches the domain's FilterCriteria. */
export type FilterCriteria = 'all' | 'active' | 'completed'

/** Wire representation of a single Todo returned by the API. */
export interface Todo {
  id: string
  title: string
  status: TodoStatus
  createdAt: string
  updatedAt: string
}

/** Counts returned alongside the Todo list. */
export interface TodoCounts {
  all: number
  active: number
  completed: number
}

/** Shape of GET /api/todos response. */
export interface TodosResponse {
  todos: Todo[]
  counts: TodoCounts
}

/** API error envelope shape. */
export interface ApiError {
  error: string
  message: string
}
