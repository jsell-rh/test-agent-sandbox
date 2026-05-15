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
 * All business/API logic is delegated to the useTodos composable.
 * This component is purely responsible for rendering and wiring events.
 *
 * Note: `filter` and `counts` are part of the state machine contract and
 * will be consumed by child components (filter bar, footer) in future tasks.
 */

import { onMounted } from 'vue'
import { useTodos } from '~/composables/useTodos'
import TodoItem from '~/components/TodoItem.vue'

const {
  todos,
  // filter and counts are part of the state machine — consumed by future
  // filter bar and footer bar components (not yet implemented).
  filter,        // eslint-disable-line @typescript-eslint/no-unused-vars
  counts,        // eslint-disable-line @typescript-eslint/no-unused-vars
  editingTodoId,
  filteredTodos,
  loadTodos,
  toggleTodo,
  deleteTodo,
  updateTodoTitle,
  startEditing,
  cancelEditing,
} = useTodos()

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
</script>

<template>
  <div class="todo-app">
    <AppHeader />

    <section
      class="main"
      :aria-hidden="todos.length === 0 ? 'true' : undefined"
    >
      <ol
        class="todo-list"
        data-testid="todo-list"
        aria-label="Todo items"
      >
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
    </section>
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
</style>
