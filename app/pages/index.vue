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
 * This page wires together:
 *   - Header (AppHeader)
 *   - NewTodoInput (create new todos via POST /api/todos)
 *   - Todo list (TodoItem components; filtered view from filteredTodos)
 *   - Footer bar (FooterBar; visible only when todos[] is non-empty)
 *     - Items-left count
 *     - FilterTabs (canonical filter set — client-side only)
 *     - Clear completed button (DELETE /api/todos?status=completed)
 *   - Empty state message (when filteredTodos is empty)
 *
 * All business/API logic is delegated to the useTodos composable.
 * This component is purely responsible for rendering and wiring events.
 *
 * Error handling:
 *   Errors from child components are stored in `errorMessage`. Display is
 *   wired by the ui-accessibility-errors task; this task persists the value
 *   so subsequent tasks can consume it.
 */

import { onMounted, ref } from 'vue'
import {
  useTodos,
  FILTER_ALL,
  FILTER_ACTIVE,
  FILTER_COMPLETED,
} from '~/composables/useTodos'
import type { FilterCriteria } from '~/composables/useTodos'
import FooterBar from '~/components/FooterBar.vue'
import TodoItem from '~/components/TodoItem.vue'

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

/** Holds the latest API error message; consumed by the error display (future task). */
const errorMessage = ref<string | null>(null)

function handleCreateError(message: string): void {
  errorMessage.value = message
}

onMounted(async () => {
  await loadTodos()
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
  if (newTitle === '') {
    await deleteTodo(id)
  }
  else {
    await updateTodoTitle(id, newTitle)
  }
}

/**
 * Handle the "Clear completed" action.
 *
 * Catches any rejection from clearCompleted() so it does not become an
 * unhandled promise rejection.  Full error-state UI (inline messages,
 * auto-dismiss) is deferred to a later task that wires a global error
 * bus; this handler ensures the rejection is at least observed.
 */
async function handleClearCompleted(): Promise<void> {
  try {
    await clearCompleted()
  }
  catch (err) {
    console.error('[todo-app] clearCompleted failed:', err)
  }
}
</script>

<template>
  <div class="todo-app">
    <AppHeader />

    <NewTodoInput
      :create-todo="createTodo"
      @error="handleCreateError"
    />

    <section class="main" :aria-hidden="todos.length === 0 ? 'true' : undefined">
      <ol class="todo-list" data-testid="todo-list" aria-label="Todo items">
        <TodoItem
          v-for="todo in filteredTodos"
          :key="todo.id"
          :todo="todo"
          :is-editing="editingTodoId === todo.id"
          @toggle="toggleTodo(todo.id)"
          @delete="deleteTodo(todo.id)"
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
