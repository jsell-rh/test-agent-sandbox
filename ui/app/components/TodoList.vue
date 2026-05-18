<!--
  TodoList — renders the filtered list of todos or an empty-state message.
-->
<script setup lang="ts">
import type { Todo, FilterCriteria } from '~/types'

const props = defineProps<{
  todos: Todo[]
  currentFilter: FilterCriteria
  editingTodoId: string | null
}>()

const emit = defineEmits<{
  toggle: [todo: Todo]
  startEdit: [todoId: string]
  submitEdit: [todo: Todo, newTitle: string]
  cancelEdit: []
  delete: [todoId: string]
}>()

const EMPTY_STATE_MESSAGES: Record<FilterCriteria, string> = {
  all: 'No todos yet. Add one above!',
  active: 'No active todos. Great work!',
  completed: 'No completed todos yet.',
}

const emptyMessage = computed(() => EMPTY_STATE_MESSAGES[props.currentFilter])
</script>

<template>
  <section aria-label="Todo list">
    <!-- Empty state -->
    <div
      v-if="todos.length === 0"
      class="flex flex-col items-center justify-center py-12 text-center"
      aria-live="polite"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        class="size-10 text-gray-200 mb-3"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.5"
        aria-hidden="true"
      >
        <path d="M9 11l3 3L22 4" />
        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
      </svg>
      <p class="text-sm text-gray-400">{{ emptyMessage }}</p>
    </div>

    <!-- Todo items -->
    <ul
      v-else
      id="todo-list"
      role="list"
      aria-label="Todos"
      class="divide-y divide-gray-100"
    >
      <TransitionGroup name="todo-item" tag="div">
        <TodoItem
          v-for="todo in todos"
          :key="todo.id"
          :todo="todo"
          :is-editing="editingTodoId === todo.id"
          @toggle="emit('toggle', $event)"
          @start-edit="emit('startEdit', $event)"
          @submit-edit="(todo, title) => emit('submitEdit', todo, title)"
          @cancel-edit="emit('cancelEdit')"
          @delete="emit('delete', $event)"
        />
      </TransitionGroup>
    </ul>
  </section>
</template>

<style scoped>
.todo-item-enter-active,
.todo-item-leave-active {
  transition:
    opacity 0.2s ease,
    transform 0.2s ease,
    max-height 0.2s ease;
  overflow: hidden;
  max-height: 4rem;
}
.todo-item-enter-from,
.todo-item-leave-to {
  opacity: 0;
  transform: translateY(-0.25rem);
  max-height: 0;
}
</style>
