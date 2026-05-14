/**
 * Fake TodosApiClient implementation for testing.
 *
 * A real implementation of the TodosApiClient interface that stores state
 * in memory instead of making HTTP requests. This is a "fake" not a "mock" —
 * it implements actual business logic, not just spies on calls.
 *
 * Control methods (`seed`, `failNext`, `getStoredTodos`) are mixed in for
 * test setup and assertions.
 */

import type { TodosApiClient, PatchTodoRequest } from '../../app/composables/useTodosApi'
import type { TodoResource, TodoListResponse, FilterCriteria } from '../../app/types/todo'

let _idCounter = 0

/** Create a deterministic test ID. */
function nextId(): string {
  return `test-todo-${++_idCounter}`
}

function buildTodo(title: string, status: 'active' | 'completed' = 'active'): TodoResource {
  const now = new Date().toISOString()
  return { id: nextId(), title, status, createdAt: now, updatedAt: now }
}

function computeCounts(todos: TodoResource[]) {
  return {
    all: todos.length,
    active: todos.filter(t => t.status === 'active').length,
    completed: todos.filter(t => t.status === 'completed').length,
  }
}

/** Additional control methods for test setup and assertion. */
export interface FakeTodosApiControls {
  /** Add a pre-built todo to the store (newest-first). */
  seed(title: string, status?: 'active' | 'completed'): TodoResource
  /** Add a fully-specified todo resource to the store as-is. */
  seedRaw(todo: TodoResource): void
  /** Make the next API call throw with the given message. */
  failNext(message?: string): void
  /** Inspect current store contents. */
  getStoredTodos(): TodoResource[]
}

export type FakeTodosApi = TodosApiClient & FakeTodosApiControls

/** Create a new fake API client with an empty store. */
export function createFakeTodosApi(): FakeTodosApi {
  const _todos: TodoResource[] = []
  let _nextFailMessage: string | null = null

  function maybeThrow(): void {
    if (_nextFailMessage !== null) {
      const msg = _nextFailMessage
      _nextFailMessage = null
      throw Object.assign(new Error(msg), {
        data: { error: 'INTERNAL_ERROR', message: msg },
      })
    }
  }

  return {
    // -------------------------------------------------------------------------
    // Control methods
    // -------------------------------------------------------------------------

    seed(title, status = 'active') {
      const todo = buildTodo(title, status)
      _todos.unshift(todo) // newest first
      return todo
    },

    seedRaw(todo) {
      _todos.push(todo)
    },

    failNext(message = 'Simulated API error') {
      _nextFailMessage = message
    },

    getStoredTodos() {
      return [..._todos]
    },

    // -------------------------------------------------------------------------
    // TodosApiClient implementation
    // -------------------------------------------------------------------------

    async listTodos(filter?: FilterCriteria): Promise<TodoListResponse> {
      maybeThrow()
      const filtered
        = filter && filter !== 'all'
          ? _todos.filter(t => t.status === filter)
          : [..._todos]
      return { todos: filtered, counts: computeCounts(_todos) }
    },

    async createTodo(title: string): Promise<TodoResource> {
      maybeThrow()
      const todo = buildTodo(title, 'active')
      _todos.unshift(todo) // newest first
      return todo
    },

    async patchTodo(id: string, patch: PatchTodoRequest): Promise<TodoResource> {
      maybeThrow()
      const index = _todos.findIndex(t => t.id === id)
      if (index === -1) {
        throw Object.assign(new Error(`Todo ${id} not found`), {
          status: 404,
          data: { error: 'TODO_NOT_FOUND', message: `No Todo found with id "${id}".` },
        })
      }
      const updated: TodoResource = {
        ..._todos[index]!,
        ...patch,
        updatedAt: new Date().toISOString(),
      }
      _todos[index] = updated
      return updated
    },

    async deleteTodo(id: string): Promise<void> {
      maybeThrow()
      const index = _todos.findIndex(t => t.id === id)
      if (index !== -1) _todos.splice(index, 1)
    },

    async clearCompleted(): Promise<{ deletedCount: number }> {
      maybeThrow()
      const completedCount = _todos.filter(t => t.status === 'completed').length
      const active = _todos.filter(t => t.status !== 'completed')
      _todos.splice(0, _todos.length, ...active)
      return { deletedCount: completedCount }
    },
  }
}
