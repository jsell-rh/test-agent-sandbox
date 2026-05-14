<script setup lang="ts">
/**
 * pages/index.vue — Todo application entry page.
 *
 * Integration point for the UI state machine (specs/interface.spec.md).
 *
 * State:
 *   todos[]        — source of truth; loaded from API on mount (GET /api/todos)
 *   filter         — FilterCriteria, default 'all'; applied client-side
 *   editingTodoId  — TodoId being edited, default null
 *
 * No business logic lives here. State transitions will be triggered by
 * child component events (wired in subsequent tasks).
 */

import { onMounted } from 'vue'
import { useTodos, FILTER_COMPLETED } from '~/composables/useTodos'

const {
  todos,
  // filter and editingTodoId are part of the state machine contract and will be
  // consumed by child components in subsequent tasks.
  filter,       // eslint-disable-line @typescript-eslint/no-unused-vars
  editingTodoId, // eslint-disable-line @typescript-eslint/no-unused-vars
  filteredTodos,
  counts,       // eslint-disable-line @typescript-eslint/no-unused-vars
  loadTodos,
} = useTodos()

onMounted(async () => {
  await loadTodos()
})
</script>

<template>
  <div class="todo-app">
    <AppHeader />

    <section class="main" :aria-hidden="todos.length === 0 ? 'true' : undefined">
      <ol class="todo-list" data-testid="todo-list" aria-label="Todo items">
        <li
          v-for="todo in filteredTodos"
          :key="todo.id"
          class="todo-item"
          data-testid="todo-item"
          :class="{ [FILTER_COMPLETED]: todo.status === FILTER_COMPLETED }"
        >
          {{ todo.title }}
        </li>
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

.todo-item {
  padding: 1rem;
  border-bottom: 1px solid #ededed;
}

.todo-item.completed {
  text-decoration: line-through;
  color: #d9d9d9;
}
</style>
