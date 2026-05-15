/**
 * useTodos — canonical UI State Machine (specs/interface.spec.md)
 *
 * State:
 *   todos[]        — source of truth from API; ordered createdAt DESC
 *   filter         — FilterCriteria (default: 'all'); applied client-side
 *   editingTodoId  — id of the todo currently being edited, or null
 *
 * The full todo list is loaded once on mount; all filtering is client-side
 * so filter tab changes require no additional network requests.
 *
 * Actions:
 *   loadTodos()          — fetch all todos from API on mount
 *   toggleTodo(id)       — optimistic status flip; rollback on API error
 *   deleteTodo(id)       — optimistic removal; rollback on API error
 *   updateTodoTitle(id)  — patch title; clears editingTodoId on success
 *   startEditing(id)     — set editingTodoId
 *   cancelEditing()      — clear editingTodoId
 */

import { ref, computed } from 'vue'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Wire representation of a Todo resource as returned by GET /api/todos. */
export interface TodoResource {
  id: string
  title: string
  status: 'active' | 'completed'
  createdAt: string
  updatedAt: string
}

/** Client-side filter — mirrors the server-side FilterCriteria enum. */
export type FilterCriteria = 'all' | 'active' | 'completed'

/** Shape of the GET /api/todos response body. */
export interface TodoListResponse {
  todos: TodoResource[]
  counts: {
    all: number
    active: number
    completed: number
  }
}

/** Options for a mutation request. */
export interface FetchOptions {
  method?: 'GET' | 'PATCH' | 'DELETE' | 'POST'
  body?: Record<string, unknown>
}

/**
 * Generic API fetch function injected into the composable.
 *
 * Defaults to the global $fetch (Nuxt). Tests inject a fake to avoid
 * network calls without touching global state.
 */
export type ApiFetchFn = <T = unknown>(url: string, options?: FetchOptions) => Promise<T>

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const FILTER_ALL: FilterCriteria = 'all'
export const FILTER_ACTIVE: FilterCriteria = 'active'
export const FILTER_COMPLETED: FilterCriteria = 'completed'

/**
 * The resource path for the todos collection API endpoint.
 *
 * Constructed from the Nuxt public runtime config `apiBase` (default: `/api`)
 * plus `/todos`. Exported so tests can reference it without hardcoding the literal.
 */
export const API_TODOS_PATH = '/api/todos'

/**
 * Return the resource path for a single Todo.
 *
 * @param id - TodoId (UUID v4)
 */
export function apiTodoPath(id: string): string {
  return `${API_TODOS_PATH}/${id}`
}

// ---------------------------------------------------------------------------
// Composable
// ---------------------------------------------------------------------------

/**
 * Returns the three state variables and derived state from the UI State Machine,
 * plus action functions for all user interactions.
 *
 * @param apiFetch - optional fetch override; defaults to the global $fetch (Nuxt).
 *   Accepts a replacement so that unit tests can inject a fake without
 *   touching global state.
 */
export function useTodos(
  apiFetch: ApiFetchFn = <T>(url: string, options?: FetchOptions) =>
    // eslint-disable-next-line no-undef
    ($fetch as (url: string, options?: FetchOptions) => Promise<T>)(url, options),
) {
  // ---------------------------------------------------
  // State machine (spec: UI State Machine)
  // ---------------------------------------------------

  /** Source of truth — full list from API, newest first. */
  const todos = ref<TodoResource[]>([])

  /** Active filter criterion; changes are applied client-side. */
  const filter = ref<FilterCriteria>(FILTER_ALL)

  /** Id of the todo whose title is currently being edited; null otherwise. */
  const editingTodoId = ref<string | null>(null)

  // ---------------------------------------------------
  // Derived state
  // ---------------------------------------------------

  /**
   * Filtered view of todos[].
   *
   * Computed so it updates reactively when todos or filter changes.
   * Filter tabs "show/hide items without an additional network request" (spec).
   */
  const filteredTodos = computed<TodoResource[]>(() => {
    const f = filter.value
    if (f === FILTER_ALL) return todos.value
    return todos.value.filter(t => t.status === f)
  })

  /**
   * Counts for all filter tabs, always computed over the full todos[].
   *
   * Mirrors the server-side counts shape so the UI can display all tab
   * counts without extra API calls.
   */
  const counts = computed(() => {
    const all = todos.value.length
    const active = todos.value.filter(t => t.status === FILTER_ACTIVE).length
    const completed = todos.value.filter(t => t.status === FILTER_COMPLETED).length
    return { all, active, completed }
  })

  // ---------------------------------------------------
  // Actions
  // ---------------------------------------------------

  /**
   * Fetch the full todo list from the API.
   *
   * Called on page mount. The API returns todos ordered createdAt DESC;
   * that ordering is preserved as-is.
   */
  async function loadTodos(): Promise<void> {
    const data = await apiFetch<TodoListResponse>(API_TODOS_PATH)
    todos.value = data.todos
  }

  /**
   * Toggle a Todo's status between active and completed.
   *
   * Optimistic update: the status is flipped immediately before the API
   * responds. On error, the previous status is restored and the error
   * propagates to the caller for display.
   *
   * Non-functional requirement: "Optimistic UI updates for toggle; rollback on API error"
   */
  async function toggleTodo(id: string): Promise<void> {
    const idx = todos.value.findIndex(t => t.id === id)
    if (idx === -1) return

    const todo = todos.value[idx]!
    const previousStatus = todo.status
    const nextStatus: TodoResource['status'] = previousStatus === FILTER_ACTIVE ? FILTER_COMPLETED : FILTER_ACTIVE

    // Optimistic update — flip immediately
    todos.value[idx] = { ...todo, status: nextStatus }

    try {
      const updated = await apiFetch<TodoResource>(apiTodoPath(id), {
        method: 'PATCH',
        body: { status: nextStatus },
      })
      todos.value[idx] = updated
    }
    catch (err) {
      // Rollback to previous state
      todos.value[idx] = { ...todo, status: previousStatus }
      throw err
    }
  }

  /**
   * Permanently remove a Todo.
   *
   * Optimistic update: the item is removed from todos[] before the API
   * responds. On error, the full list is restored and the error propagates.
   *
   * Non-functional requirement: "Optimistic UI updates for delete; rollback on API error"
   */
  async function deleteTodo(id: string): Promise<void> {
    const previousTodos = [...todos.value]

    // Optimistic: remove immediately
    todos.value = todos.value.filter(t => t.id !== id)

    try {
      await apiFetch(apiTodoPath(id), { method: 'DELETE' })
      // Clear editing state if the deleted todo was being edited
      if (editingTodoId.value === id) {
        editingTodoId.value = null
      }
    }
    catch (err) {
      // Rollback
      todos.value = previousTodos
      throw err
    }
  }

  /**
   * Update a Todo's title.
   *
   * On success, the todo is updated in todos[] and editingTodoId is cleared.
   * On error, the error propagates to the caller (no optimistic update —
   * the title change is only applied once the server confirms it).
   */
  async function updateTodoTitle(id: string, newTitle: string): Promise<void> {
    const updated = await apiFetch<TodoResource>(apiTodoPath(id), {
      method: 'PATCH',
      body: { title: newTitle },
    })

    const idx = todos.value.findIndex(t => t.id === id)
    if (idx !== -1) {
      todos.value[idx] = updated
    }
    editingTodoId.value = null
  }

  /**
   * Enter edit mode for a specific Todo.
   *
   * Only one todo can be edited at a time — calling this while another
   * todo is being edited replaces the editingTodoId.
   */
  function startEditing(id: string): void {
    editingTodoId.value = id
  }

  /**
   * Cancel edit mode without saving.
   *
   * Spec: "User presses Escape in edit field → clear editingTodoId (no API call)"
   */
  function cancelEditing(): void {
    editingTodoId.value = null
  }

  return {
    // State
    todos,
    filter,
    editingTodoId,
    // Derived
    filteredTodos,
    counts,
    // Actions
    loadTodos,
    toggleTodo,
    deleteTodo,
    updateTodoTitle,
    startEditing,
    cancelEditing,
  }
}
