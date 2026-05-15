/**
 * useTodos — composable unit tests.
 *
 * Tests the UI state machine defined in specs/interface.spec.md.
 * Uses a FakeTodosApi so no network is involved.
 *
 * Test plan mirrors the "UI — Critical Test Cases" and "Failure Modes"
 * sections of specs/interface.spec.md.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { nextTick } from 'vue'
import { useTodos } from '../app/composables/useTodos'
import { ERROR_AUTO_DISMISS_MS } from '../app/types/todo'
import { createFakeTodosApi } from './helpers/fakeTodosApi'
import type { FakeTodosApi } from './helpers/fakeTodosApi'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Flush all pending microtasks and Vue reactivity updates. */
async function flushAll(): Promise<void> {
  await nextTick()
  await nextTick()
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

let api: FakeTodosApi

beforeEach(() => {
  api = createFakeTodosApi()
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

// ---------------------------------------------------------------------------
// loadTodos
// ---------------------------------------------------------------------------

describe('loadTodos()', () => {
  it('populates todos state from the API', async () => {
    api.seed('Buy groceries')
    api.seed('Walk the dog')

    const state = useTodos(api)
    await state.loadTodos()
    await flushAll()

    expect(state.todos.value).toHaveLength(2)
    expect(state.todos.value[0]!.title).toBe('Walk the dog') // newest first
    expect(state.todos.value[1]!.title).toBe('Buy groceries')
  })

  it('starts with empty todos before loadTodos is called', () => {
    api.seed('Something')
    const state = useTodos(api)
    expect(state.todos.value).toHaveLength(0)
  })

  it('adds an error notification on API failure', async () => {
    api.failNext()
    const state = useTodos(api)
    await state.loadTodos()
    await flushAll()

    expect(state.errors.value).toHaveLength(1)
    expect(state.todos.value).toHaveLength(0)
  })
})

// ---------------------------------------------------------------------------
// createTodo
// ---------------------------------------------------------------------------

describe('createTodo()', () => {
  it('prepends new todo to the list and returns true on success', async () => {
    api.seed('Existing')
    const state = useTodos(api)
    await state.loadTodos()
    await flushAll()

    const result = await state.createTodo('New todo')
    await flushAll()

    expect(result).toBe(true)
    expect(state.todos.value).toHaveLength(2)
    expect(state.todos.value[0]!.title).toBe('New todo')
  })

  it('returns false and adds error on API failure', async () => {
    const state = useTodos(api)
    await state.loadTodos()

    api.failNext()
    const result = await state.createTodo('Will fail')
    await flushAll()

    expect(result).toBe(false)
    expect(state.todos.value).toHaveLength(0) // list unchanged
    expect(state.errors.value).toHaveLength(1)
  })

  it('new todo has status "active"', async () => {
    const state = useTodos(api)
    await state.createTodo('Active task')
    await flushAll()

    expect(state.todos.value[0]!.status).toBe('active')
  })
})

// ---------------------------------------------------------------------------
// toggleTodo
// ---------------------------------------------------------------------------

describe('toggleTodo()', () => {
  it('applies optimistic update immediately (before API resolves)', async () => {
    const todo = api.seed('Task', 'active')
    const state = useTodos(api)
    await state.loadTodos()
    await flushAll()

    const togglePromise = state.toggleTodo(todo.id)

    // Before the promise resolves, check that the optimistic update is applied
    await nextTick()
    expect(state.todos.value.find(t => t.id === todo.id)!.status).toBe('completed')

    await togglePromise
    await flushAll()
    expect(state.todos.value.find(t => t.id === todo.id)!.status).toBe('completed')
  })

  it('toggles active → completed', async () => {
    const todo = api.seed('Task', 'active')
    const state = useTodos(api)
    await state.loadTodos()
    await flushAll()

    await state.toggleTodo(todo.id)
    await flushAll()

    expect(state.todos.value.find(t => t.id === todo.id)!.status).toBe('completed')
  })

  it('toggles completed → active', async () => {
    const todo = api.seed('Task', 'completed')
    const state = useTodos(api)
    await state.loadTodos()
    await flushAll()

    await state.toggleTodo(todo.id)
    await flushAll()

    expect(state.todos.value.find(t => t.id === todo.id)!.status).toBe('active')
  })

  it('rolls back optimistic update on API failure', async () => {
    const todo = api.seed('Task', 'active')
    const state = useTodos(api)
    await state.loadTodos()
    await flushAll()

    api.failNext()
    await state.toggleTodo(todo.id)
    await flushAll()

    // Should be rolled back to original status
    expect(state.todos.value.find(t => t.id === todo.id)!.status).toBe('active')
    expect(state.errors.value).toHaveLength(1)
  })
})

// ---------------------------------------------------------------------------
// updateTodoTitle
// ---------------------------------------------------------------------------

describe('updateTodoTitle()', () => {
  it('updates the title in the list', async () => {
    const todo = api.seed('Old title')
    const state = useTodos(api)
    await state.loadTodos()
    await flushAll()

    state.startEditing(todo.id)
    await state.updateTodoTitle(todo.id, 'New title')
    await flushAll()

    expect(state.todos.value.find(t => t.id === todo.id)!.title).toBe('New title')
  })

  it('clears editingTodoId on success', async () => {
    const todo = api.seed('Task')
    const state = useTodos(api)
    await state.loadTodos()
    await flushAll()

    state.startEditing(todo.id)
    expect(state.editingTodoId.value).toBe(todo.id)

    await state.updateTodoTitle(todo.id, 'Updated')
    await flushAll()

    expect(state.editingTodoId.value).toBeNull()
  })

  it('adds error and keeps editingTodoId on API failure', async () => {
    const todo = api.seed('Task')
    const state = useTodos(api)
    await state.loadTodos()
    await flushAll()

    state.startEditing(todo.id)
    api.failNext()
    await state.updateTodoTitle(todo.id, 'New')
    await flushAll()

    expect(state.errors.value).toHaveLength(1)
    expect(state.editingTodoId.value).toBe(todo.id) // still editing
  })
})

// ---------------------------------------------------------------------------
// deleteTodo
// ---------------------------------------------------------------------------

describe('deleteTodo()', () => {
  it('removes todo from list optimistically', async () => {
    const todo = api.seed('Delete me')
    const state = useTodos(api)
    await state.loadTodos()
    await flushAll()

    const deletePromise = state.deleteTodo(todo.id)
    await nextTick() // optimistic update
    expect(state.todos.value.find(t => t.id === todo.id)).toBeUndefined()

    await deletePromise
  })

  it('clears editingTodoId when the edited todo is deleted', async () => {
    const todo = api.seed('Task')
    const state = useTodos(api)
    await state.loadTodos()
    await flushAll()

    state.startEditing(todo.id)
    await state.deleteTodo(todo.id)
    await flushAll()

    expect(state.editingTodoId.value).toBeNull()
  })

  it('rolls back on API failure', async () => {
    const todo = api.seed('Keep me')
    const state = useTodos(api)
    await state.loadTodos()
    await flushAll()

    api.failNext()
    await state.deleteTodo(todo.id)
    await flushAll()

    expect(state.todos.value.find(t => t.id === todo.id)).toBeDefined()
    expect(state.errors.value).toHaveLength(1)
  })
})

// ---------------------------------------------------------------------------
// clearCompleted
// ---------------------------------------------------------------------------

describe('clearCompleted()', () => {
  it('removes all completed todos optimistically', async () => {
    api.seed('Active 1', 'active')
    api.seed('Done 1', 'completed')
    api.seed('Done 2', 'completed')
    const state = useTodos(api)
    await state.loadTodos()
    await flushAll()

    const clearPromise = state.clearCompleted()
    await nextTick() // optimistic update
    expect(state.todos.value.filter(t => t.status === 'completed')).toHaveLength(0)
    expect(state.todos.value).toHaveLength(1)

    await clearPromise
  })

  it('rolls back on API failure', async () => {
    api.seed('Done', 'completed')
    const state = useTodos(api)
    await state.loadTodos()
    await flushAll()

    api.failNext()
    await state.clearCompleted()
    await flushAll()

    expect(state.todos.value).toHaveLength(1) // rolled back
    expect(state.errors.value).toHaveLength(1)
  })
})

// ---------------------------------------------------------------------------
// Filter
// ---------------------------------------------------------------------------

describe('filter / filteredTodos', () => {
  it('default filter is "all"', () => {
    const state = useTodos(api)
    expect(state.filterCriteria.value).toBe('all')
  })

  it('filteredTodos returns all when filter is "all"', async () => {
    api.seed('Active', 'active')
    api.seed('Done', 'completed')
    const state = useTodos(api)
    await state.loadTodos()
    await flushAll()

    expect(state.filteredTodos.value).toHaveLength(2)
  })

  it('filteredTodos returns only active when filter is "active"', async () => {
    api.seed('Active', 'active')
    api.seed('Done', 'completed')
    const state = useTodos(api)
    await state.loadTodos()
    await flushAll()

    state.setFilter('active')
    await flushAll()

    expect(state.filteredTodos.value).toHaveLength(1)
    expect(state.filteredTodos.value[0]!.status).toBe('active')
  })

  it('filteredTodos returns only completed when filter is "completed"', async () => {
    api.seed('Active', 'active')
    api.seed('Done', 'completed')
    const state = useTodos(api)
    await state.loadTodos()
    await flushAll()

    state.setFilter('completed')
    await flushAll()

    expect(state.filteredTodos.value).toHaveLength(1)
    expect(state.filteredTodos.value[0]!.status).toBe('completed')
  })

  it('filter tabs operate on local state — no additional API requests', async () => {
    api.seed('Task')
    const state = useTodos(api)
    await state.loadTodos()
    await flushAll()

    // Record calls before filter change
    const todosBefore = api.getStoredTodos()

    state.setFilter('active')
    await flushAll()
    state.setFilter('completed')
    await flushAll()
    state.setFilter('all')
    await flushAll()

    // Stored todos should be unchanged — no write operations occurred
    expect(api.getStoredTodos()).toEqual(todosBefore)
  })
})

// ---------------------------------------------------------------------------
// Counts
// ---------------------------------------------------------------------------

describe('counts', () => {
  it('activeCount reflects current active todo count', async () => {
    api.seed('Active 1', 'active')
    api.seed('Active 2', 'active')
    api.seed('Done', 'completed')
    const state = useTodos(api)
    await state.loadTodos()
    await flushAll()

    expect(state.activeCount.value).toBe(2)
  })

  it('completedCount reflects current completed todo count', async () => {
    api.seed('Active', 'active')
    api.seed('Done 1', 'completed')
    api.seed('Done 2', 'completed')
    const state = useTodos(api)
    await state.loadTodos()
    await flushAll()

    expect(state.completedCount.value).toBe(2)
  })

  it('totalCount is the sum of all todos', async () => {
    api.seed('A', 'active')
    api.seed('B', 'completed')
    api.seed('C', 'active')
    const state = useTodos(api)
    await state.loadTodos()
    await flushAll()

    expect(state.totalCount.value).toBe(3)
  })

  it('"N item(s) left" reflects current active count after toggling', async () => {
    const todo = api.seed('Task', 'active')
    const state = useTodos(api)
    await state.loadTodos()
    await flushAll()

    expect(state.activeCount.value).toBe(1)

    await state.toggleTodo(todo.id)
    await flushAll()

    expect(state.activeCount.value).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// Edit mode
// ---------------------------------------------------------------------------

describe('editingTodoId', () => {
  it('starts as null', () => {
    const state = useTodos(api)
    expect(state.editingTodoId.value).toBeNull()
  })

  it('startEditing sets editingTodoId to the given id', () => {
    const state = useTodos(api)
    state.startEditing('some-id')
    expect(state.editingTodoId.value).toBe('some-id')
  })

  it('stopEditing clears editingTodoId', () => {
    const state = useTodos(api)
    state.startEditing('some-id')
    state.stopEditing()
    expect(state.editingTodoId.value).toBeNull()
  })

  it('double-clicking a title enters edit mode for that item only', () => {
    const state = useTodos(api)
    state.startEditing('id-1')
    expect(state.editingTodoId.value).toBe('id-1')
    // Starting edit on another item replaces the previous
    state.startEditing('id-2')
    expect(state.editingTodoId.value).toBe('id-2')
  })
})

// ---------------------------------------------------------------------------
// Error notifications
// ---------------------------------------------------------------------------

describe('error notifications', () => {
  it('errors auto-dismiss after ERROR_AUTO_DISMISS_MS', async () => {
    api.failNext()
    const state = useTodos(api)
    await state.loadTodos()
    await flushAll()

    expect(state.errors.value).toHaveLength(1)

    // Advance timers past the auto-dismiss delay
    vi.advanceTimersByTime(ERROR_AUTO_DISMISS_MS + 100)
    await flushAll()

    expect(state.errors.value).toHaveLength(0)
  })

  it('dismissError removes a specific notification by id', async () => {
    api.failNext()
    const state = useTodos(api)
    await state.loadTodos()
    await flushAll()

    const errorId = state.errors.value[0]!.id
    state.dismissError(errorId)
    await flushAll()

    expect(state.errors.value).toHaveLength(0)
  })

  it('multiple errors are tracked independently', async () => {
    // Trigger two separate failures
    api.failNext('First error')
    const state = useTodos(api)
    await state.loadTodos()
    await flushAll()

    api.failNext('Second error')
    await state.createTodo('Something')
    await flushAll()

    expect(state.errors.value).toHaveLength(2)
  })
})
