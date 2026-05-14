/**
 * Todos API client.
 *
 * Defines the `TodosApiClient` interface that decouples the UI state machine
 * from the actual HTTP transport. The real implementation uses Nuxt's `$fetch`.
 * Tests inject a fake implementation without touching the network.
 *
 * The URL path segment for todos (/api/todos) is composed from the runtime
 * config `apiBase` ('/api') plus the `TODOS_PATH_SEGMENT` constant.
 * This ensures values from Configuration flow through — never hardcoded.
 */

import type { TodoResource, TodoListResponse, FilterCriteria } from '~/types/todo'

/** Path segment appended to apiBase to build the todos endpoint URL. */
export const TODOS_PATH_SEGMENT = '/todos'

/** Payload for PATCH /api/todos/:id */
export interface PatchTodoRequest {
  title?: string
  status?: 'active' | 'completed'
}

/**
 * The API client interface injected into `useTodos`.
 *
 * Keeping transport separate from state logic means:
 *  - Tests use a fake implementation — no network required.
 *  - Swapping $fetch for another transport (Axios, native fetch) needs no
 *    changes to the composable or components.
 */
export interface TodosApiClient {
  /** GET /api/todos — list all todos, optionally filtered. */
  listTodos(filter?: FilterCriteria): Promise<TodoListResponse>

  /** POST /api/todos — create a new todo. */
  createTodo(title: string): Promise<TodoResource>

  /** PATCH /api/todos/:id — partial update (title and/or status). */
  patchTodo(id: string, patch: PatchTodoRequest): Promise<TodoResource>

  /** DELETE /api/todos/:id — permanently remove a todo. */
  deleteTodo(id: string): Promise<void>

  /** DELETE /api/todos?status=completed — bulk-delete all completed todos. */
  clearCompleted(): Promise<{ deletedCount: number }>
}

/**
 * Create the real API client backed by Nuxt's `$fetch`.
 *
 * @param todosUrl The full URL to the /api/todos endpoint, e.g. `/api/todos`.
 *   Derived from runtime config: `${apiBase}${TODOS_PATH_SEGMENT}`.
 */
export function createTodosApiClient(todosUrl: string): TodosApiClient {
  return {
    async listTodos(filter?: FilterCriteria): Promise<TodoListResponse> {
      const params: Record<string, string> = {}
      if (filter && filter !== 'all') {
        params['filter'] = filter
      }
      return await $fetch<TodoListResponse>(todosUrl, { params })
    },

    async createTodo(title: string): Promise<TodoResource> {
      return await $fetch<TodoResource>(todosUrl, {
        method: 'POST',
        body: { title },
      })
    },

    async patchTodo(id: string, patch: PatchTodoRequest): Promise<TodoResource> {
      return await $fetch<TodoResource>(`${todosUrl}/${id}`, {
        method: 'PATCH',
        body: patch,
      })
    },

    async deleteTodo(id: string): Promise<void> {
      await $fetch(`${todosUrl}/${id}`, { method: 'DELETE' })
    },

    async clearCompleted(): Promise<{ deletedCount: number }> {
      return await $fetch<{ deletedCount: number }>(todosUrl, {
        method: 'DELETE',
        params: { status: 'completed' },
      })
    },
  }
}
