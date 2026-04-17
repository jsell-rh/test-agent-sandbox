/**
 * useTodoApi — thin typed wrapper around the Todo REST API.
 *
 * All endpoints defined in specs/interface.spec.md are expressed here.
 * Actual usage (optimistic updates, state management) is handled by
 * the consuming page / component.
 */

export type TodoStatus = 'active' | 'completed'
export type FilterCriteria = 'all' | 'active' | 'completed'

export interface TodoDto {
  id: string
  title: string
  status: TodoStatus
  createdAt: string
  updatedAt: string
}

export interface TodoListResponse {
  items: TodoDto[]
  counts: {
    all: number
    active: number
    completed: number
  }
}

export interface CreateTodoRequest {
  title: string
}

export interface UpdateTodoRequest {
  title?: string
  status?: TodoStatus
}

export function useTodoApi() {
  const baseUrl = '/api/todos'

  async function listTodos(filter: FilterCriteria = 'all'): Promise<TodoListResponse> {
    return $fetch<TodoListResponse>(`${baseUrl}?filter=${filter}`)
  }

  async function getTodo(id: string): Promise<TodoDto> {
    return $fetch<TodoDto>(`${baseUrl}/${id}`)
  }

  async function createTodo(body: CreateTodoRequest): Promise<TodoDto> {
    return $fetch<TodoDto>(baseUrl, {
      method: 'POST',
      body,
    })
  }

  async function updateTodo(id: string, body: UpdateTodoRequest): Promise<TodoDto> {
    return $fetch<TodoDto>(`${baseUrl}/${id}`, {
      method: 'PATCH',
      body,
    })
  }

  async function deleteTodo(id: string): Promise<void> {
    return $fetch<void>(`${baseUrl}/${id}`, { method: 'DELETE' })
  }

  async function clearCompleted(): Promise<void> {
    return $fetch<void>(`${baseUrl}?status=completed`, { method: 'DELETE' })
  }

  return {
    listTodos,
    getTodo,
    createTodo,
    updateTodo,
    deleteTodo,
    clearCompleted,
  }
}
