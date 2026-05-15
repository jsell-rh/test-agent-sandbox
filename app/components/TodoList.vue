<script setup lang="ts">
import type { TodoResource } from '~/types/todo'

defineProps<{
  todos: TodoResource[]
  editingTodoId: string | null
}>()

const emit = defineEmits<{
  toggle: [id: string]
  delete: [id: string]
  startEdit: [id: string]
  saveEdit: [id: string, newTitle: string]
  cancelEdit: [id: string]
}>()
</script>

<template>
  <ol class="todo-list" aria-label="Todo items">
    <TodoItem
      v-for="todo in todos"
      :key="todo.id"
      :todo="todo"
      :is-editing="editingTodoId === todo.id"
      @toggle="(id) => emit('toggle', id)"
      @delete="(id) => emit('delete', id)"
      @start-edit="(id) => emit('startEdit', id)"
      @save-edit="(id, title) => emit('saveEdit', id, title)"
      @cancel-edit="(id) => emit('cancelEdit', id)"
    />
  </ol>
</template>

<style scoped>
.todo-list {
  margin: 0;
  padding: 0;
}
</style>
