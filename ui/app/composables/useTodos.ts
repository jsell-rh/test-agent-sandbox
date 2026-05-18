import type {
  Todo,
  FilterCriteria,
  Counts,
  AppNotification,
  TodoListResponse,
  UpdateTodoRequest,
} from '~/types'

const NOTIFICATION_DURATION_MS = 5_000
const API_BASE = '/api/todos'

// ── Shared state ──────────────────────────────────────────────────────────────
// Keyed useState ensures the same state across all component instances.

function useSharedState() {
  const todos = useState<Todo[]>('todos', () => [])
  const filterCriteria = useState<FilterCriteria>('filterCriteria', () => 'all')
  const editingTodoId = useState<string | null>('editingTodoId', () => null)
  const notifications = useState<AppNotification[]>('notifications', () => [])
  const isLoading = useState<boolean>('isLoading', () => false)

  return { todos, filterCriteria, editingTodoId, notifications, isLoading }
}

// ── Composable ────────────────────────────────────────────────────────────────

export function useTodos() {
  const { todos, filterCriteria, editingTodoId, notifications, isLoading } =
    useSharedState()

  // ── Derived state ───────────────────────────────────────────────────────────

  /** Counts always computed over ALL todos, matching the spec requirement. */
  const counts = computed<Counts>(() => ({
    all: todos.value.length,
    active: todos.value.filter((t) => t.status === 'active').length,
    completed: todos.value.filter((t) => t.status === 'completed').length,
  }))

  /** Client-side filtered view — no extra network request. */
  const filteredTodos = computed<Todo[]>(() => {
    if (filterCriteria.value === 'all') return todos.value
    return todos.value.filter((t) => t.status === filterCriteria.value)
  })

  // ── Notifications ───────────────────────────────────────────────────────────

  function pushNotification(
    message: string,
    level: AppNotification['level'] = 'error',
  ): void {
    const id = `${Date.now()}-${Math.random()}`
    notifications.value.push({ id, message, level })
    setTimeout(() => {
      notifications.value = notifications.value.filter((n) => n.id !== id)
    }, NOTIFICATION_DURATION_MS)
  }

  function dismissNotification(id: string): void {
    notifications.value = notifications.value.filter((n) => n.id !== id)
  }

  // ── API helpers ─────────────────────────────────────────────────────────────

  function apiErrorMessage(err: unknown, fallback: string): string {
    if (err && typeof err === 'object' && 'data' in err) {
      const data = (err as { data?: { message?: string } }).data
      if (data?.message) return data.message
    }
    return fallback
  }

  // ── Actions ─────────────────────────────────────────────────────────────────

  /**
   * Load all todos from the server.
   * Called once on page mount; provides initial state.
   */
  async function loadTodos(): Promise<void> {
    isLoading.value = true
    try {
      const data = await $fetch<TodoListResponse>(API_BASE)
      // Sort newest-first (API should already do this, but guarantee it)
      todos.value = [...data.todos].sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      )
    } catch (err) {
      pushNotification('Failed to load todos. Please refresh the page.')
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Create a new Todo.
   * Throws on validation failure so the input component can handle it.
   */
  async function createTodo(title: string): Promise<void> {
    const created = await $fetch<Todo>(API_BASE, {
      method: 'POST',
      body: { title } satisfies { title: string },
    })
    // Prepend — newest first
    todos.value = [created, ...todos.value]
  }

  /**
   * Toggle a Todo's status between active ↔ completed.
   * Applies an optimistic update; rolls back on failure.
   */
  async function toggleTodo(todo: Todo): Promise<void> {
    const newStatus = todo.status === 'active' ? 'completed' : 'active'
    const index = todos.value.findIndex((t) => t.id === todo.id)
    if (index === -1) return

    // Optimistic update
    const original = todos.value[index]!
    todos.value[index] = { ...original, status: newStatus }

    try {
      const updated = await $fetch<Todo>(`${API_BASE}/${todo.id}`, {
        method: 'PATCH',
        body: { status: newStatus } satisfies UpdateTodoRequest,
      })
      todos.value[index] = updated
    } catch (err) {
      // Rollback
      todos.value[index] = original
      pushNotification(apiErrorMessage(err, 'Failed to update todo status.'))
    }
  }

  /**
   * Update a Todo's title.
   * Throws on validation failure so the edit component can handle it.
   */
  async function updateTitle(todo: Todo, newTitle: string): Promise<void> {
    const updated = await $fetch<Todo>(`${API_BASE}/${todo.id}`, {
      method: 'PATCH',
      body: { title: newTitle } satisfies UpdateTodoRequest,
    })
    const index = todos.value.findIndex((t) => t.id === todo.id)
    if (index !== -1) todos.value[index] = updated
    editingTodoId.value = null
  }

  /**
   * Delete a single Todo.
   * Applies an optimistic update; rolls back on failure.
   */
  async function deleteTodo(todoId: string): Promise<void> {
    const index = todos.value.findIndex((t) => t.id === todoId)
    if (index === -1) return

    const original = todos.value[index]!

    // Optimistic removal
    todos.value.splice(index, 1)
    if (editingTodoId.value === todoId) editingTodoId.value = null

    try {
      await $fetch(`${API_BASE}/${todoId}`, { method: 'DELETE' })
    } catch (err) {
      // Rollback — re-insert at original position
      todos.value.splice(index, 0, original)
      pushNotification(apiErrorMessage(err, 'Failed to delete todo.'))
    }
  }

  /**
   * Clear all completed todos ("Clear completed" action).
   * Applies an optimistic update; rolls back on failure.
   */
  async function clearCompleted(): Promise<void> {
    const originalTodos = [...todos.value]

    // Optimistic removal
    todos.value = todos.value.filter((t) => t.status !== 'completed')

    try {
      await $fetch(API_BASE, {
        method: 'DELETE',
        query: { status: 'completed' },
      })
    } catch (err) {
      // Rollback
      todos.value = originalTodos
      pushNotification(apiErrorMessage(err, 'Failed to clear completed todos.'))
    }
  }

  // ── Filter ──────────────────────────────────────────────────────────────────

  function setFilter(filter: FilterCriteria): void {
    filterCriteria.value = filter
  }

  // ── Edit mode ───────────────────────────────────────────────────────────────

  function startEditing(todoId: string): void {
    editingTodoId.value = todoId
  }

  function cancelEditing(): void {
    editingTodoId.value = null
  }

  // ── Public API ──────────────────────────────────────────────────────────────

  return {
    // State
    todos,
    filteredTodos,
    counts,
    filterCriteria,
    editingTodoId,
    notifications,
    isLoading,
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
    dismissNotification,
    pushNotification,
  }
}
