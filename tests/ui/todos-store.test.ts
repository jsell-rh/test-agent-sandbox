/**
 * Unit tests for createTodosStore — the core state + action layer.
 *
 * These tests cover all 8 critical UI test cases from interface.spec.md as well
 * as the failure modes specified in the TDD plan.
 *
 * The store is tested via its factory function with a mocked fetcher, so no
 * Nuxt context is required.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createTodosStore, DEFAULT_API_BASE, DEFAULT_ERROR_DISMISS_MS } from '../../stores/todos'
import type { StoreFetch } from '../../stores/todos'
import type { TodoResource, Counts, ListTodosResponse } from '../../types/todo'

// ─── Test helpers ─────────────────────────────────────────────────────────────

function makeTodo(overrides: Partial<TodoResource> = {}): TodoResource {
  return {
    id: crypto.randomUUID(),
    title: 'Test todo',
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  }
}

function makeStore(fetch: StoreFetch, errorDismissMs = 999_999) {
  return createTodosStore({ fetch, apiBase: DEFAULT_API_BASE, errorDismissMs })
}

// ─── Test suite ───────────────────────────────────────────────────────────────

describe('createTodosStore', () => {
  // ── loadTodos ──────────────────────────────────────────────────────────────

  describe('loadTodos()', () => {
    it('populates todos and counts from API response', async () => {
      const todo = makeTodo()
      const response: ListTodosResponse = {
        todos: [todo],
        counts: { all: 1, active: 1, completed: 0 },
      }
      const fetch = vi.fn().mockResolvedValue(response)
      const store = makeStore(fetch)

      await store.loadTodos()

      expect(store.todos.value).toEqual([todo])
      expect(store.counts.value).toEqual({ all: 1, active: 1, completed: 0 })
    })

    it('adds an error banner when the API fails', async () => {
      const fetch = vi.fn().mockRejectedValue(new Error('network'))
      const store = makeStore(fetch)

      await store.loadTodos()

      expect(store.errors.value).toHaveLength(1)
      expect(store.errors.value[0].message).toMatch(/load/i)
    })
  })

  // ── createTodo ─────────────────────────────────────────────────────────────

  describe('createTodo()', () => {
    it('CRITICAL: prepends the new todo to the list (newest first)', async () => {
      const existing = makeTodo({ title: 'Existing' })
      const created = makeTodo({ title: 'New todo' })

      // Seed the store with one todo
      const fetch = vi.fn()
      const store = makeStore(fetch)
      store.todos.value = [existing]
      store.counts.value = { all: 1, active: 1, completed: 0 }

      fetch.mockResolvedValue(created)
      await store.createTodo('New todo')

      expect(store.todos.value[0].id).toBe(created.id)
      expect(store.todos.value[1].id).toBe(existing.id)
    })

    it('increments all and active counts on success', async () => {
      const fetch = vi.fn().mockResolvedValue(makeTodo())
      const store = makeStore(fetch)
      store.counts.value = { all: 2, active: 2, completed: 0 }

      await store.createTodo('New')

      expect(store.counts.value.all).toBe(3)
      expect(store.counts.value.active).toBe(3)
    })

    it('returns true on success', async () => {
      const fetch = vi.fn().mockResolvedValue(makeTodo())
      const store = makeStore(fetch)

      const result = await store.createTodo('Test')
      expect(result).toBe(true)
    })

    it('CRITICAL: returns false on API error (so input is not cleared)', async () => {
      const fetch = vi.fn().mockRejectedValue({ data: { message: 'Invalid' }, message: '' })
      const store = makeStore(fetch)

      const result = await store.createTodo('Test')

      expect(result).toBe(false)
      expect(store.todos.value).toHaveLength(0)
      expect(store.errors.value).toHaveLength(1)
    })
  })

  // ── toggleTodo ─────────────────────────────────────────────────────────────

  describe('toggleTodo()', () => {
    it('CRITICAL: updates active count after toggling active → completed', async () => {
      const todo = makeTodo({ status: 'active' })
      const updated = { ...todo, status: 'completed' as const }
      const fetch = vi.fn().mockResolvedValue(updated)
      const store = makeStore(fetch)
      store.todos.value = [todo]
      store.counts.value = { all: 1, active: 1, completed: 0 }

      await store.toggleTodo(todo.id)

      expect(store.counts.value.active).toBe(0)
      expect(store.counts.value.completed).toBe(1)
    })

    it('applies optimistic update before API resolves', async () => {
      const todo = makeTodo({ status: 'active' })
      let resolveToggle!: (v: TodoResource) => void
      const fetch = vi.fn().mockReturnValue(
        new Promise<TodoResource>((r) => {
          resolveToggle = r
        }),
      )
      const store = makeStore(fetch)
      store.todos.value = [todo]
      store.counts.value = { all: 1, active: 1, completed: 0 }

      const togglePromise = store.toggleTodo(todo.id)
      // Before the API responds, the optimistic state is already applied
      expect(store.todos.value[0].status).toBe('completed')

      resolveToggle({ ...todo, status: 'completed' })
      await togglePromise
    })

    it('CRITICAL: rolls back optimistic update when API returns 500', async () => {
      const todo = makeTodo({ status: 'active' })
      const fetch = vi.fn().mockRejectedValue(new Error('500'))
      const store = makeStore(fetch)
      store.todos.value = [todo]
      store.counts.value = { all: 1, active: 1, completed: 0 }

      await store.toggleTodo(todo.id)

      expect(store.todos.value[0].status).toBe('active')
      expect(store.counts.value.active).toBe(1)
      expect(store.counts.value.completed).toBe(0)
      expect(store.errors.value).toHaveLength(1)
    })

    it('last-write-wins for duplicate rapid toggles', async () => {
      const todo = makeTodo({ status: 'active' })
      const firstResult = { ...todo, status: 'completed' as const }
      const secondResult = { ...todo, status: 'active' as const }

      let resolveFirst!: (v: TodoResource) => void
      let resolveSecond!: (v: TodoResource) => void

      const fetch = vi.fn()
        .mockReturnValueOnce(new Promise<TodoResource>((r) => { resolveFirst = r }))
        .mockReturnValueOnce(new Promise<TodoResource>((r) => { resolveSecond = r }))

      const store = makeStore(fetch)
      store.todos.value = [todo]
      store.counts.value = { all: 1, active: 1, completed: 0 }

      const p1 = store.toggleTodo(todo.id)
      const p2 = store.toggleTodo(todo.id)

      // Resolve second first, then first — second should win
      resolveSecond(secondResult)
      await p2

      resolveFirst(firstResult)
      await p1

      // Final state should reflect the second response (last write wins)
      expect(store.todos.value[0].status).toBe('active')
    })
  })

  // ── updateTitle ────────────────────────────────────────────────────────────

  describe('updateTitle()', () => {
    it('updates the todo title on success', async () => {
      const todo = makeTodo({ title: 'Old title' })
      const updated = { ...todo, title: 'New title' }
      const fetch = vi.fn().mockResolvedValue(updated)
      const store = makeStore(fetch)
      store.todos.value = [todo]

      const result = await store.updateTitle(todo.id, 'New title')

      expect(result).toBe(true)
      expect(store.todos.value[0].title).toBe('New title')
    })

    it('CRITICAL: deletes the todo when title is blank', async () => {
      const todo = makeTodo()
      const fetch = vi.fn().mockResolvedValue(undefined)
      const store = makeStore(fetch)
      store.todos.value = [todo]
      store.counts.value = { all: 1, active: 1, completed: 0 }

      await store.updateTitle(todo.id, '')

      // Optimistic removal: todo is gone from the list
      expect(store.todos.value).toHaveLength(0)
    })

    it('CRITICAL: deletes the todo when title is whitespace-only', async () => {
      const todo = makeTodo()
      const fetch = vi.fn().mockResolvedValue(undefined)
      const store = makeStore(fetch)
      store.todos.value = [todo]
      store.counts.value = { all: 1, active: 1, completed: 0 }

      await store.updateTitle(todo.id, '   ')

      expect(store.todos.value).toHaveLength(0)
    })
  })

  // ── deleteTodo ─────────────────────────────────────────────────────────────

  describe('deleteTodo()', () => {
    it('removes the todo from the list optimistically', async () => {
      const todo = makeTodo()
      const fetch = vi.fn().mockResolvedValue(undefined)
      const store = makeStore(fetch)
      store.todos.value = [todo]
      store.counts.value = { all: 1, active: 1, completed: 0 }

      store.deleteTodo(todo.id)
      // Synchronously removed before the API call resolves
      expect(store.todos.value).toHaveLength(0)
    })

    it('rolls back deletion when API returns error', async () => {
      const todo = makeTodo()
      const fetch = vi.fn().mockRejectedValue(new Error('500'))
      const store = makeStore(fetch)
      store.todos.value = [todo]
      store.counts.value = { all: 1, active: 1, completed: 0 }

      await store.deleteTodo(todo.id)

      expect(store.todos.value).toHaveLength(1)
      expect(store.counts.value.all).toBe(1)
      expect(store.errors.value).toHaveLength(1)
    })
  })

  // ── clearCompleted ─────────────────────────────────────────────────────────

  describe('clearCompleted()', () => {
    it('removes completed todos from the list', async () => {
      const active = makeTodo({ status: 'active' })
      const completed = makeTodo({ status: 'completed' })
      const fetch = vi.fn().mockResolvedValue({ deletedCount: 1 })
      const store = makeStore(fetch)
      store.todos.value = [active, completed]
      store.counts.value = { all: 2, active: 1, completed: 1 }

      await store.clearCompleted()

      expect(store.todos.value).toHaveLength(1)
      expect(store.todos.value[0].id).toBe(active.id)
      expect(store.counts.value.completed).toBe(0)
      expect(store.counts.value.all).toBe(1)
    })
  })

  // ── filter / filteredTodos ──────────────────────────────────────────────────

  describe('setFilter() / filteredTodos', () => {
    it('CRITICAL: filter tabs show/hide items without additional network request', () => {
      const active = makeTodo({ status: 'active' })
      const completed = makeTodo({ status: 'completed' })
      const fetch = vi.fn()
      const store = makeStore(fetch)
      store.todos.value = [active, completed]

      // Switch to "active" filter — no API call should be made
      store.setFilter('active')
      expect(store.filteredTodos.value).toEqual([active])
      expect(fetch).not.toHaveBeenCalled()

      // Switch to "completed" filter — still no API call
      store.setFilter('completed')
      expect(store.filteredTodos.value).toEqual([completed])
      expect(fetch).not.toHaveBeenCalled()

      // "all" shows everything
      store.setFilter('all')
      expect(store.filteredTodos.value).toHaveLength(2)
      expect(fetch).not.toHaveBeenCalled()
    })
  })

  // ── editing state ──────────────────────────────────────────────────────────

  describe('startEditing() / cancelEditing()', () => {
    it('CRITICAL: double-click enters edit mode for that item only', () => {
      const t1 = makeTodo()
      const t2 = makeTodo()
      const store = makeStore(vi.fn())
      store.todos.value = [t1, t2]

      store.startEditing(t1.id)

      expect(store.editingTodoId.value).toBe(t1.id)
      // t2 is not in edit mode
    })

    it('CRITICAL: Escape in edit mode cancels without saving', () => {
      const todo = makeTodo({ title: 'Original title' })
      const fetch = vi.fn()
      const store = makeStore(fetch)
      store.todos.value = [todo]

      store.startEditing(todo.id)
      // User edits in UI (simulated by just calling cancelEditing)
      store.cancelEditing()

      expect(store.editingTodoId.value).toBeNull()
      expect(fetch).not.toHaveBeenCalled()
      expect(store.todos.value[0].title).toBe('Original title')
    })
  })

  // ── counts ────────────────────────────────────────────────────────────────

  describe('CRITICAL: "{N} items left" reflects active count', () => {
    it('count updates correctly after toggle from active to completed', async () => {
      const todo = makeTodo({ status: 'active' })
      const updated = { ...todo, status: 'completed' as const }
      const fetch = vi.fn().mockResolvedValue(updated)
      const store = makeStore(fetch)
      store.todos.value = [todo]
      store.counts.value = { all: 1, active: 1, completed: 0 }

      await store.toggleTodo(todo.id)

      expect(store.counts.value.active).toBe(0)
    })

    it('count updates correctly after toggle from completed to active', async () => {
      const todo = makeTodo({ status: 'completed' })
      const updated = { ...todo, status: 'active' as const }
      const fetch = vi.fn().mockResolvedValue(updated)
      const store = makeStore(fetch)
      store.todos.value = [todo]
      store.counts.value = { all: 1, active: 0, completed: 1 }

      await store.toggleTodo(todo.id)

      expect(store.counts.value.active).toBe(1)
    })
  })

  // ── error dismissal ────────────────────────────────────────────────────────

  describe('dismissError()', () => {
    it('removes a specific error banner by id', async () => {
      const fetch = vi.fn().mockRejectedValue(new Error('oops'))
      const store = makeStore(fetch)

      await store.loadTodos()
      expect(store.errors.value).toHaveLength(1)

      const errId = store.errors.value[0].id
      store.dismissError(errId)

      expect(store.errors.value).toHaveLength(0)
    })
  })

  // ── clear completed visibility ─────────────────────────────────────────────

  describe('CRITICAL: "Clear completed" visibility', () => {
    it('completed count is 0 when all todos are active', async () => {
      const fetch = vi.fn().mockResolvedValue({
        todos: [makeTodo({ status: 'active' })],
        counts: { all: 1, active: 1, completed: 0 },
      })
      const store = makeStore(fetch)
      await store.loadTodos()
      expect(store.counts.value.completed).toBe(0)
    })

    it('completed count > 0 when a todo is completed', async () => {
      const fetch = vi.fn().mockResolvedValue({
        todos: [makeTodo({ status: 'completed' })],
        counts: { all: 1, active: 0, completed: 1 },
      })
      const store = makeStore(fetch)
      await store.loadTodos()
      expect(store.counts.value.completed).toBe(1)
    })
  })
})
