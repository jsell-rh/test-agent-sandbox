/**
 * Tests for useTodos composable.
 *
 * Covers spec-required critical test cases for UI behaviour:
 * - Filter logic (client-side, no network request)
 * - Counts computation
 * - Optimistic toggle rollback
 * - Optimistic delete rollback
 * - Clear completed
 * - editingTodoId state machine
 */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { useTodos } from '~/composables/useTodos'

// ── Helpers ─────────────────────────────────────────────────────────────────

function makeTodo(overrides: Partial<{
  id: string
  title: string
  status: 'active' | 'completed'
  createdAt: string
  updatedAt: string
}> = {}) {
  return {
    id: overrides.id ?? `todo-${Math.random().toString(36).slice(2)}`,
    title: overrides.title ?? 'Test todo',
    status: overrides.status ?? 'active',
    createdAt: overrides.createdAt ?? new Date().toISOString(),
    updatedAt: overrides.updatedAt ?? new Date().toISOString(),
  }
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('useTodos — filter (client-side)', () => {
  beforeEach(() => {
    // Reset shared state between tests
    const { todos, filterCriteria, editingTodoId, notifications } = useTodos()
    todos.value = []
    filterCriteria.value = 'all'
    editingTodoId.value = null
    notifications.value = []
  })

  it('filteredTodos returns all todos when filter is "all"', () => {
    const { todos, filterCriteria, filteredTodos } = useTodos()
    todos.value = [makeTodo({ status: 'active' }), makeTodo({ status: 'completed' })]
    filterCriteria.value = 'all'

    expect(filteredTodos.value).toHaveLength(2)
  })

  it('filteredTodos returns only active todos when filter is "active"', () => {
    const { todos, filterCriteria, filteredTodos } = useTodos()
    todos.value = [
      makeTodo({ status: 'active' }),
      makeTodo({ status: 'active' }),
      makeTodo({ status: 'completed' }),
    ]
    filterCriteria.value = 'active'

    expect(filteredTodos.value).toHaveLength(2)
    expect(filteredTodos.value.every((t) => t.status === 'active')).toBe(true)
  })

  it('filteredTodos returns only completed todos when filter is "completed"', () => {
    const { todos, filterCriteria, filteredTodos } = useTodos()
    todos.value = [
      makeTodo({ status: 'active' }),
      makeTodo({ status: 'completed' }),
      makeTodo({ status: 'completed' }),
    ]
    filterCriteria.value = 'completed'

    expect(filteredTodos.value).toHaveLength(2)
    expect(filteredTodos.value.every((t) => t.status === 'completed')).toBe(true)
  })

  it('changing filter does not trigger a network request', () => {
    const { setFilter } = useTodos()
    const fetchSpy = vi.spyOn(globalThis, '$fetch' as never)
    setFilter('active')
    setFilter('completed')
    setFilter('all')
    expect(fetchSpy).not.toHaveBeenCalled()
    fetchSpy.mockRestore()
  })
})

describe('useTodos — counts computation', () => {
  beforeEach(() => {
    const { todos, filterCriteria } = useTodos()
    todos.value = []
    filterCriteria.value = 'all'
  })

  it('counts reflect current todos regardless of active filter', () => {
    const { todos, filterCriteria, counts } = useTodos()
    todos.value = [
      makeTodo({ status: 'active' }),
      makeTodo({ status: 'active' }),
      makeTodo({ status: 'completed' }),
    ]
    filterCriteria.value = 'active'

    expect(counts.value.all).toBe(3)
    expect(counts.value.active).toBe(2)
    expect(counts.value.completed).toBe(1)
  })

  it('"{N} items left" reflects active count after toggling', () => {
    const { todos, counts } = useTodos()
    todos.value = [
      makeTodo({ status: 'active' }),
      makeTodo({ status: 'active' }),
    ]
    // Simulate toggle by mutating status
    todos.value[0]!.status = 'completed'

    expect(counts.value.active).toBe(1)
  })

  it('returns zero counts on empty store', () => {
    const { todos, counts } = useTodos()
    todos.value = []

    expect(counts.value).toEqual({ all: 0, active: 0, completed: 0 })
  })
})

describe('useTodos — editingTodoId state machine', () => {
  beforeEach(() => {
    const { todos, editingTodoId } = useTodos()
    todos.value = []
    editingTodoId.value = null
  })

  it('startEditing sets editingTodoId to the given id', () => {
    const { editingTodoId, startEditing } = useTodos()
    startEditing('abc-123')
    expect(editingTodoId.value).toBe('abc-123')
  })

  it('cancelEditing clears editingTodoId', () => {
    const { editingTodoId, startEditing, cancelEditing } = useTodos()
    startEditing('abc-123')
    cancelEditing()
    expect(editingTodoId.value).toBeNull()
  })

  it('only one todo can be in edit mode at a time', () => {
    const { editingTodoId, startEditing } = useTodos()
    startEditing('first')
    startEditing('second')
    expect(editingTodoId.value).toBe('second')
  })
})

describe('useTodos — setFilter', () => {
  it('setFilter updates filterCriteria', () => {
    const { filterCriteria, setFilter } = useTodos()
    filterCriteria.value = 'all'

    setFilter('completed')
    expect(filterCriteria.value).toBe('completed')

    setFilter('active')
    expect(filterCriteria.value).toBe('active')
  })
})

describe('useTodos — notifications', () => {
  beforeEach(() => {
    const { notifications } = useTodos()
    notifications.value = []
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('pushNotification adds a notification', () => {
    const { notifications, pushNotification } = useTodos()
    pushNotification('Something went wrong', 'error')
    expect(notifications.value).toHaveLength(1)
    expect(notifications.value[0]!.message).toBe('Something went wrong')
    expect(notifications.value[0]!.level).toBe('error')
  })

  it('notifications auto-dismiss after 5 seconds', async () => {
    const { notifications, pushNotification } = useTodos()
    pushNotification('Auto-dismiss me')
    expect(notifications.value).toHaveLength(1)

    vi.advanceTimersByTime(5_000)
    await nextTick()

    expect(notifications.value).toHaveLength(0)
  })

  it('dismissNotification removes specific notification', () => {
    const { notifications, pushNotification, dismissNotification } = useTodos()
    pushNotification('First')
    pushNotification('Second')
    const firstId = notifications.value[0]!.id

    dismissNotification(firstId)

    expect(notifications.value).toHaveLength(1)
    expect(notifications.value[0]!.message).toBe('Second')
  })
})

describe('useTodos — optimistic delete rollback', () => {
  beforeEach(() => {
    const { todos, notifications } = useTodos()
    todos.value = []
    notifications.value = []
  })

  it('removes todo optimistically from todos[]', async () => {
    const { todos, deleteTodo } = useTodos()
    const todo = makeTodo({ id: 'target-id' })
    todos.value = [todo]

    // Mock $fetch to succeed
    vi.stubGlobal('$fetch', vi.fn().mockResolvedValue(undefined))

    await deleteTodo('target-id')

    expect(todos.value).toHaveLength(0)
    vi.unstubAllGlobals()
  })

  it('rolls back on API failure', async () => {
    const { todos, deleteTodo } = useTodos()
    const todo = makeTodo({ id: 'target-id' })
    todos.value = [todo]

    // Mock $fetch to fail
    vi.stubGlobal('$fetch', vi.fn().mockRejectedValue(new Error('Network error')))

    await deleteTodo('target-id')

    // Should be restored
    expect(todos.value).toHaveLength(1)
    expect(todos.value[0]!.id).toBe('target-id')
    vi.unstubAllGlobals()
  })
})

describe('useTodos — optimistic toggle rollback', () => {
  beforeEach(() => {
    const { todos, notifications } = useTodos()
    todos.value = []
    notifications.value = []
  })

  it('reverts to original status on API failure', async () => {
    const { todos, toggleTodo } = useTodos()
    const todo = makeTodo({ id: 'flip-id', status: 'active' })
    todos.value = [todo]

    vi.stubGlobal('$fetch', vi.fn().mockRejectedValue(new Error('500')))

    await toggleTodo(todo)

    // Should be rolled back to 'active'
    expect(todos.value[0]!.status).toBe('active')
    vi.unstubAllGlobals()
  })
})

describe('useTodos — clearCompleted', () => {
  beforeEach(() => {
    const { todos, notifications } = useTodos()
    todos.value = []
    notifications.value = []
  })

  it('removes all completed todos optimistically', async () => {
    const { todos, clearCompleted } = useTodos()
    todos.value = [
      makeTodo({ status: 'active' }),
      makeTodo({ status: 'completed' }),
      makeTodo({ status: 'completed' }),
    ]

    vi.stubGlobal('$fetch', vi.fn().mockResolvedValue({ deletedCount: 2 }))

    await clearCompleted()

    expect(todos.value).toHaveLength(1)
    expect(todos.value[0]!.status).toBe('active')
    vi.unstubAllGlobals()
  })

  it('rolls back completed todos on API failure', async () => {
    const { todos, clearCompleted } = useTodos()
    todos.value = [
      makeTodo({ status: 'active' }),
      makeTodo({ status: 'completed' }),
    ]

    vi.stubGlobal('$fetch', vi.fn().mockRejectedValue(new Error('500')))

    await clearCompleted()

    expect(todos.value).toHaveLength(2)
    vi.unstubAllGlobals()
  })
})
