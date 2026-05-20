/**
 * Unit tests for the useTodos composable.
 *
 * These tests exercise the pure state-management logic:
 *   - client-side filtering (no network call per filter change)
 *   - optimistic updates (toggle, delete)
 *   - count tracking
 *
 * $fetch is a Nuxt global; we stub it with vi.stubGlobal().
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { Todo, TodoListResponse } from '~/types/todo'

// ── Helpers ────────────────────────────────────────────────────────────────
const makeTodo = (overrides: Partial<Todo> = {}): Todo => ({
  id: crypto.randomUUID(),
  title: 'Test todo',
  status: 'active',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
})

// ── $fetch global stub ─────────────────────────────────────────────────────
const fetchMock = vi.fn()

beforeEach(() => {
  fetchMock.mockReset()
  vi.stubGlobal('$fetch', fetchMock)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('useTodos — filtering (client-side, no extra network request)', () => {
  it('returns all todos when filter is "all"', async () => {
    const active = makeTodo({ status: 'active' })
    const completed = makeTodo({ status: 'completed' })

    fetchMock.mockResolvedValueOnce({
      todos: [active, completed],
      counts: { all: 2, active: 1, completed: 1 },
    } satisfies TodoListResponse)

    const { loadTodos, filteredTodos, setFilter } = useTodos()
    await loadTodos()
    setFilter('all')

    expect(filteredTodos.value).toHaveLength(2)
    // Only one fetch call — no additional call for the filter change
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('returns only active todos when filter is "active"', async () => {
    const active = makeTodo({ title: 'Active todo', status: 'active' })
    const completed = makeTodo({ title: 'Done todo', status: 'completed' })

    fetchMock.mockResolvedValueOnce({
      todos: [active, completed],
      counts: { all: 2, active: 1, completed: 1 },
    } satisfies TodoListResponse)

    const { loadTodos, filteredTodos, setFilter } = useTodos()
    await loadTodos()
    setFilter('active')

    expect(filteredTodos.value).toHaveLength(1)
    expect(filteredTodos.value[0]!.title).toBe('Active todo')
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('returns only completed todos when filter is "completed"', async () => {
    const active = makeTodo({ title: 'Active todo', status: 'active' })
    const completed = makeTodo({ title: 'Done todo', status: 'completed' })

    fetchMock.mockResolvedValueOnce({
      todos: [active, completed],
      counts: { all: 2, active: 1, completed: 1 },
    } satisfies TodoListResponse)

    const { loadTodos, filteredTodos, setFilter } = useTodos()
    await loadTodos()
    setFilter('completed')

    expect(filteredTodos.value).toHaveLength(1)
    expect(filteredTodos.value[0]!.title).toBe('Done todo')
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})

describe('useTodos — createTodo', () => {
  it('prepends the new todo to todos[] on success', async () => {
    const existing = makeTodo({ title: 'Old todo' })
    const newTodo = makeTodo({ title: 'New todo' })

    fetchMock
      .mockResolvedValueOnce({ todos: [existing], counts: { all: 1, active: 1, completed: 0 } })
      .mockResolvedValueOnce(newTodo)

    const { loadTodos, createTodo, todos } = useTodos()
    await loadTodos()
    await createTodo('New todo')

    expect(todos.value[0]!.title).toBe('New todo')
    expect(todos.value).toHaveLength(2)
  })

  it('increments active and all counts after successful create', async () => {
    fetchMock
      .mockResolvedValueOnce({ todos: [], counts: { all: 0, active: 0, completed: 0 } })
      .mockResolvedValueOnce(makeTodo({ title: 'New todo' }))

    const { loadTodos, createTodo, counts } = useTodos()
    await loadTodos()
    await createTodo('New todo')

    expect(counts.value.all).toBe(1)
    expect(counts.value.active).toBe(1)
  })

  it('does not modify todos[] on API error and re-throws (input not cleared by parent)', async () => {
    fetchMock
      .mockResolvedValueOnce({ todos: [], counts: { all: 0, active: 0, completed: 0 } })
      .mockRejectedValueOnce(new Error('INVALID_TITLE'))

    const { loadTodos, createTodo, todos } = useTodos()
    await loadTodos()

    await expect(createTodo('')).rejects.toThrow()

    // State unchanged — input should not be cleared by the parent on failure
    expect(todos.value).toHaveLength(0)
  })
})

describe('useTodos — updateTodo (toggle)', () => {
  it('updates active count immediately (optimistic) when toggling to completed', async () => {
    const todo = makeTodo({ status: 'active' })
    const updated = { ...todo, status: 'completed' as const }

    fetchMock
      .mockResolvedValueOnce({ todos: [todo], counts: { all: 1, active: 1, completed: 0 } })
      .mockResolvedValueOnce(updated)

    const { loadTodos, updateTodo, counts } = useTodos()
    await loadTodos()
    await updateTodo(todo.id, { status: 'completed' })

    expect(counts.value.active).toBe(0)
    expect(counts.value.completed).toBe(1)
  })

  it('reflects updated "{N} items left" active count after toggle', async () => {
    const todo = makeTodo({ status: 'active' })
    const updated = { ...todo, status: 'completed' as const }

    fetchMock
      .mockResolvedValueOnce({ todos: [todo], counts: { all: 1, active: 1, completed: 0 } })
      .mockResolvedValueOnce(updated)

    const { loadTodos, updateTodo, counts } = useTodos()
    await loadTodos()

    expect(counts.value.active).toBe(1)
    await updateTodo(todo.id, { status: 'completed' })
    expect(counts.value.active).toBe(0)
  })

  it('rolls back state when API returns an error', async () => {
    const todo = makeTodo({ status: 'active' })

    fetchMock
      .mockResolvedValueOnce({ todos: [todo], counts: { all: 1, active: 1, completed: 0 } })
      .mockRejectedValueOnce(new Error('Server error'))

    const { loadTodos, updateTodo, todos, counts } = useTodos()
    await loadTodos()

    await expect(updateTodo(todo.id, { status: 'completed' })).rejects.toThrow()

    // Rolled back to original state
    expect(todos.value[0]!.status).toBe('active')
    expect(counts.value.active).toBe(1)
    expect(counts.value.completed).toBe(0)
  })
})

describe('useTodos — deleteTodo', () => {
  it('removes the todo optimistically', async () => {
    const todo = makeTodo()

    fetchMock
      .mockResolvedValueOnce({ todos: [todo], counts: { all: 1, active: 1, completed: 0 } })
      .mockResolvedValueOnce(undefined)

    const { loadTodos, deleteTodo, todos } = useTodos()
    await loadTodos()
    await deleteTodo(todo.id)

    expect(todos.value).toHaveLength(0)
  })

  it('rolls back when delete API fails', async () => {
    const todo = makeTodo()

    fetchMock
      .mockResolvedValueOnce({ todos: [todo], counts: { all: 1, active: 1, completed: 0 } })
      .mockRejectedValueOnce(new Error('Network error'))

    const { loadTodos, deleteTodo, todos } = useTodos()
    await loadTodos()

    await expect(deleteTodo(todo.id)).rejects.toThrow()

    expect(todos.value).toHaveLength(1)
    expect(todos.value[0]!.id).toBe(todo.id)
  })
})

describe('useTodos — clearCompleted', () => {
  it('removes all completed todos optimistically', async () => {
    const active = makeTodo({ status: 'active' })
    const c1 = makeTodo({ status: 'completed' })
    const c2 = makeTodo({ status: 'completed' })

    fetchMock
      .mockResolvedValueOnce({
        todos: [active, c1, c2],
        counts: { all: 3, active: 1, completed: 2 },
      })
      .mockResolvedValueOnce({ deletedCount: 2 })

    const { loadTodos, clearCompleted, todos, counts } = useTodos()
    await loadTodos()
    await clearCompleted()

    expect(todos.value).toHaveLength(1)
    expect(todos.value[0]!.status).toBe('active')
    expect(counts.value.completed).toBe(0)
  })

  it('keeps the "Clear completed" button hidden when count reaches 0 after clearing', async () => {
    const c = makeTodo({ status: 'completed' })

    fetchMock
      .mockResolvedValueOnce({ todos: [c], counts: { all: 1, active: 0, completed: 1 } })
      .mockResolvedValueOnce({ deletedCount: 1 })

    const { loadTodos, clearCompleted, counts } = useTodos()
    await loadTodos()

    expect(counts.value.completed).toBe(1)
    await clearCompleted()
    expect(counts.value.completed).toBe(0)
  })
})
