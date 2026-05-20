<script setup lang="ts">
/**
 * TodoApp — root component composing the full todo application.
 *
 * Spec UI sections:
 * - Header: application title "todos"
 * - New Todo Input
 * - Todo List: ordered createdAt descending (newest first), rendered by filteredTodos
 * - Filter Bar (delegated to TodoFooter which contains the canonical set of tabs)
 * - Footer Bar (visible only when ≥ 1 todo exists)
 * - Empty State: contextual message when filtered list is empty
 * - Error banners: non-blocking, auto-dismiss after 5 s
 */
import { computed, onMounted } from 'vue'
import { useTodos } from '~/composables/useTodos'

const store = useTodos()

// Load all todos on mount (spec: "Full todo list loaded on page load via GET /api/todos")
onMounted(async () => {
  await store.loadTodos()
})

const EMPTY_MESSAGES: Record<string, string> = {
  all: 'No todos yet — add one above!',
  active: 'No active todos. Time to relax!',
  completed: 'No completed todos yet.',
}

const emptyMessage = computed(
  () => EMPTY_MESSAGES[store.filter.value] ?? EMPTY_MESSAGES.all,
)
</script>

<template>
  <div class="todo-app">
    <!-- Header -->
    <header class="todo-header">
      <h1 class="todo-heading">todos</h1>
    </header>

    <!-- Error banners (non-blocking, auto-dismiss) -->
    <TransitionGroup tag="div" class="error-banners" name="fade" aria-live="assertive">
      <div
        v-for="err in store.errors.value"
        :key="err.id"
        class="error-banner"
        role="alert"
        data-testid="error-banner"
      >
        <span>{{ err.message }}</span>
        <button
          class="error-dismiss"
          type="button"
          aria-label="Dismiss error"
          @click="store.dismissError(err.id)"
        >
          ×
        </button>
      </div>
    </TransitionGroup>

    <!-- Main card -->
    <main class="todo-main">
      <!-- New todo input -->
      <TodoInput />

      <!-- Todo list -->
      <section aria-label="Todo list">
        <ul v-if="store.filteredTodos.value.length > 0" class="todo-list">
          <TodoItem
            v-for="todo in store.filteredTodos.value"
            :key="todo.id"
            :todo="todo"
          />
        </ul>

        <!-- Empty state -->
        <p v-else class="empty-state" data-testid="empty-state">
          {{ emptyMessage }}
        </p>
      </section>

      <!-- Footer (visible only when todos exist) -->
      <TodoFooter />
    </main>
  </div>
</template>
