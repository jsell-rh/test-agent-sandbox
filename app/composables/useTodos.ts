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

/** Shape of the POST /api/todos request body. */
export interface CreateTodoRequest {
  title: string
}

/**
 * Injection-point type for POST /api/todos.
 *
 * Accepts the endpoint URL and the request body; returns the created TodoResource.
 * Exported so tests can type their fake without casting.
 */
export type CreateFn = (url: string, body: CreateTodoRequest) => Promise<TodoResource>

/** Shape of the DELETE /api/todos?status=completed response body. */
export interface ClearCompletedResponse {
  deletedCount: number
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const FILTER_ALL: FilterCriteria = 'all'
export const FILTER_ACTIVE: FilterCriteria = 'active'
export const FILTER_COMPLETED: FilterCriteria = 'completed'

/**
 * The resource path for the todos API endpoint.
 *
 * Constructed as `${runtimeConfig.public.apiBase}/todos` where
 * `apiBase` defaults to `/api` (see nuxt.config.ts).  If `apiBase`
 * ever changes, this constant must be updated to match.
 *
 * Exported so tests can reference it without hardcoding the literal.
 */
export const API_TODOS_PATH = '/api/todos'

/**
 * The path for the bulk-delete completed todos endpoint.
 *
 * Used by `clearCompleted()` — exported so tests can reference it
 * without hardcoding the literal (configuration hardcoding rule).
 */
export const API_TODOS_COMPLETED_PATH = '/api/todos?status=completed'

// ---------------------------------------------------------------------------
// Composable
// ---------------------------------------------------------------------------

/**
 * Returns the three state variables and derived state from the UI State Machine,
 * plus action functions that must be wired to user interactions.
 *
 * @param fetchFn  - optional fetch override for GET /api/todos; defaults to $fetch.
 * @param createFn - optional create override for POST /api/todos; defaults to $fetch.
 * @param deleteFn - optional DELETE override for `clearCompleted()`; defaults to $fetch.
 *   All parameters exist so unit tests can inject fakes without touching Nuxt globals.
 */
export function useTodos(
  fetchFn: (url: string) => Promise<TodoListResponse> = (url) =>
    // eslint-disable-next-line no-undef
    ($fetch as (url: string) => Promise<TodoListResponse>)(url),
  createFn: CreateFn = (url, body) =>
    // eslint-disable-next-line no-undef
    ($fetch as unknown as CreateFn)(url, { method: 'POST', body } as never),
  deleteFn: (url: string) => Promise<ClearCompletedResponse> = (url) =>
    // eslint-disable-next-line no-undef
    ($fetch as (url: string, opts: { method: string }) => Promise<ClearCompletedResponse>)(url, {
      method: 'DELETE',
    }),
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
    const data = await fetchFn(API_TODOS_PATH)
    todos.value = data.todos
  }

  /**
   * Create a new Todo via POST /api/todos and prepend it to todos[].
   *
   * Spec (UI State Machine):
   *   POST /api/todos -> on success: prepend to todos[], clear input
   *
   * Throws on API error so the caller (NewTodoInput) can rollback UI state
   * (leave input unchanged) and surface the error to the user.
   *
   * @param title - The raw title string from the input field.
   */
  async function createTodo(title: string): Promise<void> {
    const newTodo = await createFn(API_TODOS_PATH, { title })
    todos.value = [newTodo, ...todos.value]
  }

  /**
   * Bulk-delete all completed todos via DELETE /api/todos?status=completed.
   *
   * On success, removes all completed items from todos[] client-side so the UI
   * reflects the change immediately without a subsequent loadTodos() call.
   *
   * On failure, the local todos[] is left unchanged (the server call either
   * never reached the server or did not modify data), and the error is
   * re-thrown so the caller can surface it to the user.
   *
   * @returns the `deletedCount` reported by the API.
   * @throws re-throws any network or server error from the DELETE call.
   */
  async function clearCompleted(): Promise<number> {
    const result = await deleteFn(API_TODOS_COMPLETED_PATH)
    // Only mutate local state after a confirmed server success.
    todos.value = todos.value.filter(t => t.status !== FILTER_COMPLETED)
    return result.deletedCount
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
    createTodo,
    clearCompleted,
  }
}
