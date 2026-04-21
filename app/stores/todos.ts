/**
 * Pinia store — central UI state for todos.
 *
 * Owns:
 *  - todos[]          — source of truth (mirrors server state)
 *  - counts           — all / active / completed from last server response
 *  - filterCriteria   — current filter tab selection
 *  - editingTodoId    — which todo (if any) is in inline edit mode
 *  - errors[]         — transient API error messages (auto-dismiss)
 *
 * This store is intentionally a thin state container. Business logic
 * (domain rules, validation) lives in the Domain layer (task-001 through
 * task-004). The store only coordinates API calls and local state updates.
 *
 * Higher-level actions (createTodo, toggleTodo, …) are implemented in
 * task-011 once the API routes exist. This file establishes the shape.
 */

import { defineStore } from 'pinia'
import type { Todo, TodoCounts, FilterCriteria } from '~/types/todo'

export interface ToastError {
  id: string
  message: string
  code: string
}

export interface TodosState {
  todos: Todo[]
  counts: TodoCounts
  filterCriteria: FilterCriteria
  editingTodoId: string | null
  loading: boolean
  errors: ToastError[]
}

export const useTodosStore = defineStore('todos', {
  state: (): TodosState => ({
    todos: [],
    counts: { all: 0, active: 0, completed: 0 },
    filterCriteria: 'all',
    editingTodoId: null,
    loading: false,
    errors: [],
  }),

  getters: {
    /** Filtered view of todos — client-side, no extra network request. */
    filteredTodos(state): Todo[] {
      if (state.filterCriteria === 'all') return state.todos
      return state.todos.filter(t => t.status === state.filterCriteria)
    },

    /** Whether the footer should be visible. */
    hasAnyTodos(state): boolean {
      return state.todos.length > 0
    },

    /** Whether "Clear completed" should be shown. */
    hasCompletedTodos(state): boolean {
      return state.counts.completed > 0
    },
  },

  actions: {
    // ── Filter ──────────────────────────────────────────────────────────────
    setFilter(criteria: FilterCriteria) {
      this.filterCriteria = criteria
    },

    // ── Edit mode ───────────────────────────────────────────────────────────
    startEditing(id: string) {
      this.editingTodoId = id
    },

    stopEditing() {
      this.editingTodoId = null
    },

    // ── Error management ────────────────────────────────────────────────────
    addError(code: string, message: string) {
      const id = crypto.randomUUID()
      this.errors.push({ id, code, message })

      // Auto-dismiss after 5 s (spec: "auto-dismiss after 5s").
      setTimeout(() => this.dismissError(id), 5_000)
    },

    dismissError(id: string) {
      this.errors = this.errors.filter(e => e.id !== id)
    },

    // ── Local state mutations (called by action composables in task-011) ────
    setTodos(todos: Todo[], counts: TodoCounts) {
      this.todos = todos
      this.counts = counts
    },

    prependTodo(todo: Todo) {
      this.todos.unshift(todo)
      this.counts.all += 1
      if (todo.status === 'active') this.counts.active += 1
      else this.counts.completed += 1
    },

    updateTodoInList(updated: Todo) {
      const idx = this.todos.findIndex(t => t.id === updated.id)
      if (idx === -1) return

      const prev = this.todos[idx]!
      this.todos[idx] = updated

      // Adjust counts when status changes.
      if (prev.status !== updated.status) {
        if (updated.status === 'completed') {
          this.counts.active -= 1
          this.counts.completed += 1
        } else {
          this.counts.active += 1
          this.counts.completed -= 1
        }
      }
    },

    removeTodo(id: string) {
      const todo = this.todos.find(t => t.id === id)
      if (!todo) return

      this.todos = this.todos.filter(t => t.id !== id)
      this.counts.all -= 1
      if (todo.status === 'active') this.counts.active -= 1
      else this.counts.completed -= 1
    },

    removeCompletedTodos() {
      const completedCount = this.counts.completed
      this.todos = this.todos.filter(t => t.status !== 'completed')
      this.counts.completed = 0
      this.counts.all -= completedCount
    },
  },
})
