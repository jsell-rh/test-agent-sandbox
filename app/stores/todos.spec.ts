/**
 * Pinia store unit tests — todos store
 *
 * Tests the filter/count state machine as specified in specs/interface.spec.md:
 *  - filteredTodos getter (client-side, no network call)
 *  - hasAnyTodos getter
 *  - hasCompletedTodos getter
 *  - setFilter action
 *  - Count management across all mutating actions
 *
 * Coverage maps to the TDD plan in specs/interface.spec.md:
 *  - "Filter tabs correctly show/hide items without an additional network request"
 *  - "Clear completed button only visible when completedCount > 0"
 *  - "{N} item(s) left reflects current active count after toggling"
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useTodosStore } from '~/stores/todos'
import type { Todo, TodoCounts } from '~/types/todo'

// ── Helpers ──────────────────────────────────────────────────────────────────

let nextId = 0

function makeTodo(overrides: Partial<Todo> = {}): Todo {
  return {
    id: `todo-id-${++nextId}`,
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

// ── Setup ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  setActivePinia(createPinia())
  nextId = 0
})

// ── Initial state ─────────────────────────────────────────────────────────────

describe('initial state', () => {
  it('starts with an empty todos array', () => {
    const store = useTodosStore()
    expect(store.todos).toEqual([])
  })

  it('starts with zero counts', () => {
    const store = useTodosStore()
    expect(store.counts).toEqual({ all: 0, active: 0, completed: 0 })
  })

  it('starts with filterCriteria "all"', () => {
    const store = useTodosStore()
    expect(store.filterCriteria).toBe('all')
  })

  it('starts with no editing todo', () => {
    const store = useTodosStore()
    expect(store.editingTodoId).toBeNull()
  })

  it('starts not loading', () => {
    const store = useTodosStore()
    expect(store.loading).toBe(false)
  })

  it('starts with no errors', () => {
    const store = useTodosStore()
    expect(store.errors).toEqual([])
  })
})

// ── filteredTodos getter ───────────────────────────────────────────────────────

describe('filteredTodos getter — client-side filter (no network request)', () => {
  it('returns all todos when filter is "all"', () => {
    const store = useTodosStore()
    const active = makeTodo({ status: 'active' })
    const completed = makeTodo({ status: 'completed' })
    store.setTodos([active, completed], makeCounts({ all: 2, active: 1, completed: 1 }))

    store.setFilter('all')
    expect(store.filteredTodos).toHaveLength(2)
  })

  it('returns only active todos when filter is "active"', () => {
    const store = useTodosStore()
    const active = makeTodo({ status: 'active' })
    const completed = makeTodo({ status: 'completed' })
    store.setTodos([active, completed], makeCounts({ all: 2, active: 1, completed: 1 }))

    store.setFilter('active')
    const filtered = store.filteredTodos
    expect(filtered).toHaveLength(1)
    expect(filtered[0]!.status).toBe('active')
  })

  it('returns only completed todos when filter is "completed"', () => {
    const store = useTodosStore()
    const active = makeTodo({ status: 'active' })
    const completed = makeTodo({ status: 'completed' })
    store.setTodos([active, completed], makeCounts({ all: 2, active: 1, completed: 1 }))

    store.setFilter('completed')
    const filtered = store.filteredTodos
    expect(filtered).toHaveLength(1)
    expect(filtered[0]!.status).toBe('completed')
  })

  it('returns empty array when no todos match the filter', () => {
    const store = useTodosStore()
    const active = makeTodo({ status: 'active' })
    store.setTodos([active], makeCounts({ all: 1, active: 1, completed: 0 }))

    store.setFilter('completed')
    expect(store.filteredTodos).toHaveLength(0)
  })

  it('filter changes re-evaluate the getter without modifying todos[]', () => {
    const store = useTodosStore()
    const active = makeTodo({ status: 'active' })
    store.setTodos([active], makeCounts({ all: 1, active: 1, completed: 0 }))

    store.setFilter('completed')
    expect(store.filteredTodos).toHaveLength(0)

    // Switch back — original list unchanged
    store.setFilter('all')
    expect(store.filteredTodos).toHaveLength(1)
    expect(store.todos).toHaveLength(1) // underlying array untouched
  })
})

// ── hasAnyTodos getter ────────────────────────────────────────────────────────

describe('hasAnyTodos getter', () => {
  it('is false when todos is empty', () => {
    const store = useTodosStore()
    expect(store.hasAnyTodos).toBe(false)
  })

  it('is true when at least one todo exists', () => {
    const store = useTodosStore()
    store.setTodos([makeTodo()], makeCounts({ all: 1, active: 1, completed: 0 }))
    expect(store.hasAnyTodos).toBe(true)
  })

  it('returns to false after all todos are removed', () => {
    const store = useTodosStore()
    const todo = makeTodo()
    store.setTodos([todo], makeCounts({ all: 1, active: 1, completed: 0 }))
    expect(store.hasAnyTodos).toBe(true)

    store.removeTodo(todo.id)
    expect(store.hasAnyTodos).toBe(false)
  })
})

// ── hasCompletedTodos getter ──────────────────────────────────────────────────

describe('hasCompletedTodos getter — drives "Clear completed" visibility', () => {
  it('is false when completedCount is 0', () => {
    const store = useTodosStore()
    store.setTodos([makeTodo()], makeCounts({ all: 1, active: 1, completed: 0 }))
    expect(store.hasCompletedTodos).toBe(false)
  })

  it('is true when completedCount > 0', () => {
    const store = useTodosStore()
    const todo = makeTodo({ status: 'completed' })
    store.setTodos([todo], makeCounts({ all: 1, active: 0, completed: 1 }))
    expect(store.hasCompletedTodos).toBe(true)
  })

  it('becomes true after a todo is completed via updateTodoInList', () => {
    const store = useTodosStore()
    const todo = makeTodo({ status: 'active' })
    store.setTodos([todo], makeCounts({ all: 1, active: 1, completed: 0 }))
    expect(store.hasCompletedTodos).toBe(false)

    store.updateTodoInList({ ...todo, status: 'completed' })
    expect(store.hasCompletedTodos).toBe(true)
  })

  it('becomes false after all completed todos are cleared', () => {
    const store = useTodosStore()
    const completed = makeTodo({ status: 'completed' })
    store.setTodos([completed], makeCounts({ all: 1, active: 0, completed: 1 }))
    expect(store.hasCompletedTodos).toBe(true)

    store.removeCompletedTodos()
    expect(store.hasCompletedTodos).toBe(false)
  })
})

// ── setFilter action ──────────────────────────────────────────────────────────

describe('setFilter action', () => {
  it('updates filterCriteria to "active"', () => {
    const store = useTodosStore()
    store.setFilter('active')
    expect(store.filterCriteria).toBe('active')
  })

  it('updates filterCriteria to "completed"', () => {
    const store = useTodosStore()
    store.setFilter('completed')
    expect(store.filterCriteria).toBe('completed')
  })

  it('updates filterCriteria back to "all"', () => {
    const store = useTodosStore()
    store.setFilter('completed')
    store.setFilter('all')
    expect(store.filterCriteria).toBe('all')
  })
})

// ── prependTodo action — count management ─────────────────────────────────────

describe('prependTodo action', () => {
  it('adds todo to the front of the list', () => {
    const store = useTodosStore()
    const first = makeTodo({ title: 'First' })
    const second = makeTodo({ title: 'Second' })
    store.prependTodo(first)
    store.prependTodo(second)

    expect(store.todos[0]!.title).toBe('Second')
    expect(store.todos[1]!.title).toBe('First')
  })

  it('increments all and active counts for an active todo', () => {
    const store = useTodosStore()
    store.prependTodo(makeTodo({ status: 'active' }))

    expect(store.counts.all).toBe(1)
    expect(store.counts.active).toBe(1)
    expect(store.counts.completed).toBe(0)
  })

  it('increments all and completed counts for a completed todo', () => {
    const store = useTodosStore()
    store.prependTodo(makeTodo({ status: 'completed' }))

    expect(store.counts.all).toBe(1)
    expect(store.counts.active).toBe(0)
    expect(store.counts.completed).toBe(1)
  })
})

// ── updateTodoInList action — count management ────────────────────────────────

describe('updateTodoInList action', () => {
  it('updates the todo in place', () => {
    const store = useTodosStore()
    const todo = makeTodo({ title: 'Original' })
    store.setTodos([todo], makeCounts({ all: 1, active: 1, completed: 0 }))

    store.updateTodoInList({ ...todo, title: 'Updated' })
    expect(store.todos[0]!.title).toBe('Updated')
  })

  it('adjusts counts when status changes active → completed', () => {
    const store = useTodosStore()
    const todo = makeTodo({ status: 'active' })
    store.setTodos([todo], makeCounts({ all: 1, active: 1, completed: 0 }))

    store.updateTodoInList({ ...todo, status: 'completed' })

    expect(store.counts.active).toBe(0)
    expect(store.counts.completed).toBe(1)
    expect(store.counts.all).toBe(1)
  })

  it('adjusts counts when status changes completed → active', () => {
    const store = useTodosStore()
    const todo = makeTodo({ status: 'completed' })
    store.setTodos([todo], makeCounts({ all: 1, active: 0, completed: 1 }))

    store.updateTodoInList({ ...todo, status: 'active' })

    expect(store.counts.active).toBe(1)
    expect(store.counts.completed).toBe(0)
    expect(store.counts.all).toBe(1)
  })

  it('does not adjust counts when status is unchanged', () => {
    const store = useTodosStore()
    const todo = makeTodo({ status: 'active' })
    store.setTodos([todo], makeCounts({ all: 1, active: 1, completed: 0 }))

    store.updateTodoInList({ ...todo, title: 'New title' })

    expect(store.counts.active).toBe(1)
    expect(store.counts.completed).toBe(0)
  })

  it('is a no-op for an unknown id', () => {
    const store = useTodosStore()
    const todo = makeTodo()
    store.setTodos([todo], makeCounts({ all: 1, active: 1, completed: 0 }))

    const before = { ...store.counts }
    store.updateTodoInList({ ...todo, id: 'unknown-id', status: 'completed' })

    expect(store.counts).toEqual(before)
    expect(store.todos).toHaveLength(1)
  })
})

// ── removeTodo action — count management ─────────────────────────────────────

describe('removeTodo action', () => {
  it('removes the todo from the list', () => {
    const store = useTodosStore()
    const todo = makeTodo()
    store.setTodos([todo], makeCounts({ all: 1, active: 1, completed: 0 }))

    store.removeTodo(todo.id)
    expect(store.todos).toHaveLength(0)
  })

  it('decrements all and active counts when removing an active todo', () => {
    const store = useTodosStore()
    const todo = makeTodo({ status: 'active' })
    store.setTodos([todo], makeCounts({ all: 1, active: 1, completed: 0 }))

    store.removeTodo(todo.id)
    expect(store.counts.all).toBe(0)
    expect(store.counts.active).toBe(0)
  })

  it('decrements all and completed counts when removing a completed todo', () => {
    const store = useTodosStore()
    const todo = makeTodo({ status: 'completed' })
    store.setTodos([todo], makeCounts({ all: 1, active: 0, completed: 1 }))

    store.removeTodo(todo.id)
    expect(store.counts.all).toBe(0)
    expect(store.counts.completed).toBe(0)
  })

  it('is a no-op for an unknown id', () => {
    const store = useTodosStore()
    const todo = makeTodo()
    store.setTodos([todo], makeCounts({ all: 1, active: 1, completed: 0 }))

    store.removeTodo('unknown-id')
    expect(store.todos).toHaveLength(1)
    expect(store.counts.all).toBe(1)
  })
})

// ── removeCompletedTodos action ───────────────────────────────────────────────

describe('removeCompletedTodos action — "Clear completed"', () => {
  it('removes all completed todos from the list', () => {
    const store = useTodosStore()
    const active = makeTodo({ status: 'active' })
    const c1 = makeTodo({ status: 'completed' })
    const c2 = makeTodo({ status: 'completed' })
    store.setTodos([active, c1, c2], makeCounts({ all: 3, active: 1, completed: 2 }))

    store.removeCompletedTodos()
    expect(store.todos).toHaveLength(1)
    expect(store.todos[0]!.status).toBe('active')
  })

  it('sets completedCount to 0 and adjusts all count', () => {
    const store = useTodosStore()
    const active = makeTodo({ status: 'active' })
    const c1 = makeTodo({ status: 'completed' })
    const c2 = makeTodo({ status: 'completed' })
    store.setTodos([active, c1, c2], makeCounts({ all: 3, active: 1, completed: 2 }))

    store.removeCompletedTodos()

    expect(store.counts.completed).toBe(0)
    expect(store.counts.all).toBe(1)
    expect(store.counts.active).toBe(1)
  })

  it('is a no-op when there are no completed todos', () => {
    const store = useTodosStore()
    const active = makeTodo({ status: 'active' })
    store.setTodos([active], makeCounts({ all: 1, active: 1, completed: 0 }))

    store.removeCompletedTodos()
    expect(store.todos).toHaveLength(1)
    expect(store.counts.all).toBe(1)
  })

  it('leaves todos empty when all were completed', () => {
    const store = useTodosStore()
    const c1 = makeTodo({ status: 'completed' })
    const c2 = makeTodo({ status: 'completed' })
    store.setTodos([c1, c2], makeCounts({ all: 2, active: 0, completed: 2 }))

    store.removeCompletedTodos()
    expect(store.todos).toHaveLength(0)
    expect(store.counts).toEqual({ all: 0, active: 0, completed: 0 })
  })
})

// ── Edit mode actions ─────────────────────────────────────────────────────────

describe('edit mode actions', () => {
  it('startEditing sets editingTodoId', () => {
    const store = useTodosStore()
    store.startEditing('some-id')
    expect(store.editingTodoId).toBe('some-id')
  })

  it('stopEditing clears editingTodoId', () => {
    const store = useTodosStore()
    store.startEditing('some-id')
    store.stopEditing()
    expect(store.editingTodoId).toBeNull()
  })
})

// ── Error management ──────────────────────────────────────────────────────────

describe('error management', () => {
  it('addError appends a toast with id, code, and message', () => {
    const store = useTodosStore()
    store.addError('INVALID_TITLE', 'Title is required')

    expect(store.errors).toHaveLength(1)
    expect(store.errors[0]!.code).toBe('INVALID_TITLE')
    expect(store.errors[0]!.message).toBe('Title is required')
    expect(store.errors[0]!.id).toBeTruthy()
  })

  it('dismissError removes the toast by id', () => {
    const store = useTodosStore()
    store.addError('INVALID_TITLE', 'Title is required')
    const id = store.errors[0]!.id

    store.dismissError(id)
    expect(store.errors).toHaveLength(0)
  })

  it('dismissError is a no-op for unknown id', () => {
    const store = useTodosStore()
    store.addError('INVALID_TITLE', 'msg')

    store.dismissError('unknown-id')
    expect(store.errors).toHaveLength(1)
  })

  // spec NFR: "auto-dismiss after 5s"
  it('auto-dismisses an error toast after 5 seconds', () => {
    vi.useFakeTimers()
    try {
      const store = useTodosStore()
      store.addError('INTERNAL_ERROR', 'Transient error')
      expect(store.errors).toHaveLength(1)

      // Advance time to just before the 5 s threshold — toast must still be present.
      vi.advanceTimersByTime(4_999)
      expect(store.errors).toHaveLength(1)

      // Advance the remaining millisecond — setTimeout fires, toast dismissed.
      vi.advanceTimersByTime(1)
      expect(store.errors).toHaveLength(0)
    } finally {
      vi.useRealTimers()
    }
  })
})
