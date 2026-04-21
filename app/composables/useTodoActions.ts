/**
 * useTodoActions — high-level action composable.
 *
 * Binds API calls to Pinia store mutations. Handles:
 *  - Optimistic updates (toggle, delete) with rollback on failure.
 *  - Error surfacing via the store's `addError` action.
 *  - Loading state management.
 *
 * This composable is the only place that orchestrates API ↔ store.
 * Components call these functions; they never touch the API directly.
 */

import { ApiClientError } from '~/composables/useApi'
import { useTodosStore } from '~/stores/todos'
import type { Todo, FilterCriteria } from '~/types/todo'

export function useTodoActions() {
  const store = useTodosStore()
  const api = useApi()

  // ── Helpers ──────────────────────────────────────────────────────────────────

  function surfaceError(err: unknown, fallback: string): void {
    if (err instanceof ApiClientError) {
      store.addError(err.apiError.error, err.apiError.message)
    } else {
      store.addError('INTERNAL_ERROR', fallback)
    }
  }

  // ── Actions ──────────────────────────────────────────────────────────────────

  /**
   * Fetch all todos (optionally filtered) and populate the store.
   * Called on page mount and whenever the filter changes.
   */
  async function loadTodos(filter: FilterCriteria = 'all'): Promise<void> {
    store.loading = true
    try {
      const response = await api.getTodos(filter)
      store.setTodos(response.todos, response.counts)
    } catch (err) {
      surfaceError(err, 'Failed to load todos')
    } finally {
      store.loading = false
    }
  }

  /**
   * Create a new todo and prepend it to the list.
   * Returns `true` on success so the caller can clear the input.
   */
  async function createTodo(title: string): Promise<boolean> {
    if (!title.trim()) return false
    try {
      const todo = await api.createTodo({ title: title.trim() })
      store.prependTodo(todo)
      return true
    } catch (err) {
      surfaceError(err, 'Failed to create todo')
      return false
    }
  }

  /**
   * Toggle a todo's status between active and completed.
   * Applies an optimistic update; rolls back on failure.
   */
  async function toggleTodo(todo: Todo): Promise<void> {
    const newStatus = todo.status === 'active' ? 'completed' : 'active'
    const optimistic: Todo = { ...todo, status: newStatus }

    store.updateTodoInList(optimistic) // optimistic

    try {
      const updated = await api.updateTodo(todo.id, { status: newStatus })
      store.updateTodoInList(updated)
    } catch (err) {
      store.updateTodoInList(todo) // rollback
      surfaceError(err, 'Failed to update todo')
    }
  }

  /**
   * Update the title of an existing todo.
   * An empty new title deletes the todo instead (per spec).
   */
  async function updateTitle(todo: Todo, newTitle: string): Promise<void> {
    const trimmed = newTitle.trim()

    if (trimmed === '') {
      await deleteTodo(todo)
      return
    }

    if (trimmed === todo.title) return // no-op

    try {
      const updated = await api.updateTodo(todo.id, { title: trimmed })
      store.updateTodoInList(updated)
    } catch (err) {
      surfaceError(err, 'Failed to update todo title')
    }
  }

  /**
   * Delete a todo permanently.
   * Applies an optimistic removal; re-inserts on failure.
   */
  async function deleteTodo(todo: Todo): Promise<void> {
    store.removeTodo(todo.id) // optimistic

    try {
      await api.deleteTodo(todo.id)
    } catch (err) {
      store.prependTodo(todo) // rollback
      surfaceError(err, 'Failed to delete todo')
    }
  }

  /**
   * Bulk delete all completed todos.
   * Applies an optimistic removal; reloads the full list on failure.
   */
  async function clearCompleted(): Promise<void> {
    store.removeCompletedTodos() // optimistic

    try {
      await api.clearCompleted()
    } catch (err) {
      // Reload to restore true server state after failed bulk delete.
      await loadTodos(store.filterCriteria)
      surfaceError(err, 'Failed to clear completed todos')
    }
  }

  return {
    loadTodos,
    createTodo,
    toggleTodo,
    updateTitle,
    deleteTodo,
    clearCompleted,
  }
}
