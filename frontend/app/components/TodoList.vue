<script setup lang="ts">
import TodoItem from '~/components/TodoItem.vue'

const { filteredTodos, filter, loading, counts } = useTodos()

const emptyStateMessage = computed(() => {
  if (loading.value) return null
  if (counts.value.all === 0) return 'No todos yet. Add one above to get started.'
  if (filter.value === 'active' && filteredTodos.value.length === 0)
    return 'No active todos. All done! 🎉'
  if (filter.value === 'completed' && filteredTodos.value.length === 0)
    return 'No completed todos yet.'
  return null
})
</script>

<template>
  <section aria-label="Todo list">
    <!-- Loading state -->
    <div
      v-if="loading"
      class="card px-4 py-8 flex items-center justify-center gap-3 text-slate-400"
      aria-live="polite"
      aria-label="Loading todos"
    >
      <svg
        class="w-5 h-5 animate-spin"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        aria-hidden="true"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
        />
      </svg>
      <span class="text-sm font-medium">Loading…</span>
    </div>

    <!-- Empty state -->
    <div
      v-else-if="emptyStateMessage"
      class="card px-6 py-12 text-center"
      role="status"
      aria-live="polite"
    >
      <p class="text-slate-400 text-sm font-medium">{{ emptyStateMessage }}</p>
    </div>

    <!-- Todo items -->
    <ul
      v-else
      class="card divide-y divide-slate-100 overflow-hidden"
      aria-label="Todo items"
      role="list"
    >
      <TransitionGroup name="todo-list">
        <TodoItem
          v-for="todo in filteredTodos"
          :key="todo.id"
          :todo="todo"
        />
      </TransitionGroup>
    </ul>
  </section>
</template>

<style scoped>
/* Transition for list items */
.todo-list-enter-active,
.todo-list-leave-active {
  transition: all 0.2s ease;
}

.todo-list-enter-from {
  opacity: 0;
  transform: translateY(-4px);
}

.todo-list-leave-to {
  opacity: 0;
  transform: translateX(8px);
}

.todo-list-move {
  transition: transform 0.2s ease;
}
</style>
