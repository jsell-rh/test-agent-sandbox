import type {
  FilterCriteria,
  Todo,
  TodoCounts,
  TodosResponse,
  ApiError,
} from '~/types/todo'

/**
 * Central state and API integration for the Todo list.
 *
 * All API paths are relative to `apiBase`, which is configured via the
 * NUXT_PUBLIC_API_BASE environment variable (empty = same-origin / proxy).
 */
export function useTodos() {
  const { addError } = useErrors()
  const runtimeConfig = useRuntimeConfig()
  const apiBase = computed(() => runtimeConfig.public.apiBase ?? '')

  // ── Reactive state ──────────────────────────────────────────────────────

  /** Source-of-truth list from the API (all todos, unfiltered). */
  const todos = useState<Todo[]>('todos:list', () => [])

  /** Counts for all three filter buckets (always computed over ALL todos). */
  const counts = useState<TodoCounts>('todos:counts', () => ({
    all: 0,
    active: 0,
    completed: 0,
  }))

  /** Active FilterCriteria — drives client-side list rendering. */
  const filter = useState<FilterCriteria>('todos:filter', () => 'all')

  /** Id of the Todo currently being edited, or null. */
  const editingTodoId = useState<string | null>('todos:editingId', () => null)

  /** True while the initial load is in flight. */
  const loading = useState<boolean>('todos:loading', () => false)

  // ── Derived ─────────────────────────────────────────────────────────────

  /** Todos visible under the current FilterCriteria (client-side). */
  const filteredTodos = computed<Todo[]>(() => {
    if (filter.value === 'all') return todos.value
    return todos.value.filter((t) => t.status === filter.value)
  })

  // ── Helpers ─────────────────────────────────────────────────────────────

  function todoApiUrl(id?: string): string {
    const base = `${apiBase.value}/api/todos`
    return id ? `${base}/${id}` : base
  }

  /** Extract a user-facing message from a $fetch error. */
  function extractErrorMessage(err: unknown, fallback: string): string {
    if (err && typeof err === 'object' && 'data' in err) {
      const data = (err as { data?: ApiError }).data
      if (data?.message) return data.message
    }
    return fallback
  }

  /** Return the error code from a $fetch error, or empty string. */
  function extractErrorCode(err: unknown): string {
    if (err && typeof err === 'object' && 'data' in err) {
      const data = (err as { data?: ApiError }).data
      if (data?.error) return data.error
    }
    return ''
  }

  // ── Counts helpers ───────────────────────────────────────────────────────

  function adjustCounts(delta: Partial<TodoCounts>): void {
    counts.value = {
      all: Math.max(0, counts.value.all + (delta.all ?? 0)),
      active: Math.max(0, counts.value.active + (delta.active ?? 0)),
      completed: Math.max(0, counts.value.completed + (delta.completed ?? 0)),
    }
  }

  // ── API operations ───────────────────────────────────────────────────────

  /** Load the full todo list from the API. Called once on page mount. */
  async function fetchTodos(): Promise<void> {
    loading.value = true
    try {
      const data = await $fetch<TodosResponse>(todoApiUrl())
      todos.value = data.todos
      counts.value = data.counts
    } catch (err) {
      addError(extractErrorMessage(err, 'Failed to load todos'))
    } finally {
      loading.value = false
    }
  }

  /**
   * Create a new Todo.
   * Throws on validation or server errors so the caller (TodoInput) can
   * keep the input value intact.
   */
  async function createTodo(title: string): Promise<void> {
    const todo = await $fetch<Todo>(todoApiUrl(), {
      method: 'POST',
      body: { title },
    }).catch((err) => {
      const message =
        extractErrorCode(err) === 'INVALID_TITLE'
          ? extractErrorMessage(err, 'Title is invalid')
          : extractErrorMessage(err, 'Failed to create todo')
      addError(message)
      throw err
    })

    todos.value = [todo, ...todos.value]
    adjustCounts({ all: 1, active: 1 })
  }

  /**
   * Toggle a Todo's status between active ↔ completed.
   * Uses optimistic update; rolls back on error.
   */
  async function toggleTodo(todo: Todo): Promise<void> {
    const newStatus = todo.status === 'active' ? 'completed' : 'active'
    const idx = todos.value.findIndex((t) => t.id === todo.id)
    if (idx === -1) return

    // Optimistic update
    todos.value = todos.value.map((t, i) =>
      i === idx ? { ...t, status: newStatus } : t,
    )
    if (newStatus === 'completed') {
      adjustCounts({ active: -1, completed: 1 })
    } else {
      adjustCounts({ active: 1, completed: -1 })
    }

    try {
      const updated = await $fetch<Todo>(todoApiUrl(todo.id), {
        method: 'PATCH',
        body: { status: newStatus },
      })
      todos.value = todos.value.map((t, i) => (i === idx ? updated : t))
    } catch (err) {
      // Rollback
      todos.value = todos.value.map((t, i) =>
        i === idx ? { ...t, status: todo.status } : t,
      )
      if (newStatus === 'completed') {
        adjustCounts({ active: 1, completed: -1 })
      } else {
        adjustCounts({ active: -1, completed: 1 })
      }
      addError(extractErrorMessage(err, 'Failed to update todo'))
    }
  }

  /**
   * Update a Todo's title.
   * If newTitle is blank, delegates to deleteTodo instead (per spec).
   * Clears editingTodoId on success.
   */
  async function updateTitle(id: string, newTitle: string): Promise<void> {
    if (!newTitle.trim()) {
      await deleteTodo(id)
      return
    }

    try {
      const updated = await $fetch<Todo>(todoApiUrl(id), {
        method: 'PATCH',
        body: { title: newTitle },
      })
      todos.value = todos.value.map((t) => (t.id === id ? updated : t))
      editingTodoId.value = null
    } catch (err) {
      const message =
        extractErrorCode(err) === 'INVALID_TITLE'
          ? extractErrorMessage(err, 'Title is invalid')
          : extractErrorMessage(err, 'Failed to update todo')
      addError(message)
    }
  }

  /**
   * Permanently delete a Todo.
   * Uses optimistic update; rolls back on error.
   */
  async function deleteTodo(id: string): Promise<void> {
    const idx = todos.value.findIndex((t) => t.id === id)
    if (idx === -1) return
    const removed = todos.value[idx]!

    // Optimistic remove
    todos.value = todos.value.filter((t) => t.id !== id)
    adjustCounts({
      all: -1,
      active: removed.status === 'active' ? -1 : 0,
      completed: removed.status === 'completed' ? -1 : 0,
    })
    if (editingTodoId.value === id) editingTodoId.value = null

    try {
      await $fetch(todoApiUrl(id), { method: 'DELETE' })
    } catch (err) {
      // Rollback
      todos.value = [
        ...todos.value.slice(0, idx),
        removed,
        ...todos.value.slice(idx),
      ]
      adjustCounts({
        all: 1,
        active: removed.status === 'active' ? 1 : 0,
        completed: removed.status === 'completed' ? 1 : 0,
      })
      addError(extractErrorMessage(err, 'Failed to delete todo'))
    }
  }

  /**
   * Bulk-delete all completed Todos ("Clear completed").
   * Uses optimistic update; rolls back on error.
   */
  async function clearCompleted(): Promise<void> {
    const completedTodos = todos.value.filter((t) => t.status === 'completed')
    const completedCount = completedTodos.length
    if (completedCount === 0) return

    // Optimistic remove
    todos.value = todos.value.filter((t) => t.status !== 'completed')
    adjustCounts({ all: -completedCount, completed: -completedCount })

    try {
      await $fetch<{ deletedCount: number }>(todoApiUrl(), {
        method: 'DELETE',
        query: { status: 'completed' },
      })
    } catch (err) {
      // Rollback
      todos.value = [...todos.value, ...completedTodos]
      adjustCounts({ all: completedCount, completed: completedCount })
      addError(extractErrorMessage(err, 'Failed to clear completed todos'))
    }
  }

  return {
    // State
    todos,
    filteredTodos,
    counts,
    filter,
    editingTodoId,
    loading,
    // Actions
    fetchTodos,
    createTodo,
    toggleTodo,
    updateTitle,
    deleteTodo,
    clearCompleted,
  }
}
