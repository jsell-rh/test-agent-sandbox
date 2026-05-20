<template>
  <ul
    class="divide-y divide-gray-100 dark:divide-gray-800"
    role="list"
    aria-label="Todo list"
  >
    <TodoItem
      v-for="todo in todos"
      :key="todo.id"
      :todo="todo"
      :is-editing="editingTodoId === todo.id"
      @toggle="$emit('toggle', $event)"
      @delete="$emit('delete', $event)"
      @edit-start="$emit('edit-start', $event)"
      @edit-submit="$emit('edit-submit', todo.id, $event)"
      @edit-cancel="$emit('edit-cancel')"
    />
  </ul>
</template>

<script setup lang="ts">
import type { Todo } from '~/types/todo'

defineProps<{
  todos: Todo[]
  editingTodoId: string | null
}>()

defineEmits<{
  toggle: [id: string]
  delete: [id: string]
  'edit-start': [id: string]
  'edit-submit': [id: string, title: string]
  'edit-cancel': []
}>()
</script>
