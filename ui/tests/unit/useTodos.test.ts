/**
 * Unit tests for the useTodos composable.
 *
 * Tests the UI State Machine spec's critical test cases and failure modes
 * without requiring a browser or a running API server.
 *
 * $fetch is replaced by a vi.fn() per test so we can simulate any API
 * response, including errors and latency.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref, computed, watch, nextTick } from 'vue'
import { useTodos, FILTER_VALUES, type Todo } from '../../app/composables/useTodos'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeTodo(overrides: Partial<Todo> = {}): Todo {
  return {
    id: crypto.randomUUID(),
    title: 'Test todo',
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// Filter logic — "Filter tabs correctly show/hide items without a network request"
// ---------------------------------------------------------------------------

describe('FILTER_VALUES', () => {
  it('contains all, active, completed in that order', () => {
    expect(FILTER_VALUES).toEqual(['all', 'active', 'completed'])
  })
})

describe('filteredTodos', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    ;(globalThis.$fetch as ReturnType<typeof vi.fn>).mockResolvedValue({ todos: [], counts: {} })
  })

  it('filter=all returns every todo regardless of status', () => {
    const { todos, filteredTodos, setFilter } = useTodos()
    const a = makeTodo({ status: 'active' })
    const b = makeTodo({ status: 'completed' })
    todos.value = [a, b]

    setFilter('all')
    expect(filteredTodos.value).toHaveLength(2)
  })

  it('filter=active excludes completed todos — no network request', () => {
    const { todos, filteredTodos, setFilter } = useTodos()
    const a = makeTodo({ status: 'active' })
    const b = makeTodo({ status: 'completed' })
    todos.value = [a, b]

    setFilter('active')

    // $fetch should NOT be called for a client-side filter change
    expect($fetch).not.toHaveBeenCalled()
    expect(filteredTodos.value).toHaveLength(1)
    expect(filteredTodos.value[0].id).toBe(a.id)
  })

  it('filter=completed excludes active todos — no network request', () => {
    const { todos, filteredTodos, setFilter } = useTodos()
    const a = makeTodo({ status: 'active' })
    const b = makeTodo({ status: 'completed' })
    todos.value = [a, b]

    setFilter('completed')

    expect($fetch).not.toHaveBeenCalled()
    expect(filteredTodos.value).toHaveLength(1)
    expect(filteredTodos.value[0].id).toBe(b.id)
  })
})

// ---------------------------------------------------------------------------
// counts — "{N} item(s) left reflects current active count after toggling"
// ---------------------------------------------------------------------------

describe('counts', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('computes counts over ALL todos regardless of filter', () => {
    const { todos, counts, setFilter } = useTodos()
    todos.value = [
      makeTodo({ status: 'active' }),
      makeTodo({ status: 'active' }),
      makeTodo({ status: 'completed' }),
    ]
    setFilter('active') // only active items are shown…
    // …but counts still reflects all three
    expect(counts.value).toEqual({ all: 3, active: 2, completed: 1 })
  })

  it('active count updates after optimistic toggle', async () => {
    const todo = makeTodo({ status: 'active' })
    const { todos, counts, toggleTodo } = useTodos()
    todos.value = [todo]
    ;(globalThis.$fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ...todo,
      status: 'completed',
    })

    expect(counts.value.active).toBe(1)

    await toggleTodo(todo.id)

    expect(counts.value.active).toBe(0)
    expect(counts.value.completed).toBe(1)
  })
})

// ---------------------------------------------------------------------------
// createTodo — "Entering a title and pressing Enter creates a new item at the top"
// ---------------------------------------------------------------------------

describe('createTodo', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('prepends the new todo to todos[] and returns true on success', async () => {
    const existing = makeTodo({ title: 'Existing' })
    const newTodo = makeTodo({ title: 'New todo' })
    ;(globalThis.$fetch as ReturnType<typeof vi.fn>).mockResolvedValue(newTodo)

    const { todos, createTodo } = useTodos()
    todos.value = [existing]

    const result = await createTodo('New todo')

    expect(result).toBe(true)
    // Newest first — new todo at index 0
    expect(todos.value[0].id).toBe(newTodo.id)
    expect(todos.value[1].id).toBe(existing.id)
  })

  it('trims whitespace before calling the API', async () => {
    ;(globalThis.$fetch as ReturnType<typeof vi.fn>).mockResolvedValue(makeTodo())
    const { createTodo } = useTodos()

    await createTodo('  Buy milk  ')

    expect($fetch).toHaveBeenCalledWith('/api/todos', {
      method: 'POST',
      body: { title: 'Buy milk' },
    })
  })

  it('returns false and does NOT call the API for a blank title', async () => {
    const { createTodo } = useTodos()
    const result = await createTodo('   ')
    expect(result).toBe(false)
    expect($fetch).not.toHaveBeenCalled()
  })

  it('returns false and adds an error on API failure — todos[] unchanged', async () => {
    const existing = makeTodo()
    ;(globalThis.$fetch as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error('500 Internal Server Error'),
    )

    const { todos, errors, createTodo } = useTodos()
    todos.value = [existing]

    const result = await createTodo('New todo')

    expect(result).toBe(false)
    expect(todos.value).toHaveLength(1)
    expect(errors.value.length).toBeGreaterThan(0)
  })
})

// ---------------------------------------------------------------------------
// toggleTodo — optimistic update and rollback
// ---------------------------------------------------------------------------

describe('toggleTodo', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('applies optimistic update immediately', async () => {
    const todo = makeTodo({ status: 'active' })
    // Freeze $fetch so the promise never resolves during this check
    let resolve: (v: unknown) => void
    ;(globalThis.$fetch as ReturnType<typeof vi.fn>).mockImplementation(
      () => new Promise((r) => { resolve = r }),
    )

    const { todos, toggleTodo } = useTodos()
    todos.value = [todo]

    const promise = toggleTodo(todo.id)
    // Optimistic update visible before promise settles
    expect(todos.value[0].status).toBe('completed')

    resolve!({ ...todo, status: 'completed' })
    await promise
  })

  it('rolls back to original status on API error', async () => {
    const todo = makeTodo({ status: 'active' })
    ;(globalThis.$fetch as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('network'))

    const { todos, errors, toggleTodo } = useTodos()
    todos.value = [todo]

    await toggleTodo(todo.id)

    expect(todos.value[0].status).toBe('active') // rolled back
    expect(errors.value.length).toBeGreaterThan(0)
  })
})

// ---------------------------------------------------------------------------
// deleteTodo — optimistic removal and rollback
// ---------------------------------------------------------------------------

describe('deleteTodo', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('removes todo optimistically and confirms on success', async () => {
    const todo = makeTodo()
    ;(globalThis.$fetch as ReturnType<typeof vi.fn>).mockResolvedValue(undefined)

    const { todos, deleteTodo } = useTodos()
    todos.value = [todo]

    await deleteTodo(todo.id)

    expect(todos.value).toHaveLength(0)
  })

  it('restores todo at original position on API failure', async () => {
    const a = makeTodo({ title: 'A' })
    const b = makeTodo({ title: 'B' })
    ;(globalThis.$fetch as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('network'))

    const { todos, errors, deleteTodo } = useTodos()
    todos.value = [a, b]

    await deleteTodo(a.id)

    // Rolled back — a is restored at index 0
    expect(todos.value[0].id).toBe(a.id)
    expect(todos.value).toHaveLength(2)
    expect(errors.value.length).toBeGreaterThan(0)
  })
})

// ---------------------------------------------------------------------------
// submitEdit — "Submitting blank title in edit mode deletes the item"
// ---------------------------------------------------------------------------

describe('submitEdit', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('calls DELETE when submitted with an empty string', async () => {
    const todo = makeTodo()
    ;(globalThis.$fetch as ReturnType<typeof vi.fn>).mockResolvedValue(undefined)

    const { todos, editingTodoId, submitEdit } = useTodos()
    todos.value = [todo]
    editingTodoId.value = todo.id

    await submitEdit(todo.id, '')

    expect($fetch).toHaveBeenCalledWith(`/api/todos/${todo.id}`, { method: 'DELETE' })
    expect(todos.value).toHaveLength(0)
    expect(editingTodoId.value).toBeNull()
  })

  it('calls PATCH and clears editingTodoId on non-empty title', async () => {
    const todo = makeTodo()
    const updated = { ...todo, title: 'New title' }
    ;(globalThis.$fetch as ReturnType<typeof vi.fn>).mockResolvedValue(updated)

    const { todos, editingTodoId, submitEdit } = useTodos()
    todos.value = [todo]
    editingTodoId.value = todo.id

    await submitEdit(todo.id, 'New title')

    expect(todos.value[0].title).toBe('New title')
    expect(editingTodoId.value).toBeNull()
  })

  it('trims whitespace and deletes when result is blank', async () => {
    const todo = makeTodo()
    ;(globalThis.$fetch as ReturnType<typeof vi.fn>).mockResolvedValue(undefined)

    const { todos, submitEdit } = useTodos()
    todos.value = [todo]

    await submitEdit(todo.id, '   ')

    expect($fetch).toHaveBeenCalledWith(`/api/todos/${todo.id}`, { method: 'DELETE' })
    expect(todos.value).toHaveLength(0)
  })
})

// ---------------------------------------------------------------------------
// cancelEdit — "Pressing Escape in edit mode restores original title"
// ---------------------------------------------------------------------------

describe('cancelEdit', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('clears editingTodoId without calling the API', () => {
    const { editingTodoId, cancelEdit } = useTodos()
    editingTodoId.value = 'some-id'

    cancelEdit()

    expect(editingTodoId.value).toBeNull()
    expect($fetch).not.toHaveBeenCalled()
  })
})

// ---------------------------------------------------------------------------
// startEdit — "Double-clicking enters edit mode for that item only"
// ---------------------------------------------------------------------------

describe('startEdit', () => {
  it('sets editingTodoId to the given id', () => {
    const { editingTodoId, startEdit } = useTodos()
    startEdit('abc')
    expect(editingTodoId.value).toBe('abc')
  })

  it('only one item is in edit mode at a time — setting a new id replaces the old', () => {
    const { editingTodoId, startEdit } = useTodos()
    startEdit('first')
    startEdit('second')
    expect(editingTodoId.value).toBe('second')
  })
})

// ---------------------------------------------------------------------------
// clearCompleted — removes all completed todos client-side
// ---------------------------------------------------------------------------

describe('clearCompleted', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('removes completed todos from todos[] and calls DELETE /api/todos?status=completed', async () => {
    const active = makeTodo({ status: 'active' })
    const completed = makeTodo({ status: 'completed' })
    ;(globalThis.$fetch as ReturnType<typeof vi.fn>).mockResolvedValue({ deletedCount: 1 })

    const { todos, clearCompleted } = useTodos()
    todos.value = [active, completed]

    await clearCompleted()

    expect($fetch).toHaveBeenCalledWith('/api/todos', {
      method: 'DELETE',
      query: { status: 'completed' },
    })
    expect(todos.value).toHaveLength(1)
    expect(todos.value[0].id).toBe(active.id)
  })
})

// ---------------------------------------------------------------------------
// Failure mode: rapid duplicate toggles resolve to final server state
// ---------------------------------------------------------------------------

describe('rapid duplicate toggles', () => {
  it('final toggle wins — todos[] reflects last server response', async () => {
    const todo = makeTodo({ status: 'active' })
    // First toggle: server returns completed
    // Second toggle: server returns active (back)
    ;(globalThis.$fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({ ...todo, status: 'completed' })
      .mockResolvedValueOnce({ ...todo, status: 'active' })

    const { todos, toggleTodo } = useTodos()
    todos.value = [todo]

    await toggleTodo(todo.id)
    await toggleTodo(todo.id)

    expect(todos.value[0].status).toBe('active')
  })
})
