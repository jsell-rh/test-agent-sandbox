/**
 * useTodos — UI state machine for the Todo application.
 *
 * Implements the state machine defined in specs/interface.spec.md:
 *   FilterCriteria: all | active | completed   (default: all)
 *   editingTodoId:  TodoId | null              (default: null)
 *   todos:          Todo[]                     (source of truth from API)
 *
 * Optimistic updates: toggle and delete update local state immediately,
 * then roll back on API failure. All other mutations update after API confirmation.
 *
 * Error notifications: API errors are added as non-blocking inline messages
 * and auto-dismissed after ERROR_AUTO_DISMISS_MS milliseconds.
 *
 * The `api` parameter is the TodosApiClient interface — inject a fake in tests.
 */

import { ref, computed, readonly } from 'vue'
import type { Ref, ComputedRef } from 'vue'
import type { TodoResource, FilterCriteria } from '~/types/todo'
import { DEFAULT_FILTER, ERROR_AUTO_DISMISS_MS } from '~/types/todo'
import type { TodosApiClient } from '~/composables/useTodosApi'

/** A non-blocking error notification shown in the UI. */
export interface ErrorNotification {
  id: string
  message: string
}

export interface UseTodosState {
  /** All todos loaded from the API (source of truth). */
  todos: Ref<readonly TodoResource[]>
  /** Currently active filter tab. */
  filterCriteria: Ref<FilterCriteria>
  /** ID of the todo currently in edit mode, or null. */
  editingTodoId: Ref<string | null>
  /** Active error notifications. */
  errors: Ref<readonly ErrorNotification[]>
  /** Todos filtered by filterCriteria (no additional network requests). */
  filteredTodos: ComputedRef<TodoResource[]>
  /** Count of active todos. */
  activeCount: ComputedRef<number>
  /** Count of completed todos. */
  completedCount: ComputedRef<number>
  /** Total count of all todos. */
  totalCount: ComputedRef<number>
}

export interface UseTodosActions {
  /** Load all todos from the API into local state. */
  loadTodos(): Promise<void>
  /**
   * Create a new todo via POST /api/todos.
   * Returns true on success (so callers can clear their input), false on failure.
   */
  createTodo(title: string): Promise<boolean>
  /**
   * Toggle a todo's status (active ↔ completed) via PATCH /api/todos/:id.
   * Applies an optimistic update immediately; rolls back on API failure.
   */
  toggleTodo(id: string): Promise<void>
  /** Update a todo's title via PATCH /api/todos/:id. Clears editingTodoId on success. */
  updateTodoTitle(id: string, newTitle: string): Promise<void>
  /**
   * Delete a todo via DELETE /api/todos/:id.
   * Applies an optimistic removal; rolls back on API failure.
   */
  deleteTodo(id: string): Promise<void>
  /**
   * Bulk-delete all completed todos via DELETE /api/todos?status=completed.
   * Applies an optimistic removal; rolls back on API failure.
   */
  clearCompleted(): Promise<void>
  /** Change the active filter tab. */
  setFilter(filter: FilterCriteria): void
  /** Enter edit mode for a specific todo. */
  startEditing(id: string): void
  /** Exit edit mode without saving. */
  stopEditing(): void
  /** Manually dismiss an error notification by its id. */
  dismissError(id: string): void
}

export type UseTodosReturn = UseTodosState & UseTodosActions

/**
 * Compose the Todo UI state machine.
 *
 * @param api Injectable API client. Use `createTodosApiClient()` in the app;
 *   inject a `FakeTodosApi` in tests.
 */
export function useTodos(api: TodosApiClient): UseTodosReturn {
  // ---------------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------------

  const todos = ref<TodoResource[]>([])
  const filterCriteria = ref<FilterCriteria>(DEFAULT_FILTER)
  const editingTodoId = ref<string | null>(null)
  const errors = ref<ErrorNotification[]>([])

  // ---------------------------------------------------------------------------
  // Computed
  // ---------------------------------------------------------------------------

  const filteredTodos = computed<TodoResource[]>(() => {
    if (filterCriteria.value === 'all') return todos.value as TodoResource[]
    return (todos.value as TodoResource[]).filter(t => t.status === filterCriteria.value)
  })

  const activeCount = computed(() =>
    (todos.value as TodoResource[]).filter(t => t.status === 'active').length,
  )

  const completedCount = computed(() =>
    (todos.value as TodoResource[]).filter(t => t.status === 'completed').length,
  )

  const totalCount = computed(() => (todos.value as TodoResource[]).length)

  // ---------------------------------------------------------------------------
  // Error management
  // ---------------------------------------------------------------------------

  function addError(message: string): void {
    const id = `err-${Date.now()}-${Math.random().toString(36).slice(2)}`
    errors.value = [...errors.value, { id, message }]
    setTimeout(() => dismissError(id), ERROR_AUTO_DISMISS_MS)
  }

  function dismissError(id: string): void {
    errors.value = (errors.value as ErrorNotification[]).filter(e => e.id !== id)
  }

  // ---------------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------------

  async function loadTodos(): Promise<void> {
    try {
      const data = await api.listTodos()
      todos.value = data.todos
    }
    catch {
      addError('Failed to load todos. Please refresh the page.')
    }
  }

  async function createTodo(title: string): Promise<boolean> {
    try {
      const newTodo = await api.createTodo(title)
      todos.value = [newTodo, ...(todos.value as TodoResource[])]
      return true
    }
    catch (err) {
      addError(extractApiErrorMessage(err, 'Failed to create todo.'))
      return false
    }
  }

  async function toggleTodo(id: string): Promise<void> {
    // Optimistic update: flip status immediately
    const original = (todos.value as TodoResource[]).find(t => t.id === id)
    if (!original) return

    const optimisticStatus = original.status === 'active' ? 'completed' : 'active'
    todos.value = (todos.value as TodoResource[]).map(t =>
      t.id === id ? { ...t, status: optimisticStatus } : t,
    )

    try {
      const updated = await api.patchTodo(id, { status: optimisticStatus })
      todos.value = (todos.value as TodoResource[]).map(t => t.id === id ? updated : t)
    }
    catch {
      // Rollback on failure
      todos.value = (todos.value as TodoResource[]).map(t =>
        t.id === id ? original : t,
      )
      addError('Failed to update todo. Your change was not saved.')
    }
  }

  async function updateTodoTitle(id: string, newTitle: string): Promise<void> {
    try {
      const updated = await api.patchTodo(id, { title: newTitle })
      todos.value = (todos.value as TodoResource[]).map(t => t.id === id ? updated : t)
      editingTodoId.value = null
    }
    catch (err) {
      addError(extractApiErrorMessage(err, 'Failed to update title.'))
    }
  }

  async function deleteTodo(id: string): Promise<void> {
    // Optimistic removal
    const previous = [...(todos.value as TodoResource[])]
    todos.value = (todos.value as TodoResource[]).filter(t => t.id !== id)
    editingTodoId.value = null

    try {
      await api.deleteTodo(id)
    }
    catch {
      // Rollback on failure
      todos.value = previous
      addError('Failed to delete todo.')
    }
  }

  async function clearCompleted(): Promise<void> {
    // Optimistic removal of all completed todos
    const completedIds = new Set(
      (todos.value as TodoResource[])
        .filter(t => t.status === 'completed')
        .map(t => t.id),
    )
    const previous = [...(todos.value as TodoResource[])]
    todos.value = (todos.value as TodoResource[]).filter(t => !completedIds.has(t.id))

    try {
      await api.clearCompleted()
    }
    catch {
      // Rollback on failure
      todos.value = previous
      addError('Failed to clear completed todos.')
    }
  }

  function setFilter(filter: FilterCriteria): void {
    filterCriteria.value = filter
  }

  function startEditing(id: string): void {
    editingTodoId.value = id
  }

  function stopEditing(): void {
    editingTodoId.value = null
  }

  // ---------------------------------------------------------------------------
  // Return
  // ---------------------------------------------------------------------------

  return {
    todos: readonly(todos) as Ref<readonly TodoResource[]>,
    filterCriteria,
    editingTodoId,
    errors: readonly(errors) as Ref<readonly ErrorNotification[]>,
    filteredTodos,
    activeCount,
    completedCount,
    totalCount,
    loadTodos,
    createTodo,
    toggleTodo,
    updateTodoTitle,
    deleteTodo,
    clearCompleted,
    setFilter,
    startEditing,
    stopEditing,
    dismissError,
  }
}

// ---------------------------------------------------------------------------
// Private helpers
// ---------------------------------------------------------------------------

/**
 * Extract a human-readable message from an API error response.
 * Falls back to `defaultMessage` if no message can be extracted.
 */
function extractApiErrorMessage(err: unknown, defaultMessage: string): string {
  if (err && typeof err === 'object') {
    const data = (err as { data?: { message?: string } }).data
    if (data?.message) return data.message
    const message = (err as { message?: string }).message
    if (message) return message
  }
  return defaultMessage
}
