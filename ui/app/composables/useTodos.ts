/**
 * useTodos — central state machine for the todo list.
 *
 * Implements the UI state machine defined in interface.spec.md:
 *   - todos[]: source of truth from API
 *   - filter: FilterCriteria (default: all)
 *   - editingTodoId: TodoId | null
 *   - errors: inline non-blocking, auto-dismiss (5s)
 *
 * Optimistic updates for toggle and delete with rollback on API error.
 */
import type { Todo, FilterCriteria, UiError, TodoCounts } from '~/types/todo'
import { ERROR_DISMISS_MS } from '~/types/todo'

let _errorIdCounter = 0
function newErrorId(): string {
  return `err-${Date.now()}-${++_errorIdCounter}`
}

export function useTodos() {
  // ---------- State ----------
  const todos = useState<Todo[]>('todos', () => [])
  const counts = useState<TodoCounts>('counts', () => ({ all: 0, active: 0, completed: 0 }))
  const filter = useState<FilterCriteria>('filter', () => 'all')
  const editingTodoId = useState<string | null>('editingTodoId', () => null)
  const errors = useState<UiError[]>('errors', () => [])
  const loading = useState<boolean>('loading', () => false)

  // ---------- Error helpers ----------
  function pushError(message: string): void {
    const err: UiError = { id: newErrorId(), message, timestamp: Date.now() }
    errors.value = [...errors.value, err]
    setTimeout(() => dismissError(err.id), ERROR_DISMISS_MS)
  }

  function dismissError(id: string): void {
    errors.value = errors.value.filter((e) => e.id !== id)
  }

  async function extractApiError(response: Response): Promise<string> {
    try {
      const data = await response.json()
      return data?.data?.message || data?.message || `Server error (${response.status})`
    } catch {
      return `Server error (${response.status})`
    }
  }

  // ---------- Load todos ----------
  async function loadTodos(): Promise<void> {
    loading.value = true
    try {
      const data = await $fetch<{ todos: Todo[]; counts: TodoCounts }>('/api/todos')
      todos.value = data.todos
      counts.value = data.counts
    } catch (err: unknown) {
      const message = extractFetchError(err) || 'Failed to load todos.'
      pushError(message)
    } finally {
      loading.value = false
    }
  }

  function extractFetchError(err: unknown): string {
    if (err && typeof err === 'object') {
      const e = err as Record<string, unknown>
      const data = e.data as Record<string, unknown> | undefined
      if (data?.message && typeof data.message === 'string') return data.message
      if (e.message && typeof e.message === 'string') return e.message
    }
    return ''
  }

  // ---------- Filtered list (client-side) ----------
  const filteredTodos = computed<Todo[]>(() => {
    const f = filter.value
    if (f === 'all') return todos.value
    return todos.value.filter((t) => t.status === f)
  })

  // ---------- Create todo ----------
  async function createTodo(rawTitle: string): Promise<boolean> {
    const title = rawTitle.trim()
    if (!title) return false

    try {
      const created = await $fetch<Todo>('/api/todos', {
        method: 'POST',
        body: { title },
      })
      todos.value = [created, ...todos.value]
      counts.value = { ...counts.value, all: counts.value.all + 1, active: counts.value.active + 1 }
      return true
    } catch (err: unknown) {
      pushError(extractFetchError(err) || 'Failed to create todo.')
      return false
    }
  }

  // ---------- Toggle status (optimistic) ----------
  async function toggleTodo(id: string): Promise<void> {
    const index = todos.value.findIndex((t) => t.id === id)
    if (index === -1) return

    const original = todos.value[index]
    const newStatus = original.status === 'active' ? 'completed' : 'active'

    // Optimistic update
    const optimistic: Todo = { ...original, status: newStatus, updatedAt: new Date().toISOString() }
    todos.value = todos.value.map((t) => (t.id === id ? optimistic : t))
    // Optimistic count update
    if (newStatus === 'completed') {
      counts.value = { ...counts.value, active: Math.max(0, counts.value.active - 1), completed: counts.value.completed + 1 }
    } else {
      counts.value = { ...counts.value, active: counts.value.active + 1, completed: Math.max(0, counts.value.completed - 1) }
    }

    try {
      const updated = await $fetch<Todo>(`/api/todos/${id}`, {
        method: 'PATCH',
        body: { status: newStatus },
      })
      todos.value = todos.value.map((t) => (t.id === id ? updated : t))
    } catch (err: unknown) {
      // Rollback optimistic update
      todos.value = todos.value.map((t) => (t.id === id ? original : t))
      if (newStatus === 'completed') {
        counts.value = { ...counts.value, active: counts.value.active + 1, completed: Math.max(0, counts.value.completed - 1) }
      } else {
        counts.value = { ...counts.value, active: Math.max(0, counts.value.active - 1), completed: counts.value.completed + 1 }
      }
      pushError(extractFetchError(err) || 'Failed to update todo status.')
    }
  }

  // ---------- Update title ----------
  async function updateTitle(id: string, rawTitle: string): Promise<boolean> {
    const title = rawTitle.trim()

    if (!title) {
      // Empty title → delete
      return deleteTodo(id)
    }

    const index = todos.value.findIndex((t) => t.id === id)
    if (index === -1) return false

    try {
      const updated = await $fetch<Todo>(`/api/todos/${id}`, {
        method: 'PATCH',
        body: { title },
      })
      todos.value = todos.value.map((t) => (t.id === id ? updated : t))
      editingTodoId.value = null
      return true
    } catch (err: unknown) {
      pushError(extractFetchError(err) || 'Failed to update todo title.')
      return false
    }
  }

  // ---------- Delete (optimistic) ----------
  async function deleteTodo(id: string): Promise<boolean> {
    const index = todos.value.findIndex((t) => t.id === id)
    if (index === -1) return false

    const original = todos.value[index]

    // Optimistic removal
    todos.value = todos.value.filter((t) => t.id !== id)
    const countDelta = original.status === 'active'
      ? { active: Math.max(0, counts.value.active - 1), all: Math.max(0, counts.value.all - 1) }
      : { completed: Math.max(0, counts.value.completed - 1), all: Math.max(0, counts.value.all - 1) }
    counts.value = { ...counts.value, ...countDelta }

    if (editingTodoId.value === id) {
      editingTodoId.value = null
    }

    try {
      await $fetch(`/api/todos/${id}`, { method: 'DELETE' })
      return true
    } catch (err: unknown) {
      // Rollback
      todos.value = [
        ...todos.value.slice(0, index),
        original,
        ...todos.value.slice(index),
      ]
      counts.value = { ...counts.value, all: counts.value.all + 1 }
      if (original.status === 'active') {
        counts.value = { ...counts.value, active: counts.value.active + 1 }
      } else {
        counts.value = { ...counts.value, completed: counts.value.completed + 1 }
      }
      pushError(extractFetchError(err) || 'Failed to delete todo.')
      return false
    }
  }

  // ---------- Clear completed ----------
  async function clearCompleted(): Promise<void> {
    try {
      await $fetch('/api/todos?status=completed', { method: 'DELETE' })
      todos.value = todos.value.filter((t) => t.status !== 'completed')
      counts.value = { ...counts.value, completed: 0, all: counts.value.active }
    } catch (err: unknown) {
      pushError(extractFetchError(err) || 'Failed to clear completed todos.')
    }
  }

  // ---------- Filter ----------
  function setFilter(f: FilterCriteria): void {
    filter.value = f
  }

  // ---------- Edit mode ----------
  function startEditing(id: string): void {
    editingTodoId.value = id
  }

  function cancelEditing(): void {
    editingTodoId.value = null
  }

  return {
    // State
    todos,
    counts,
    filter,
    editingTodoId,
    errors,
    loading,
    // Computed
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
