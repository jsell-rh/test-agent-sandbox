/**
 * Core todos store — pure factory function with no Nuxt dependencies.
 *
 * This layer is intentionally framework-agnostic so that it can be unit-tested
 * without a Nuxt runtime. The Nuxt composable (composables/useTodos.ts) wraps
 * this factory and injects $fetch.
 *
 * Design decisions:
 * - All configurable values (API base path, error dismiss duration) are accepted
 *   as constructor options so they are never hardcoded.
 * - Optimistic updates for toggle and delete; rollback on API error.
 * - Last-write-wins for rapid duplicate toggles (Symbol-keyed request tracking).
 */

import { ref, computed } from 'vue'
import type {
  TodoResource,
  Counts,
  FilterCriteria,
  AppError,
  ListTodosResponse,
  DeleteCompletedResponse,
} from '../types/todo'

// ─── Configurable defaults ────────────────────────────────────────────────────

/** Default API base path.  Must match API_BASE_PATH in api/app.py. */
export const DEFAULT_API_BASE = '/api/todos'

/** Auto-dismiss duration for error banners (ms). */
export const DEFAULT_ERROR_DISMISS_MS = 5_000

// ─── Types ────────────────────────────────────────────────────────────────────

/**
 * Minimal fetch abstraction accepted by createTodosStore.
 * Matches the signature of ofetch/$fetch used by Nuxt.
 */
export interface FetchOptions {
  method?: string
  body?: unknown
  params?: Record<string, string>
}

export type StoreFetch = (url: string, options?: FetchOptions) => Promise<unknown>

export interface StoreOptions {
  fetch: StoreFetch
  apiBase?: string
  errorDismissMs?: number
}

// ─── Factory ─────────────────────────────────────────────────────────────────

export function createTodosStore(options: StoreOptions) {
  const { fetch, apiBase = DEFAULT_API_BASE, errorDismissMs = DEFAULT_ERROR_DISMISS_MS } =
    options

  // ── State ──────────────────────────────────────────────────────────────────

  const todos = ref<TodoResource[]>([])
  const filter = ref<FilterCriteria>('all')
  const editingTodoId = ref<string | null>(null)
  const counts = ref<Counts>({ all: 0, active: 0, completed: 0 })
  const errors = ref<AppError[]>([])

  /**
   * Tracks the latest toggle request key per todo ID.
   * Used for last-write-wins semantics when the user rapidly toggles a todo.
   */
  const pendingToggles = new Map<string, symbol>()

  // ── Derived state ──────────────────────────────────────────────────────────

  const filteredTodos = computed<TodoResource[]>(() => {
    if (filter.value === 'all') return todos.value
    return todos.value.filter((t) => t.status === filter.value)
  })

  // ── Internal helpers ───────────────────────────────────────────────────────

  function addError(message: string): void {
    const id = crypto.randomUUID()
    errors.value = [...errors.value, { id, message }]
    setTimeout(() => {
      errors.value = errors.value.filter((e) => e.id !== id)
    }, errorDismissMs)
  }

  /**
   * Adjust aggregate counts when a todo's status transitions from → to.
   * Only updates counts for active↔completed transitions; all is unchanged.
   */
  function shiftCounts(
    from: 'active' | 'completed',
    to: 'active' | 'completed',
  ): void {
    if (from === to) return
    if (from === 'active') {
      counts.value.active = Math.max(0, counts.value.active - 1)
      counts.value.completed += 1
    } else {
      counts.value.completed = Math.max(0, counts.value.completed - 1)
      counts.value.active += 1
    }
  }

  // ── Actions ────────────────────────────────────────────────────────────────

  /** Load all todos from the API on initial page load. */
  async function loadTodos(): Promise<void> {
    try {
      const data = (await fetch(apiBase)) as ListTodosResponse
      todos.value = data.todos
      counts.value = data.counts
    } catch {
      addError('Failed to load todos.')
    }
  }

  /**
   * Create a new todo via POST.
   * Returns true on success (so the input can be cleared), false on failure
   * (so the input value is preserved, per the spec's failure-mode requirement).
   */
  async function createTodo(title: string): Promise<boolean> {
    try {
      const todo = (await fetch(apiBase, {
        method: 'POST',
        body: { title },
      })) as TodoResource

      // Prepend so the list is newest-first (spec: order createdAt descending)
      todos.value = [todo, ...todos.value]
      counts.value.all += 1
      counts.value.active += 1
      return true
    } catch (err: unknown) {
      const apiErr = err as { data?: { message?: string }; message?: string }
      addError(apiErr?.data?.message ?? apiErr?.message ?? 'Failed to create todo.')
      return false
    }
  }

  /**
   * Toggle a todo's status (active ↔ completed).
   *
   * Applies an optimistic update immediately, then reconciles with the server
   * response.  If the server returns an error, the optimistic change is rolled
   * back.
   *
   * For rapid duplicate toggles, only the response to the *latest* request is
   * applied (last-write-wins).
   */
  async function toggleTodo(todoId: string): Promise<void> {
    const current = todos.value.find((t) => t.id === todoId)
    if (!current) return

    const previousStatus = current.status
    const newStatus: 'active' | 'completed' =
      previousStatus === 'active' ? 'completed' : 'active'

    const key = Symbol()
    pendingToggles.set(todoId, key)

    // Optimistic update
    todos.value = todos.value.map((t) =>
      t.id === todoId ? { ...t, status: newStatus } : t,
    )
    shiftCounts(previousStatus, newStatus)

    try {
      const updated = (await fetch(`${apiBase}/${todoId}`, {
        method: 'PATCH',
        body: { status: newStatus },
      })) as TodoResource

      // Only apply if this is still the latest toggle request for this todo
      if (pendingToggles.get(todoId) === key) {
        todos.value = todos.value.map((t) => (t.id === todoId ? updated : t))
        pendingToggles.delete(todoId)
      }
    } catch {
      if (pendingToggles.get(todoId) === key) {
        // Rollback
        todos.value = todos.value.map((t) =>
          t.id === todoId ? { ...t, status: previousStatus } : t,
        )
        shiftCounts(newStatus, previousStatus)
        addError('Failed to update todo status.')
        pendingToggles.delete(todoId)
      }
    }
  }

  /**
   * Update a todo's title via PATCH.
   * If the new title is blank, the todo is deleted instead (per spec: "Submitting
   * an empty string deletes the Todo").
   * Returns true on success, false on failure.
   */
  async function updateTitle(id: string, title: string): Promise<boolean> {
    if (!title.trim()) {
      return deleteTodo(id)
    }
    try {
      const updated = (await fetch(`${apiBase}/${id}`, {
        method: 'PATCH',
        body: { title },
      })) as TodoResource
      todos.value = todos.value.map((t) => (t.id === id ? updated : t))
      return true
    } catch (err: unknown) {
      const apiErr = err as { data?: { message?: string }; message?: string }
      addError(apiErr?.data?.message ?? 'Failed to update todo.')
      return false
    }
  }

  /**
   * Permanently delete a todo via DELETE.
   * Applies an optimistic removal; rollback on API error.
   * Returns true on success, false on failure.
   */
  async function deleteTodo(id: string): Promise<boolean> {
    const removed = todos.value.find((t) => t.id === id)
    if (!removed) return false

    // Optimistic removal
    todos.value = todos.value.filter((t) => t.id !== id)
    counts.value.all = Math.max(0, counts.value.all - 1)
    if (removed.status === 'active') {
      counts.value.active = Math.max(0, counts.value.active - 1)
    } else {
      counts.value.completed = Math.max(0, counts.value.completed - 1)
    }

    try {
      await fetch(`${apiBase}/${id}`, { method: 'DELETE' })
      return true
    } catch {
      // Rollback
      todos.value = [removed, ...todos.value]
      counts.value.all += 1
      if (removed.status === 'active') {
        counts.value.active += 1
      } else {
        counts.value.completed += 1
      }
      addError('Failed to delete todo.')
      return false
    }
  }

  /**
   * Bulk-delete all completed todos ("Clear completed" action).
   * Calls DELETE /api/todos?status=completed.
   */
  async function clearCompleted(): Promise<void> {
    try {
      const result = (await fetch(apiBase, {
        method: 'DELETE',
        params: { status: 'completed' },
      })) as DeleteCompletedResponse
      todos.value = todos.value.filter((t) => t.status !== 'completed')
      counts.value.all = Math.max(0, counts.value.all - result.deletedCount)
      counts.value.completed = 0
    } catch {
      addError('Failed to clear completed todos.')
    }
  }

  // ── UI state transitions ───────────────────────────────────────────────────

  function setFilter(f: FilterCriteria): void {
    filter.value = f
  }

  function startEditing(id: string): void {
    editingTodoId.value = id
  }

  function cancelEditing(): void {
    editingTodoId.value = null
  }

  function dismissError(id: string): void {
    errors.value = errors.value.filter((e) => e.id !== id)
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  return {
    // Reactive state
    todos,
    filter,
    editingTodoId,
    counts,
    errors,
    // Derived
    filteredTodos,
    // Actions
    loadTodos,
    createTodo,
    toggleTodo,
    updateTitle,
    deleteTodo,
    clearCompleted,
    setFilter,
    startEditing,
    cancelEditing,
    dismissError,
  }
}

export type TodosStore = ReturnType<typeof createTodosStore>
