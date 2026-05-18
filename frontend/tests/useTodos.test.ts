/**
 * Unit tests for useTodos composable state machine.
 *
 * All network calls are mocked via globalThis.$fetch.
 * State is reset between tests via vi.resetModules().
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Todo, TodoListResponse } from '../app/types/todo'

// ── Helpers ───────────────────────────────────────────────────────────────

function makeTodo(overrides: Partial<Todo> = {}): Todo {
  return {
    id: crypto.randomUUID(),
    title: 'Buy milk',
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  }
}

// We re-import useTodos fresh each test (module reset clears singleton state)
async function freshUseTodos() {
  // Re-import a fresh module instance so singleton refs are reset
  const mod = await import('../app/composables/useTodos?t=' + Date.now())
  return mod.useTodos()
}

// ── Tests ─────────────────────────────────────────────────────────────────

describe('useTodos — loadTodos', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('loads todos and sorts newest first', async () => {
    const older = makeTodo({ createdAt: '2024-01-01T00:00:00Z', title: 'Older' })
    const newer = makeTodo({ createdAt: '2024-06-01T00:00:00Z', title: 'Newer' })
    const response: TodoListResponse = {
      todos: [older, newer],
      counts: { all: 2, active: 2, completed: 0 },
    }

    ;(globalThis as Record<string, unknown>).$fetch = vi.fn().mockResolvedValueOnce(response)

    const { loadTodos, todos } = await freshUseTodos()
    await loadTodos()

    expect(todos.value[0].title).toBe('Newer')
    expect(todos.value[1].title).toBe('Older')
  })

  it('handles API failure gracefully — todos stays empty', async () => {
    ;(globalThis as Record<string, unknown>).$fetch = vi.fn().mockRejectedValueOnce(new Error('Network error'))

    const { loadTodos, todos } = await freshUseTodos()
    await loadTodos()

    expect(todos.value).toHaveLength(0)
  })
})

describe('useTodos — createTodo', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('prepends newly created todo and returns true', async () => {
    const existing = makeTodo({ createdAt: '2024-01-01T00:00:00Z', title: 'Existing' })
    const created = makeTodo({ createdAt: '2024-06-01T00:00:00Z', title: 'New task' })

    const listResponse: TodoListResponse = {
      todos: [existing],
      counts: { all: 1, active: 1, completed: 0 },
    }

    const fetchMock = vi.fn()
      .mockResolvedValueOnce(listResponse) // loadTodos
      .mockResolvedValueOnce(created)      // createTodo

    ;(globalThis as Record<string, unknown>).$fetch = fetchMock

    const { loadTodos, createTodo, todos } = await freshUseTodos()
    await loadTodos()

    const ok = await createTodo('New task')

    expect(ok).toBe(true)
    expect(todos.value[0].title).toBe('New task')
    expect(todos.value).toHaveLength(2)
  })

  it('returns false and does not mutate state on failure', async () => {
    ;(globalThis as Record<string, unknown>).$fetch = vi.fn()
      .mockRejectedValueOnce(new Error('INVALID_TITLE'))

    const { createTodo, todos } = await freshUseTodos()
    const ok = await createTodo('')

    expect(ok).toBe(false)
    expect(todos.value).toHaveLength(0)
  })
})

describe('useTodos — toggleTodo', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('optimistically flips status and applies server response', async () => {
    const todo = makeTodo({ status: 'active' })
    const updated = { ...todo, status: 'completed' as const, updatedAt: new Date().toISOString() }

    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ todos: [todo], counts: { all: 1, active: 1, completed: 0 } })
      .mockResolvedValueOnce(updated)

    ;(globalThis as Record<string, unknown>).$fetch = fetchMock

    const { loadTodos, toggleTodo, todos } = await freshUseTodos()
    await loadTodos()
    await toggleTodo(todo.id)

    expect(todos.value[0].status).toBe('completed')
  })

  it('rolls back optimistic update on API failure', async () => {
    const todo = makeTodo({ status: 'active' })

    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ todos: [todo], counts: { all: 1, active: 1, completed: 0 } })
      .mockRejectedValueOnce(new Error('Server error'))

    ;(globalThis as Record<string, unknown>).$fetch = fetchMock

    const { loadTodos, toggleTodo, todos } = await freshUseTodos()
    await loadTodos()
    await toggleTodo(todo.id)

    // Rolled back to original state
    expect(todos.value[0].status).toBe('active')
  })
})

describe('useTodos — deleteTodo', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('removes todo optimistically and succeeds', async () => {
    const todo = makeTodo()

    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ todos: [todo], counts: { all: 1, active: 1, completed: 0 } })
      .mockResolvedValueOnce(undefined) // DELETE 204

    ;(globalThis as Record<string, unknown>).$fetch = fetchMock

    const { loadTodos, deleteTodo, todos } = await freshUseTodos()
    await loadTodos()
    await deleteTodo(todo.id)

    expect(todos.value).toHaveLength(0)
  })

  it('rolls back on delete failure', async () => {
    const todo = makeTodo()

    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ todos: [todo], counts: { all: 1, active: 1, completed: 0 } })
      .mockRejectedValueOnce(new Error('Server error'))

    ;(globalThis as Record<string, unknown>).$fetch = fetchMock

    const { loadTodos, deleteTodo, todos } = await freshUseTodos()
    await loadTodos()
    await deleteTodo(todo.id)

    expect(todos.value).toHaveLength(1)
  })
})

describe('useTodos — clearCompleted', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('removes all completed todos and keeps active ones', async () => {
    const active = makeTodo({ status: 'active', title: 'Active task' })
    const completed = makeTodo({ status: 'completed', title: 'Done task' })

    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        todos: [active, completed],
        counts: { all: 2, active: 1, completed: 1 },
      })
      .mockResolvedValueOnce({ deletedCount: 1 })

    ;(globalThis as Record<string, unknown>).$fetch = fetchMock

    const { loadTodos, clearCompleted, todos } = await freshUseTodos()
    await loadTodos()
    await clearCompleted()

    expect(todos.value).toHaveLength(1)
    expect(todos.value[0].status).toBe('active')
  })
})

describe('useTodos — filter', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('filters todos client-side without API calls after initial load', async () => {
    const active = makeTodo({ status: 'active', title: 'Active task' })
    const completed = makeTodo({ status: 'completed', title: 'Done task' })

    ;(globalThis as Record<string, unknown>).$fetch = vi.fn().mockResolvedValueOnce({
      todos: [active, completed],
      counts: { all: 2, active: 1, completed: 1 },
    })

    const { loadTodos, setFilter, filteredTodos } = await freshUseTodos()
    await loadTodos()

    setFilter('active')
    expect(filteredTodos.value).toHaveLength(1)
    expect(filteredTodos.value[0].status).toBe('active')

    setFilter('completed')
    expect(filteredTodos.value).toHaveLength(1)
    expect(filteredTodos.value[0].status).toBe('completed')

    setFilter('all')
    expect(filteredTodos.value).toHaveLength(2)
  })

  it('counts always reflect all todos regardless of active filter', async () => {
    const active = makeTodo({ status: 'active' })
    const completed = makeTodo({ status: 'completed' })

    ;(globalThis as Record<string, unknown>).$fetch = vi.fn().mockResolvedValueOnce({
      todos: [active, completed],
      counts: { all: 2, active: 1, completed: 1 },
    })

    const { loadTodos, setFilter, counts } = await freshUseTodos()
    await loadTodos()

    setFilter('active')
    // Even with filter=active, counts reflects all todos
    expect(counts.value.all).toBe(2)
    expect(counts.value.active).toBe(1)
    expect(counts.value.completed).toBe(1)
  })
})

describe('useTodos — editing', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('startEditing sets editingTodoId, cancelEditing clears it', async () => {
    const { startEditing, cancelEditing, editingTodoId } = await freshUseTodos()

    expect(editingTodoId.value).toBeNull()

    startEditing('todo-123')
    expect(editingTodoId.value).toBe('todo-123')

    cancelEditing()
    expect(editingTodoId.value).toBeNull()
  })

  it('updateTitle clears editingTodoId on success', async () => {
    const todo = makeTodo({ title: 'Original' })
    const updated = { ...todo, title: 'Updated', updatedAt: new Date().toISOString() }

    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ todos: [todo], counts: { all: 1, active: 1, completed: 0 } })
      .mockResolvedValueOnce(updated)

    ;(globalThis as Record<string, unknown>).$fetch = fetchMock

    const { loadTodos, startEditing, updateTitle, editingTodoId, todos } = await freshUseTodos()
    await loadTodos()
    startEditing(todo.id)

    expect(editingTodoId.value).toBe(todo.id)

    await updateTitle(todo.id, 'Updated')

    expect(editingTodoId.value).toBeNull()
    expect(todos.value[0].title).toBe('Updated')
  })

  it('updateTitle keeps editingTodoId open on failure so user can retry', async () => {
    const todo = makeTodo({ title: 'Original' })

    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ todos: [todo], counts: { all: 1, active: 1, completed: 0 } })
      .mockRejectedValueOnce(new Error('Server error'))

    ;(globalThis as Record<string, unknown>).$fetch = fetchMock

    const { loadTodos, startEditing, updateTitle, editingTodoId } = await freshUseTodos()
    await loadTodos()
    startEditing(todo.id)
    await updateTitle(todo.id, 'New title')

    // Edit mode stays open so user can retry or escape
    expect(editingTodoId.value).toBe(todo.id)
  })
})

describe('useTodos — error messages', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('pushes an error message on API failure and auto-dismisses after 5s', async () => {
    ;(globalThis as Record<string, unknown>).$fetch = vi.fn().mockRejectedValueOnce(
      Object.assign(new Error('Not found'), { data: { message: 'TODO_NOT_FOUND' } }),
    )

    const { createTodo, errorMessages } = await freshUseTodos()
    await createTodo('Some task')

    expect(errorMessages.value).toHaveLength(1)

    // Advance timer by 5 s — message should be dismissed
    vi.advanceTimersByTime(5_000)
    expect(errorMessages.value).toHaveLength(0)
  })
})
