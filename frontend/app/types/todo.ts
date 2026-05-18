/** Mirrors the API resource representation from the interface spec. */
export type TodoStatus = 'active' | 'completed'

export type FilterCriteria = 'all' | 'active' | 'completed'

export interface Todo {
  /** UUID v4 */
  id: string
  title: string
  status: TodoStatus
  createdAt: string
  updatedAt: string
}

export interface TodoListResponse {
  todos: Todo[]
  counts: {
    all: number
    active: number
    completed: number
  }
}

export interface ApiError {
  error: string
  message: string
}

/** Payload for POST /api/todos */
export interface CreateTodoPayload {
  title: string
}

/** Payload for PATCH /api/todos/:id */
export interface UpdateTodoPayload {
  title?: string
  status?: TodoStatus
}

export interface DeleteCompletedResponse {
  deletedCount: number
}
