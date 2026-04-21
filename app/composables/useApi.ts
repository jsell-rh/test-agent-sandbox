/**
 * useApi — thin wrapper around $fetch that:
 *  - Prefixes all requests with /api
 *  - Normalises API errors into a typed ApiError object
 *  - Re-throws so callers can handle errors themselves
 *
 * Later tasks (task-011, task-016) will build higher-level composables
 * (useTodos, useTodoActions) on top of this primitive.
 */

import type {
  Todo,
  TodoListResponse,
  CreateTodoRequest,
  UpdateTodoRequest,
  DeleteCompletedResponse,
  FilterCriteria,
  ApiError,
} from '~/types/todo'

/** Typed fetch error from Nuxt's $fetch. */
export class ApiClientError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly apiError: ApiError,
  ) {
    super(apiError.message)
    this.name = 'ApiClientError'
  }
}

export function useApi() {
  /** Execute a $fetch call and normalise errors. */
  async function request<T>(
    path: string,
    options?: Parameters<typeof $fetch>[1],
  ): Promise<T> {
    try {
      return await $fetch<T>(path, {
        baseURL: '/api',
        ...options,
      })
    } catch (err: unknown) {
      // Nuxt's $fetch throws FetchError with a `data` property on 4xx/5xx.
      const fetchErr = err as { status?: number; data?: ApiError; message?: string }
      if (fetchErr.data?.error) {
        throw new ApiClientError(
          fetchErr.status ?? 500,
          fetchErr.data as ApiError,
        )
      }
      throw err
    }
  }

  // ── Todo endpoints ──────────────────────────────────────────────────────────

  function getTodos(filter: FilterCriteria = 'all'): Promise<TodoListResponse> {
    return request<TodoListResponse>('/todos', {
      query: { filter },
    })
  }

  function getTodo(id: string): Promise<Todo> {
    return request<Todo>(`/todos/${id}`)
  }

  function createTodo(body: CreateTodoRequest): Promise<Todo> {
    return request<Todo>('/todos', { method: 'POST', body })
  }

  function updateTodo(id: string, body: UpdateTodoRequest): Promise<Todo> {
    return request<Todo>(`/todos/${id}`, { method: 'PATCH', body })
  }

  function deleteTodo(id: string): Promise<void> {
    return request<void>(`/todos/${id}`, { method: 'DELETE' })
  }

  function clearCompleted(): Promise<DeleteCompletedResponse> {
    return request<DeleteCompletedResponse>('/todos', {
      method: 'DELETE',
      query: { status: 'completed' },
    })
  }

  return {
    getTodos,
    getTodo,
    createTodo,
    updateTodo,
    deleteTodo,
    clearCompleted,
  }
}
