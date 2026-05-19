/**
 * useTodos — central state machine for the Todo UI.
 *
 * Owns:
 *   todos[]         — source of truth (mirrored from API on load)
 *   filterCriteria  — all | active | completed  (default: all)
 *   editingTodoId   — TodoId | null             (default: null)
 *   errors[]        — auto-dismissing error messages (5 s TTL)
 *
 * All API calls are made here; components receive reactive state and call
 * action functions.  Optimistic updates are applied before the network
 * request and rolled back on failure.
 */

import type { Ref } from 'vue'

// ── Types ────────────────────────────────────────────────────────────────────

export interface Todo {
  id: string
  title: string
  status: 'active' | 'completed'
  createdAt: string
  updatedAt: string
}

export type FilterCriteria = 'all' | 'active' | 'completed'

export interface ErrorMessage {
  id: string
  message: string
}

export interface TodoCounts {
  all: number
  active: number
  completed: number
}

// ── Constants ────────────────────────────────────────────────────────────────

/** Auto-dismiss timeout for error messages (milliseconds). */
const ERROR_DISMISS_MS = 5_000

/** Valid filter values; mirrors the domain FilterCriteria enum. */
export const FILTER_VALUES: FilterCriteria[] = ['all', 'active', 'completed']

// ── Composable ───────────────────────────────────────────────────────────────

export function useTodos() {
  // ── State ──────────────────────────────────────────────────────────────────
  const todos = ref<Todo[]>([])
  const filterCriteria = ref<FilterCriteria>('all')
  const editingTodoId = ref<string | null>(null)
  const errors = ref<ErrorMessage[]>([])

  // ── Derived ────────────────────────────────────────────────────────────────

  /** Todos visible under the active filter (client-side — no network call). */
  const filteredTodos = computed<Todo[]>(() => {
    if (filterCriteria.value === 'all') return todos.value
    return todos.value.filter((t) => t.status === filterCriteria.value)
  })

  /** Counts computed over ALL todos, regardless of active filter. */
  const counts = computed<TodoCounts>(() => ({
    all: todos.value.length,
    active: todos.value.filter((t) => t.status === 'active').length,
    completed: todos.value.filter((t) => t.status === 'completed').length,
  }))

  // ── Error helpers ──────────────────────────────────────────────────────────

  function addError(message: string): void {
    const id = crypto.randomUUID()
    errors.value.push({ id, message })
    setTimeout(() => {
      errors.value = errors.value.filter((e) => e.id !== id)
    }, ERROR_DISMISS_MS)
  }

  function dismissError(id: string): void {
    errors.value = errors.value.filter((e) => e.id !== id)
  }

  // ── API helpers ────────────────────────────────────────────────────────────

  /** Extract a human-readable message from a $fetch error. */
  function extractErrorMessage(err: unknown, fallback: string): string {
    if (err && typeof err === 'object' && 'data' in err) {
      const data = (err as { data?: { message?: string } }).data
      if (data?.message) return data.message
    }
    return fallback
  }

  // ── Actions ────────────────────────────────────────────────────────────────

  /** Load all todos from the API — called once on page mount. */
  async function loadTodos(): Promise<void> {
    try {
      const data = await $fetch<{ todos: Todo[]; counts: TodoCounts }>('/api/todos')
      todos.value = data.todos
    } catch (err) {
      addError(extractErrorMessage(err, 'Failed to load todos. Please refresh.'))
    }
  }

  /**
   * Create a new todo with the given title.
   * On success, prepends the new todo to todos[] and clears the input.
   * On failure, leaves the input unchanged and displays an error.
   *
   * @returns true if created successfully, false otherwise.
   */
  async function createTodo(title: string): Promise<boolean> {
    const trimmed = title.trim()
    if (!trimmed) return false

    try {
      const todo = await $fetch<Todo>('/api/todos', {
        method: 'POST',
        body: { title: trimmed },
      })
      todos.value.unshift(todo) // prepend — newest first
      return true
    } catch (err) {
      addError(extractErrorMessage(err, 'Failed to create todo.'))
      return false
    }
  }

  /**
   * Toggle a todo's status between active ↔ completed.
   * Applies an optimistic update; rolls back on API failure.
   */
  async function toggleTodo(todoId: string): Promise<void> {
    const idx = todos.value.findIndex((t) => t.id === todoId)
    if (idx === -1) return

    const original = todos.value[idx]
    const newStatus: 'active' | 'completed' =
      original.status === 'active' ? 'completed' : 'active'

    // Optimistic update
    todos.value[idx] = { ...original, status: newStatus }

    try {
      const updated = await $fetch<Todo>(`/api/todos/${todoId}`, {
        method: 'PATCH',
        body: { status: newStatus },
      })
      todos.value[idx] = updated
    } catch (err) {
      // Rollback
      todos.value[idx] = original
      addError(extractErrorMessage(err, 'Failed to update todo.'))
    }
  }

  /**
   * Permanently delete a todo by id.
   * Applies an optimistic removal; restores on failure.
   */
  async function deleteTodo(todoId: string): Promise<void> {
    const idx = todos.value.findIndex((t) => t.id === todoId)
    if (idx === -1) return

    const original = todos.value[idx]

    // Optimistic removal
    todos.value.splice(idx, 1)

    try {
      await $fetch(`/api/todos/${todoId}`, { method: 'DELETE' })
    } catch (err) {
      // Rollback — restore at the same position
      todos.value.splice(idx, 0, original)
      addError(extractErrorMessage(err, 'Failed to delete todo.'))
    }
  }

  /**
   * Update a todo's title.
   * If newTitle is blank, deletes the todo instead (per spec).
   * Clears editingTodoId on success.
   */
  async function submitEdit(todoId: string, newTitle: string): Promise<void> {
    const trimmed = newTitle.trim()

    if (!trimmed) {
      // Submitting blank title → delete (spec behaviour)
      await deleteTodo(todoId)
      editingTodoId.value = null
      return
    }

    try {
      const updated = await $fetch<Todo>(`/api/todos/${todoId}`, {
        method: 'PATCH',
        body: { title: trimmed },
      })
      const idx = todos.value.findIndex((t) => t.id === todoId)
      if (idx !== -1) todos.value[idx] = updated
      editingTodoId.value = null
    } catch (err) {
      addError(extractErrorMessage(err, 'Failed to update todo.'))
    }
  }

  /** Cancel editing without saving. */
  function cancelEdit(): void {
    editingTodoId.value = null
  }

  /** Enter edit mode for a todo. */
  function startEdit(todoId: string): void {
    editingTodoId.value = todoId
  }

  /**
   * Bulk-delete all completed todos ("Clear completed").
   * Updates todos[] client-side on success.
   */
  async function clearCompleted(): Promise<void> {
    try {
      await $fetch('/api/todos', {
        method: 'DELETE',
        query: { status: 'completed' },
      })
      todos.value = todos.value.filter((t) => t.status !== 'completed')
    } catch (err) {
      addError(extractErrorMessage(err, 'Failed to clear completed todos.'))
    }
  }

  /** Change the active filter criterion (client-side, no network call). */
  function setFilter(criteria: FilterCriteria): void {
    filterCriteria.value = criteria
  }

  // ── Exposed API ────────────────────────────────────────────────────────────

  return {
    // State
    todos,
    filterCriteria,
    editingTodoId,
    errors,
    // Derived
    filteredTodos,
    counts,
    // Actions
    loadTodos,
    createTodo,
    toggleTodo,
    deleteTodo,
    submitEdit,
    cancelEdit,
    startEdit,
    clearCompleted,
    setFilter,
    dismissError,
  }
}
