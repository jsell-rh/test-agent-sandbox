<script setup lang="ts">
/**
 * pages/index.vue — Todo application entry page.
 *
 * Integration point for the UI state machine (specs/interface.spec.md).
 *
 * State (via useTodos):
 *   todos[]        — source of truth; loaded from API on mount (GET /api/todos)
 *   filter         — FilterCriteria, default 'all'; applied client-side
 *   editingTodoId  — TodoId being edited, default null
 *
 * Error display (via useErrorNotification — specs/interface.spec.md §
 * Non-Functional Requirements):
 *   All action errors are surfaced to the user as a non-blocking inline
 *   ErrorNotification that auto-dismisses after 5 seconds.
 *   The previously loaded todo list remains visible during errors.
 *
 * This page wires together:
 *   - Header (AppHeader)
 *   - NewTodoInput (create new todos via POST /api/todos)
 *   - Todo list (TodoItem components; filtered view from filteredTodos)
 *   - Footer bar (FooterBar; visible only when todos[] is non-empty)
 *     - Items-left count
 *     - FilterTabs (canonical filter set — client-side only)
 *     - Clear completed button (DELETE /api/todos?status=completed)
 *   - Empty state message (when filteredTodos is empty)
 *   - ErrorNotification (non-blocking; visible only when an error is active)
 *
 * All business/API logic is delegated to the useTodos composable.
 * This component is purely responsible for rendering and wiring events.
 */

import { onMounted } from 'vue'
import {
  useTodos,
  FILTER_ALL,
  FILTER_ACTIVE,
  FILTER_COMPLETED,
} from '~/composables/useTodos'
import { useErrorNotification } from '~/composables/useErrorNotification'
import type { FilterCriteria } from '~/composables/useTodos'
import FooterBar from '~/components/FooterBar.vue'
import TodoItem from '~/components/TodoItem.vue'
import ErrorNotification from '~/components/ErrorNotification.vue'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/**
 * Contextual empty-state messages keyed by FilterCriteria.
 *
 * Using computed property keys (bracket notation) with the exported
 * FilterCriteria constants ensures this map stays in sync with the
 * constants — no magic string literals.  The Record<FilterCriteria, string>
 * annotation makes it a compile-time error to omit any FilterCriteria value.
 */
const EMPTY_STATE_MESSAGES: Record<FilterCriteria, string> = {
  [FILTER_ALL]: 'No todos yet. Add one above!',
  [FILTER_ACTIVE]: 'No active todos.',
  [FILTER_COMPLETED]: 'No completed todos.',
}

// ---------------------------------------------------------------------------
// State machine
// ---------------------------------------------------------------------------

const {
  todos,
  filter,
  editingTodoId,
  filteredTodos,
  counts,
  loadTodos,
  createTodo,
  clearCompleted,
  toggleTodo,
  deleteTodo,
  updateTodoTitle,
  startEditing,
  cancelEditing,
} = useTodos()

// ---------------------------------------------------------------------------
// Error notification
// ---------------------------------------------------------------------------

const { errorMessage, showError, dismissError } = useErrorNotification()

// ---------------------------------------------------------------------------
// Lifecycle
// ---------------------------------------------------------------------------

onMounted(async () => {
  try {
    await loadTodos()
  }
  catch (err) {
    // Initial load failure: the todo list will be empty but that is the
    // correct state — there is nothing to roll back.  We surface the error
    // so the user knows the load failed.
    const message = err instanceof Error ? err.message : 'Failed to load todos'
    showError(message)
  }
})

// ---------------------------------------------------------------------------
// TodoItem event handlers
// ---------------------------------------------------------------------------

/**
 * Handle edit-submit from a TodoItem.
 *
 * An empty string means the user cleared the title — delete the todo.
 * A non-empty string means the user changed the title — update it.
 *
 * Spec § UI State Machine:
 *   "User submits empty title in edit field → DELETE /api/todos/:id"
 */
async function handleEditSubmit(id: string, newTitle: string): Promise<void> {
  try {
    if (newTitle === '') {
      await deleteTodo(id)
    }
    else {
      await updateTodoTitle(id, newTitle)
    }
  }
  catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to update todo'
    showError(message)
  }
}

/**
 * Handle toggle from a TodoItem.
 *
 * Errors are caught and surfaced — the optimistic rollback in useTodos
 * restores the previous status in todos[].
 */
async function handleToggle(id: string): Promise<void> {
  try {
    await toggleTodo(id)
  }
  catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to update todo'
    showError(message)
  }
}

/**
 * Handle delete from a TodoItem.
 *
 * Errors are caught and surfaced — the optimistic rollback in useTodos
 * restores the removed item in todos[].
 */
async function handleDelete(id: string): Promise<void> {
  try {
    await deleteTodo(id)
  }
  catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to delete todo'
    showError(message)
  }
}

/**
 * Handle the "Clear completed" action.
 *
 * Catches any rejection from clearCompleted() so it does not become an
 * unhandled promise rejection and surfaces the error to the user.
 */
async function handleClearCompleted(): Promise<void> {
  try {
    await clearCompleted()
  }
  catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to clear completed todos'
    showError(message)
  }
}
</script>

<template>
  <div class="todo-app">
    <AppHeader />

    <!-- Non-blocking inline error notification; visible only when an error is active -->
    <ErrorNotification
      v-if="errorMessage !== null"
      :message="errorMessage"
      @dismiss="dismissError()"
    />

    <NewTodoInput
      :create-todo="createTodo"
      @error="showError($event)"
    />

    <section class="main" :aria-hidden="todos.length === 0 ? 'true' : undefined">
      <ol class="todo-list" data-testid="todo-list" aria-label="Todo items">
        <TodoItem
          v-for="todo in filteredTodos"
          :key="todo.id"
          :todo="todo"
          :is-editing="editingTodoId === todo.id"
          @toggle="handleToggle(todo.id)"
          @delete="handleDelete(todo.id)"
          @edit-start="startEditing(todo.id)"
          @edit-submit="handleEditSubmit(todo.id, $event)"
          @edit-cancel="cancelEditing()"
        />
      </ol>

      <!-- Empty state: shown when the filtered view is empty -->
      <p
        v-if="filteredTodos.length === 0"
        class="empty-state"
        data-testid="empty-state"
        aria-live="polite"
      >
        {{ EMPTY_STATE_MESSAGES[filter] }}
      </p>
    </section>

    <!-- Footer: visible only when at least one todo exists -->
    <FooterBar
      v-if="todos.length > 0"
      :counts="counts"
      :filter="filter"
      @update:filter="filter = $event"
      @clear-completed="handleClearCompleted()"
    />
  </div>
</template>

<style scoped>
.todo-app {
  max-width: 550px;
  margin: 0 auto;
}

.main {
  position: relative;
}

.todo-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.empty-state {
  text-align: center;
  color: #ccc;
  padding: 2rem 1rem;
  font-style: italic;
}
</style>
