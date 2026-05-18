/**
 * useTodos — UI state machine for the Todo application.
 *
 * Implements the state transitions defined in interface.spec.md §UI State Machine.
 * All API communication is centralised here; components call actions and observe
 * reactive state.
 *
 * Explicit Vue imports are used so the module is testable outside the Nuxt
 * auto-import context (e.g. Vitest without the Nuxt plugin).
 */
import { ref, computed, readonly } from 'vue'
import type {
  Todo,
  FilterCriteria,
  TodoStatus,
  TodoListResponse,
  CreateTodoPayload,
  UpdateTodoPayload,
  DeleteCompletedResponse,
} from '~/types/todo'

const API_BASE = '/api/todos' as const

// ── Singleton state shared across the app ─────────────────────────────────

/** Source-of-truth todo list (all todos, unfiltered). */
const todos = ref<Todo[]>([])

/** Which filter tab is active. */
const filter = ref<FilterCriteria>('all')

/** The id of the todo currently in edit mode (or null). */
const editingTodoId = ref<string | null>(null)

/** Non-blocking error messages surfaced to the user. */
const errorMessages = ref<string[]>([])

/** True while the initial page load is in flight. */
const loading = ref(false)

// ── Derived state ─────────────────────────────────────────────────────────

const counts = computed(() => ({
  all: todos.value.length,
  active: todos.value.filter((t) => t.status === 'active').length,
  completed: todos.value.filter((t) => t.status === 'completed').length,
}))

const filteredTodos = computed<Todo[]>(() => {
  if (filter.value === 'active') return todos.value.filter((t) => t.status === 'active')
  if (filter.value === 'completed') return todos.value.filter((t) => t.status === 'completed')
  return todos.value
})

// ── Helpers ───────────────────────────────────────────────────────────────

function pushError(message: string): void {
  errorMessages.value.push(message)
  // Auto-dismiss after 5 s (spec requirement)
  setTimeout(() => {
    const idx = errorMessages.value.indexOf(message)
    if (idx !== -1) errorMessages.value.splice(idx, 1)
  }, 5_000)
}

/**
 * Thin wrapper around $fetch that pushes API error messages to the toast queue.
 * $fetch is a Nuxt/ofetch global available at runtime; we reference it here so
 * unit tests can spy on / replace the global.
 */
async function apiFetch<T>(url: string, options: RequestInit & { body?: unknown } = {}): Promise<T> {
  try {
    // $fetch is a Nuxt auto-import (ofetch). In tests, override globalThis.$fetch.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fetchFn: typeof $fetch = (globalThis as any).$fetch
    const fetchOptions: Parameters<typeof $fetch>[1] = {
      ...(options as Parameters<typeof $fetch>[1]),
    }
    return await fetchFn<T>(url, fetchOptions)
  } catch (err: unknown) {
    const errObj = err as { data?: { message?: string }; message?: string } | null
    const msg =
      errObj?.data?.message ?? errObj?.message ?? 'An unexpected error occurred'
    pushError(msg)
    throw err
  }
}

// ── Actions ───────────────────────────────────────────────────────────────

/** Load all todos from the server (initial page load). */
async function loadTodos(): Promise<void> {
  loading.value = true
  try {
    const data = await apiFetch<TodoListResponse>(API_BASE)
    // Spec: order is createdAt descending (newest first)
    todos.value = [...data.todos].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )
  } catch {
    // error already pushed by apiFetch
  } finally {
    loading.value = false
  }
}

/** Create a new Todo. Returns true on success, false on failure. */
async function createTodo(title: string): Promise<boolean> {
  const payload: CreateTodoPayload = { title }
  try {
    const created = await apiFetch<Todo>(API_BASE, {
      method: 'POST',
      body: payload,
    })
    // Prepend so the newest item appears first
    todos.value = [created, ...todos.value]
    return true
  } catch {
    return false
  }
}

/** Toggle a todo's status (active ↔ completed). Optimistic update with rollback. */
async function toggleTodo(id: string): Promise<void> {
  const idx = todos.value.findIndex((t) => t.id === id)
  if (idx === -1) return

  const prev = todos.value[idx]
  const nextStatus: TodoStatus = prev.status === 'active' ? 'completed' : 'active'

  // Optimistic update
  todos.value = todos.value.map((t, i) => (i === idx ? { ...t, status: nextStatus } : t))

  const payload: UpdateTodoPayload = { status: nextStatus }
  try {
    const updated = await apiFetch<Todo>(`${API_BASE}/${id}`, {
      method: 'PATCH',
      body: payload,
    })
    todos.value = todos.value.map((t) => (t.id === id ? updated : t))
  } catch {
    // Rollback on failure
    todos.value = todos.value.map((t, i) => (i === idx ? prev : t))
  }
}

/** Update a todo's title. Clears edit mode on success. */
async function updateTitle(id: string, title: string): Promise<void> {
  const payload: UpdateTodoPayload = { title }
  try {
    const updated = await apiFetch<Todo>(`${API_BASE}/${id}`, {
      method: 'PATCH',
      body: payload,
    })
    todos.value = todos.value.map((t) => (t.id === id ? updated : t))
    editingTodoId.value = null
  } catch {
    // Keep edit mode open so the user can retry or press Escape
  }
}

/** Delete a single todo by id. Optimistic removal with rollback. */
async function deleteTodo(id: string): Promise<void> {
  const idx = todos.value.findIndex((t) => t.id === id)
  if (idx === -1) return

  const saved = todos.value[idx]

  // Optimistic remove
  todos.value = todos.value.filter((t) => t.id !== id)
  if (editingTodoId.value === id) editingTodoId.value = null

  try {
    await apiFetch(`${API_BASE}/${id}`, { method: 'DELETE' })
  } catch {
    // Rollback
    todos.value = [
      ...todos.value.slice(0, idx),
      saved,
      ...todos.value.slice(idx),
    ]
  }
}

/** Clear all completed todos (bulk delete). Optimistic with rollback. */
async function clearCompleted(): Promise<void> {
  const removedItems = todos.value.filter((t) => t.status === 'completed')
  // Optimistic: remove completed todos immediately
  todos.value = todos.value.filter((t) => t.status === 'active')

  try {
    await apiFetch<DeleteCompletedResponse>(`${API_BASE}?status=completed`, {
      method: 'DELETE',
    })
  } catch {
    // Rollback
    todos.value = [...todos.value, ...removedItems].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )
  }
}

/** Enter edit mode for a todo. */
function startEditing(id: string): void {
  editingTodoId.value = id
}

/** Cancel edit without saving. */
function cancelEditing(): void {
  editingTodoId.value = null
}

/** Set the active filter tab (client-side only, no API call). */
function setFilter(criteria: FilterCriteria): void {
  filter.value = criteria
}

// ── Public API ────────────────────────────────────────────────────────────

export function useTodos() {
  return {
    // Reactive state (readonly to enforce action-only mutations)
    todos: readonly(todos),
    filteredTodos,
    filter: readonly(filter),
    editingTodoId: readonly(editingTodoId),
    errorMessages: readonly(errorMessages),
    loading: readonly(loading),
    counts,

    // Actions
    loadTodos,
    createTodo,
    toggleTodo,
    updateTitle,
    deleteTodo,
    clearCompleted,
    startEditing,
    cancelEditing,
    setFilter,
  }
}
