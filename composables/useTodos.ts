import type { Todo, TodoStatus, FilterCriteria, TodoListResponse } from '~/types/todo'

/**
 * UI state machine for the Todo application.
 *
 * State:
 *   todos[]        — source of truth from the API
 *   counts         — always computed over ALL todos
 *   filter         — current FilterCriteria (default: 'all')
 *   editingTodoId  — the id of the todo currently in edit mode, or null
 *
 * Optimistic updates are applied for toggle and delete; rolled back on API error.
 */
export const useTodos = () => {
  const todos = useState<Todo[]>('todos', () => [])
  const counts = useState<{ all: number; active: number; completed: number }>(
    'counts',
    () => ({ all: 0, active: 0, completed: 0 }),
  )
  const filter = useState<FilterCriteria>('filter', () => 'all')
  const editingTodoId = useState<string | null>('editingTodoId', () => null)

  const { addError } = useErrors()

  /** Todos filtered by the current FilterCriteria. Client-side — no network call. */
  const filteredTodos = computed<Todo[]>(() => {
    if (filter.value === 'all') return todos.value
    return todos.value.filter((t) => t.status === filter.value)
  })

  /** Fetch all todos from the API and hydrate state. */
  const loadTodos = async (): Promise<void> => {
    const response = await $fetch<TodoListResponse>('/api/todos')
    todos.value = response.todos
    counts.value = response.counts
  }

  /** Create a new todo. On success the new item is prepended to todos[]. */
  const createTodo = async (title: string): Promise<void> => {
    try {
      const todo = await $fetch<Todo>('/api/todos', {
        method: 'POST',
        body: { title },
      })
      todos.value = [todo, ...todos.value]
      counts.value = { ...counts.value, all: counts.value.all + 1, active: counts.value.active + 1 }
    } catch (error: unknown) {
      const msg =
        error instanceof Error
          ? error.message
          : (error as { data?: { message?: string } }).data?.message ?? 'Failed to create todo'
      addError(msg)
      throw error
    }
  }

  /**
   * Partially update a todo (title and/or status).
   * Applies an optimistic update immediately; rolls back on API error.
   */
  const updateTodo = async (
    id: string,
    patch: { title?: string; status?: TodoStatus },
  ): Promise<void> => {
    const prevTodo = todos.value.find((t) => t.id === id)
    if (!prevTodo) return

    // Optimistic update
    todos.value = todos.value.map((t) => (t.id === id ? { ...t, ...patch } : t))

    if (patch.status && patch.status !== prevTodo.status) {
      if (patch.status === 'completed') {
        counts.value = {
          ...counts.value,
          active: Math.max(0, counts.value.active - 1),
          completed: counts.value.completed + 1,
        }
      } else {
        counts.value = {
          ...counts.value,
          completed: Math.max(0, counts.value.completed - 1),
          active: counts.value.active + 1,
        }
      }
    }

    try {
      const updated = await $fetch<Todo>(`/api/todos/${id}`, {
        method: 'PATCH',
        body: patch,
      })
      todos.value = todos.value.map((t) => (t.id === id ? updated : t))
    } catch (error: unknown) {
      // Rollback
      todos.value = todos.value.map((t) => (t.id === id ? prevTodo : t))
      if (patch.status && patch.status !== prevTodo.status) {
        if (patch.status === 'completed') {
          counts.value = {
            ...counts.value,
            active: counts.value.active + 1,
            completed: Math.max(0, counts.value.completed - 1),
          }
        } else {
          counts.value = {
            ...counts.value,
            completed: counts.value.completed + 1,
            active: Math.max(0, counts.value.active - 1),
          }
        }
      }
      const msg =
        error instanceof Error
          ? error.message
          : (error as { data?: { message?: string } }).data?.message ?? 'Failed to update todo'
      addError(msg)
      throw error
    }
  }

  /**
   * Permanently delete a todo.
   * Applies an optimistic removal; rolls back on API error.
   */
  const deleteTodo = async (id: string): Promise<void> => {
    const prevTodo = todos.value.find((t) => t.id === id)
    if (!prevTodo) return

    // Optimistic removal
    todos.value = todos.value.filter((t) => t.id !== id)
    const countDelta =
      prevTodo.status === 'active'
        ? { active: Math.max(0, counts.value.active - 1) }
        : { completed: Math.max(0, counts.value.completed - 1) }
    counts.value = { ...counts.value, all: Math.max(0, counts.value.all - 1), ...countDelta }

    try {
      await $fetch(`/api/todos/${id}`, { method: 'DELETE' })
    } catch (error: unknown) {
      // Rollback
      todos.value = [...todos.value, prevTodo].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      )
      const restoreDelta =
        prevTodo.status === 'active'
          ? { active: counts.value.active + 1 }
          : { completed: counts.value.completed + 1 }
      counts.value = { ...counts.value, all: counts.value.all + 1, ...restoreDelta }
      const msg =
        error instanceof Error
          ? error.message
          : (error as { data?: { message?: string } }).data?.message ?? 'Failed to delete todo'
      addError(msg)
      throw error
    }
  }

  /**
   * Bulk-delete all completed todos ("Clear completed").
   * Applies an optimistic removal; rolls back on API error.
   */
  const clearCompleted = async (): Promise<void> => {
    const completedTodos = todos.value.filter((t) => t.status === 'completed')
    const count = completedTodos.length

    // Optimistic removal
    todos.value = todos.value.filter((t) => t.status !== 'completed')
    counts.value = { ...counts.value, all: Math.max(0, counts.value.all - count), completed: 0 }

    try {
      await $fetch('/api/todos', { method: 'DELETE', query: { status: 'completed' } })
    } catch (error: unknown) {
      // Rollback
      todos.value = [...todos.value, ...completedTodos].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      )
      counts.value = { ...counts.value, all: counts.value.all + count, completed: count }
      const msg =
        error instanceof Error
          ? error.message
          : (error as { data?: { message?: string } }).data?.message ??
            'Failed to clear completed todos'
      addError(msg)
      throw error
    }
  }

  const setFilter = (criteria: FilterCriteria) => {
    filter.value = criteria
  }

  const startEditing = (id: string) => {
    editingTodoId.value = id
  }

  const stopEditing = () => {
    editingTodoId.value = null
  }

  return {
    todos: readonly(todos),
    counts: readonly(counts),
    filter,
    editingTodoId,
    filteredTodos,
    loadTodos,
    createTodo,
    updateTodo,
    deleteTodo,
    clearCompleted,
    setFilter,
    startEditing,
    stopEditing,
  }
}
