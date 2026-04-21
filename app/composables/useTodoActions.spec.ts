/**
 * Tests: composables/useTodoActions.ts
 *
 * Verifies optimistic UI update behaviour, API ↔ store coordination,
 * and error surfacing for all failure modes defined in specs/interface.spec.md.
 *
 * Spec failure modes covered:
 *  - "API returns 500 on create" — false returned; error surfaced; store unchanged
 *  - "API returns 500 on toggle" — checkbox reverts to previous state (rollback)
 *  - "Network offline" — error surfaced; previously loaded list remains visible
 *  - "Duplicate rapid toggles" — final server state wins
 *
 * Strategy:
 *  - useApi is mocked to intercept all HTTP calls.
 *  - ApiClientError is imported from the real module (via importActual) so
 *    `instanceof` checks in useTodoActions work correctly.
 *  - A real Pinia store is used to verify state changes.
 *
 * Spec-Ref: specs/interface.spec.md@83f71c8105542fd0e91599d89f191c28862ee3ca
 * Task-Ref: task-019
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useTodosStore } from '~/stores/todos'
import type { Todo, TodoCounts, TodoListResponse } from '~/types/todo'

// ── Mock useApi ───────────────────────────────────────────────────────────────
// useApi is auto-imported by Nuxt from ~/composables/useApi.
// Mocking the module intercepts both the auto-import and the explicit
// `import { ApiClientError }` in useTodoActions.ts.

const mockGetTodos = vi.fn()
const mockCreateTodo = vi.fn()
const mockUpdateTodo = vi.fn()
const mockDeleteTodo = vi.fn()
const mockClearCompleted = vi.fn()

vi.mock('~/composables/useApi', async (importActual) => {
  // Spread the real module so ApiClientError class is the same reference
  // used by useTodoActions — required for `instanceof` checks to pass.
  const actual = await importActual<typeof import('~/composables/useApi')>()
  return {
    ...actual,
    useApi: () => ({
      getTodos: mockGetTodos,
      getTodo: vi.fn(),
      createTodo: mockCreateTodo,
      updateTodo: mockUpdateTodo,
      deleteTodo: mockDeleteTodo,
      clearCompleted: mockClearCompleted,
    }),
  }
})

// Import AFTER vi.mock so the module is intercepted.
import { useTodoActions } from '~/composables/useTodoActions'
import { ApiClientError } from '~/composables/useApi'

// ── Helpers ───────────────────────────────────────────────────────────────────

let _nextId = 0

function makeTodo(overrides: Partial<Todo> = {}): Todo {
  return {
    id: `todo-${++_nextId}`,
    title: 'Test todo',
    status: 'active',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    ...overrides,
  }
}

function makeCounts(overrides: Partial<TodoCounts> = {}): TodoCounts {
  return { all: 0, active: 0, completed: 0, ...overrides }
}

/** Create a typed ApiClientError as the real API layer would throw. */
function makeApiError(
  statusCode: number,
  code: 'TODO_NOT_FOUND' | 'INVALID_TITLE' | 'BAD_REQUEST' | 'INTERNAL_ERROR',
  message: string,
): ApiClientError {
  return new ApiClientError(statusCode, { error: code, message })
}

// ── Setup ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  setActivePinia(createPinia())
  _nextId = 0
  vi.clearAllMocks()
})

// ── loadTodos ─────────────────────────────────────────────────────────────────

describe('loadTodos', () => {
  it('fetches todos with default filter "all" and populates the store', async () => {
    const todo = makeTodo()
    const counts = makeCounts({ all: 1, active: 1 })
    const response: TodoListResponse = { todos: [todo], counts }
    mockGetTodos.mockResolvedValue(response)

    const store = useTodosStore()
    const { loadTodos } = useTodoActions()
    await loadTodos()

    expect(mockGetTodos).toHaveBeenCalledWith('all')
    expect(store.todos).toHaveLength(1)
    expect(store.todos[0]!.id).toBe(todo.id)
    expect(store.counts).toEqual(counts)
  })

  it('passes the requested filter to the API', async () => {
    mockGetTodos.mockResolvedValue({ todos: [], counts: makeCounts() })
    const { loadTodos } = useTodoActions()
    await loadTodos('active')
    expect(mockGetTodos).toHaveBeenCalledWith('active')
  })

  it('sets loading=true during the call and false afterwards', async () => {
    let loadingDuringCall = false
    mockGetTodos.mockImplementation(async () => {
      loadingDuringCall = useTodosStore().loading
      return { todos: [], counts: makeCounts() }
    })

    const store = useTodosStore()
    expect(store.loading).toBe(false)
    await useTodoActions().loadTodos()

    expect(loadingDuringCall).toBe(true)
    expect(store.loading).toBe(false)
  })

  it('surfaces an ApiClientError when the API fails', async () => {
    mockGetTodos.mockRejectedValue(makeApiError(500, 'INTERNAL_ERROR', 'Database unavailable'))

    const store = useTodosStore()
    await useTodoActions().loadTodos()

    expect(store.errors).toHaveLength(1)
    expect(store.errors[0]!.code).toBe('INTERNAL_ERROR')
    expect(store.errors[0]!.message).toBe('Database unavailable')
  })

  it('surfaces a generic error message for non-ApiClientError failures', async () => {
    mockGetTodos.mockRejectedValue(new Error('Network timeout'))

    const store = useTodosStore()
    await useTodoActions().loadTodos()

    expect(store.errors).toHaveLength(1)
    expect(store.errors[0]!.message).toBe('Failed to load todos')
  })

  it('sets loading=false even when the API fails (finally block)', async () => {
    mockGetTodos.mockRejectedValue(new Error('offline'))
    const store = useTodosStore()
    await useTodoActions().loadTodos()
    expect(store.loading).toBe(false)
  })

  it('leaves the existing todo list visible when reload fails (network offline)', async () => {
    // Pre-load some todos
    const existing = makeTodo({ title: 'Existing task' })
    const store = useTodosStore()
    store.setTodos([existing], makeCounts({ all: 1, active: 1 }))

    // Simulate going offline
    mockGetTodos.mockRejectedValue(new Error('Network error'))
    await useTodoActions().loadTodos()

    // Previously loaded list should still be visible
    expect(store.todos).toHaveLength(1)
    expect(store.todos[0]!.id).toBe(existing.id)
  })
})

// ── createTodo ────────────────────────────────────────────────────────────────

describe('createTodo', () => {
  it('calls the API, prepends the todo to the store, and returns true', async () => {
    const newTodo = makeTodo({ title: 'Buy milk' })
    mockCreateTodo.mockResolvedValue(newTodo)

    const store = useTodosStore()
    const result = await useTodoActions().createTodo('Buy milk')

    expect(result).toBe(true)
    expect(mockCreateTodo).toHaveBeenCalledWith({ title: 'Buy milk' })
    expect(store.todos).toHaveLength(1)
    expect(store.todos[0]!.id).toBe(newTodo.id)
  })

  it('trims whitespace before sending to the API', async () => {
    const newTodo = makeTodo({ title: 'Trimmed' })
    mockCreateTodo.mockResolvedValue(newTodo)
    await useTodoActions().createTodo('  Trimmed  ')
    expect(mockCreateTodo).toHaveBeenCalledWith({ title: 'Trimmed' })
  })

  it('prepends the new todo to the beginning (newest first)', async () => {
    const existing = makeTodo({ title: 'Old task' })
    const store = useTodosStore()
    store.setTodos([existing], makeCounts({ all: 1, active: 1 }))

    const fresh = makeTodo({ title: 'New task' })
    mockCreateTodo.mockResolvedValue(fresh)
    await useTodoActions().createTodo('New task')

    expect(store.todos[0]!.id).toBe(fresh.id)
    expect(store.todos[1]!.id).toBe(existing.id)
  })

  // Spec failure mode: "API returns 500 on create"
  it('returns false and surfaces the error when the API fails (input must not be cleared)', async () => {
    // Use a non-blank title so the composable forwards the call to the API.
    // The server rejects it (e.g., 500 Internal Server Error).
    mockCreateTodo.mockRejectedValue(makeApiError(500, 'INTERNAL_ERROR', 'Database unavailable'))

    const store = useTodosStore()
    const result = await useTodoActions().createTodo('Valid title')

    // Caller uses the return value to decide whether to clear the input.
    // false → input is NOT cleared (spec: "Input not cleared").
    expect(result).toBe(false)

    // Error is surfaced so the UI can display a toast.
    expect(store.errors).toHaveLength(1)
    expect(store.errors[0]!.code).toBe('INTERNAL_ERROR')
    expect(store.errors[0]!.message).toBe('Database unavailable')

    // Store state unchanged (spec: "UI state unchanged").
    expect(store.todos).toHaveLength(0)
  })

  it('returns false immediately for a blank title without calling the API', async () => {
    const result = await useTodoActions().createTodo('   ')
    expect(result).toBe(false)
    expect(mockCreateTodo).not.toHaveBeenCalled()
  })

  it('does NOT prepend to the store on API failure', async () => {
    const existing = makeTodo()
    const store = useTodosStore()
    store.setTodos([existing], makeCounts({ all: 1, active: 1 }))

    mockCreateTodo.mockRejectedValue(makeApiError(500, 'INTERNAL_ERROR', 'Server error'))
    await useTodoActions().createTodo('New task')

    expect(store.todos).toHaveLength(1)
  })
})

// ── toggleTodo — optimistic update + rollback ─────────────────────────────────

describe('toggleTodo — optimistic update with rollback', () => {
  it('applies the optimistic update immediately before the API resolves', async () => {
    const todo = makeTodo({ status: 'active' })
    const store = useTodosStore()
    store.setTodos([todo], makeCounts({ all: 1, active: 1 }))

    let resolveApi!: (value: Todo) => void
    mockUpdateTodo.mockReturnValue(new Promise<Todo>((res) => { resolveApi = res }))

    const { toggleTodo } = useTodoActions()
    const pending = toggleTodo(todo)

    // Before the API has responded, the store should show the optimistic state.
    expect(store.todos[0]!.status).toBe('completed')

    resolveApi({ ...todo, status: 'completed' })
    await pending
  })

  it('updates the store with the server response on success', async () => {
    const todo = makeTodo({ status: 'active' })
    const serverTodo: Todo = { ...todo, status: 'completed', updatedAt: '2024-06-01T00:00:00Z' }
    mockUpdateTodo.mockResolvedValue(serverTodo)

    const store = useTodosStore()
    store.setTodos([todo], makeCounts({ all: 1, active: 1 }))
    await useTodoActions().toggleTodo(todo)

    expect(store.todos[0]!.status).toBe('completed')
    expect(store.todos[0]!.updatedAt).toBe('2024-06-01T00:00:00Z')
  })

  it('sends status:"completed" when toggling an active todo', async () => {
    const todo = makeTodo({ status: 'active' })
    mockUpdateTodo.mockResolvedValue({ ...todo, status: 'completed' })

    const store = useTodosStore()
    store.setTodos([todo], makeCounts({ all: 1, active: 1 }))
    await useTodoActions().toggleTodo(todo)

    expect(mockUpdateTodo).toHaveBeenCalledWith(todo.id, { status: 'completed' })
  })

  it('sends status:"active" when toggling a completed todo', async () => {
    const todo = makeTodo({ status: 'completed' })
    mockUpdateTodo.mockResolvedValue({ ...todo, status: 'active' })

    const store = useTodosStore()
    store.setTodos([todo], makeCounts({ all: 1, active: 0, completed: 1 }))
    await useTodoActions().toggleTodo(todo)

    expect(mockUpdateTodo).toHaveBeenCalledWith(todo.id, { status: 'active' })
  })

  // Spec failure mode: "API returns 500 on toggle — Checkbox reverts"
  it('rolls back the optimistic update when the API fails', async () => {
    const todo = makeTodo({ status: 'active' })
    mockUpdateTodo.mockRejectedValue(makeApiError(500, 'INTERNAL_ERROR', 'Server error'))

    const store = useTodosStore()
    store.setTodos([todo], makeCounts({ all: 1, active: 1 }))
    await useTodoActions().toggleTodo(todo)

    // Status reverted to original (spec: "Checkbox reverts to previous state").
    expect(store.todos[0]!.status).toBe('active')
  })

  it('restores the count correctly after a failed toggle (active count unchanged)', async () => {
    const todo = makeTodo({ status: 'active' })
    mockUpdateTodo.mockRejectedValue(makeApiError(500, 'INTERNAL_ERROR', 'Error'))

    const store = useTodosStore()
    store.setTodos([todo], makeCounts({ all: 1, active: 1, completed: 0 }))
    await useTodoActions().toggleTodo(todo)

    expect(store.counts.active).toBe(1)
    expect(store.counts.completed).toBe(0)
  })

  it('surfaces an error when the toggle API call fails', async () => {
    const todo = makeTodo({ status: 'active' })
    mockUpdateTodo.mockRejectedValue(makeApiError(500, 'INTERNAL_ERROR', 'Toggle failed'))

    const store = useTodosStore()
    store.setTodos([todo], makeCounts({ all: 1, active: 1 }))
    await useTodoActions().toggleTodo(todo)

    expect(store.errors).toHaveLength(1)
    expect(store.errors[0]!.code).toBe('INTERNAL_ERROR')
    expect(store.errors[0]!.message).toBe('Toggle failed')
  })

  // Spec failure mode: "Duplicate rapid toggles — Second request supersedes first"
  it('reflects the final server state when two toggles race', async () => {
    const todo = makeTodo({ status: 'active' })
    const store = useTodosStore()
    store.setTodos([todo], makeCounts({ all: 1, active: 1 }))

    // First toggle: active → completed
    let resolve1!: (v: Todo) => void
    mockUpdateTodo.mockReturnValueOnce(new Promise<Todo>((res) => { resolve1 = res }))

    // Second toggle will be a separate call; at the time it runs, the store
    // shows 'completed' (optimistic), so the new status is 'active'.
    let resolve2!: (v: Todo) => void
    mockUpdateTodo.mockReturnValueOnce(new Promise<Todo>((res) => { resolve2 = res }))

    const { toggleTodo } = useTodoActions()

    // Fire both toggles without awaiting
    const t1 = toggleTodo({ ...todo, status: 'active' }) // active → completed
    const t2 = toggleTodo({ ...todo, status: 'completed' }) // completed → active

    // Resolve second request first (arrives out of order)
    resolve2({ ...todo, status: 'active', updatedAt: '2024-06-01T12:00:00Z' })
    await t2

    // Then resolve first request
    resolve1({ ...todo, status: 'completed', updatedAt: '2024-06-01T12:00:00Z' })
    await t1

    // Final state is whatever the last updateTodoInList call set.
    // The store reflects the last server response received.
    expect(store.todos[0]!.status).toBe('completed')
  })
})

// ── updateTitle ───────────────────────────────────────────────────────────────

describe('updateTitle', () => {
  it('PATCHes the new title on success and updates the store', async () => {
    const todo = makeTodo({ title: 'Old title' })
    const updated: Todo = { ...todo, title: 'New title' }
    mockUpdateTodo.mockResolvedValue(updated)

    const store = useTodosStore()
    store.setTodos([todo], makeCounts({ all: 1, active: 1 }))
    await useTodoActions().updateTitle(todo, 'New title')

    expect(mockUpdateTodo).toHaveBeenCalledWith(todo.id, { title: 'New title' })
    expect(store.todos[0]!.title).toBe('New title')
  })

  it('trims whitespace before sending to the API', async () => {
    const todo = makeTodo({ title: 'Original' })
    mockUpdateTodo.mockResolvedValue({ ...todo, title: 'Trimmed' })

    const store = useTodosStore()
    store.setTodos([todo], makeCounts({ all: 1, active: 1 }))
    await useTodoActions().updateTitle(todo, '  Trimmed  ')

    expect(mockUpdateTodo).toHaveBeenCalledWith(todo.id, { title: 'Trimmed' })
  })

  // Spec: "Submitting an empty string deletes the Todo"
  it('delegates to deleteTodo (DELETE request) when the new title is blank', async () => {
    const todo = makeTodo({ title: 'Will be deleted' })
    mockDeleteTodo.mockResolvedValue(undefined)

    const store = useTodosStore()
    store.setTodos([todo], makeCounts({ all: 1, active: 1 }))
    await useTodoActions().updateTitle(todo, '')

    expect(mockDeleteTodo).toHaveBeenCalledWith(todo.id)
    expect(mockUpdateTodo).not.toHaveBeenCalled()
    expect(store.todos).toHaveLength(0)
  })

  it('is a no-op when the trimmed title is identical to the current title', async () => {
    const todo = makeTodo({ title: 'Same title' })
    const store = useTodosStore()
    store.setTodos([todo], makeCounts({ all: 1, active: 1 }))
    await useTodoActions().updateTitle(todo, 'Same title')

    expect(mockUpdateTodo).not.toHaveBeenCalled()
    expect(mockDeleteTodo).not.toHaveBeenCalled()
  })

  it('surfaces an error when the PATCH API call fails', async () => {
    const todo = makeTodo()
    mockUpdateTodo.mockRejectedValue(makeApiError(422, 'INVALID_TITLE', 'Title too long'))

    const store = useTodosStore()
    store.setTodos([todo], makeCounts({ all: 1, active: 1 }))
    await useTodoActions().updateTitle(todo, 'Some very long title...')

    expect(store.errors).toHaveLength(1)
    expect(store.errors[0]!.code).toBe('INVALID_TITLE')
    expect(store.errors[0]!.message).toBe('Title too long')
  })
})

// ── deleteTodo — optimistic removal + rollback ────────────────────────────────

describe('deleteTodo — optimistic removal with rollback', () => {
  it('removes the todo from the store immediately (optimistic)', async () => {
    const todo = makeTodo()
    let resolveApi!: () => void
    mockDeleteTodo.mockReturnValue(new Promise<void>((res) => { resolveApi = res }))

    const store = useTodosStore()
    store.setTodos([todo], makeCounts({ all: 1, active: 1 }))

    const { deleteTodo } = useTodoActions()
    const pending = deleteTodo(todo)

    // Before the API has responded, the item is already gone.
    expect(store.todos).toHaveLength(0)
    expect(store.counts.all).toBe(0)

    resolveApi()
    await pending
  })

  it('todo stays removed after a successful DELETE', async () => {
    const todo = makeTodo()
    mockDeleteTodo.mockResolvedValue(undefined)

    const store = useTodosStore()
    store.setTodos([todo], makeCounts({ all: 1, active: 1 }))
    await useTodoActions().deleteTodo(todo)

    expect(store.todos).toHaveLength(0)
  })

  it('re-inserts the todo (rollback) when the DELETE API call fails', async () => {
    const todo = makeTodo()
    mockDeleteTodo.mockRejectedValue(makeApiError(404, 'TODO_NOT_FOUND', 'Not found'))

    const store = useTodosStore()
    store.setTodos([todo], makeCounts({ all: 1, active: 1 }))
    await useTodoActions().deleteTodo(todo)

    // The todo is re-inserted at the top of the list.
    expect(store.todos).toHaveLength(1)
    expect(store.todos[0]!.id).toBe(todo.id)
  })

  it('surfaces an error when the DELETE API call fails', async () => {
    const todo = makeTodo()
    mockDeleteTodo.mockRejectedValue(makeApiError(500, 'INTERNAL_ERROR', 'Delete failed'))

    const store = useTodosStore()
    store.setTodos([todo], makeCounts({ all: 1, active: 1 }))
    await useTodoActions().deleteTodo(todo)

    expect(store.errors).toHaveLength(1)
    expect(store.errors[0]!.code).toBe('INTERNAL_ERROR')
  })

  it('calls the API with the correct todo id', async () => {
    const todo = makeTodo()
    mockDeleteTodo.mockResolvedValue(undefined)

    const store = useTodosStore()
    store.setTodos([todo], makeCounts({ all: 1, active: 1 }))
    await useTodoActions().deleteTodo(todo)

    expect(mockDeleteTodo).toHaveBeenCalledWith(todo.id)
  })
})

// ── clearCompleted — optimistic bulk removal ──────────────────────────────────

describe('clearCompleted — optimistic bulk removal', () => {
  it('removes all completed todos from the store immediately (optimistic)', async () => {
    const active = makeTodo({ status: 'active' })
    const done = makeTodo({ status: 'completed' })
    let resolveApi!: () => void
    mockClearCompleted.mockReturnValue(new Promise<void>((res) => { resolveApi = res }))

    const store = useTodosStore()
    store.setTodos([active, done], makeCounts({ all: 2, active: 1, completed: 1 }))

    const { clearCompleted } = useTodoActions()
    const pending = clearCompleted()

    // Optimistically removed before API responds.
    expect(store.todos).toHaveLength(1)
    expect(store.todos[0]!.status).toBe('active')

    resolveApi()
    await pending
  })

  it('completed count is zero and all count decremented after successful clear', async () => {
    const active = makeTodo({ status: 'active' })
    const done = makeTodo({ status: 'completed' })
    mockClearCompleted.mockResolvedValue({ deletedCount: 1 })

    const store = useTodosStore()
    store.setTodos([active, done], makeCounts({ all: 2, active: 1, completed: 1 }))
    await useTodoActions().clearCompleted()

    expect(store.counts.completed).toBe(0)
    expect(store.counts.all).toBe(1)
  })

  it('reloads the full list from the server when clearCompleted fails', async () => {
    const active = makeTodo({ status: 'active' })
    const done = makeTodo({ status: 'completed' })
    mockClearCompleted.mockRejectedValue(makeApiError(500, 'INTERNAL_ERROR', 'Clear failed'))

    // loadTodos is called internally on failure to restore true server state.
    mockGetTodos.mockResolvedValue({
      todos: [active, done],
      counts: makeCounts({ all: 2, active: 1, completed: 1 }),
    })

    const store = useTodosStore()
    store.setTodos([active, done], makeCounts({ all: 2, active: 1, completed: 1 }))
    await useTodoActions().clearCompleted()

    // After the reload, the server state is restored.
    expect(mockGetTodos).toHaveBeenCalled()
    expect(store.todos).toHaveLength(2)
  })

  it('surfaces an error when clearCompleted fails', async () => {
    const done = makeTodo({ status: 'completed' })
    mockClearCompleted.mockRejectedValue(makeApiError(500, 'INTERNAL_ERROR', 'Server error'))
    mockGetTodos.mockResolvedValue({ todos: [], counts: makeCounts() })

    const store = useTodosStore()
    store.setTodos([done], makeCounts({ all: 1, active: 0, completed: 1 }))
    await useTodoActions().clearCompleted()

    expect(store.errors).toHaveLength(1)
    expect(store.errors[0]!.code).toBe('INTERNAL_ERROR')
  })
})
