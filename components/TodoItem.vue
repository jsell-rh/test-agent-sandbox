<template>
  <li
    class="group flex items-center gap-3 px-4 py-3 min-h-[56px] transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50"
    :class="{ 'opacity-60': todo.status === 'completed' && !isEditing }"
  >
    <!-- Checkbox with accessible label -->
    <label :for="`todo-checkbox-${todo.id}`" class="sr-only">
      {{ todo.status === 'active' ? 'Mark complete' : 'Mark active' }}: {{ todo.title }}
    </label>
    <input
      :id="`todo-checkbox-${todo.id}`"
      type="checkbox"
      :checked="todo.status === 'completed'"
      class="h-5 w-5 flex-shrink-0 rounded-full border-gray-300 dark:border-gray-600 text-indigo-500 cursor-pointer accent-indigo-500"
      @change="$emit('toggle', todo.id)"
    />

    <!-- Edit mode: input field -->
    <input
      v-if="isEditing"
      ref="editInputRef"
      v-model="editValue"
      type="text"
      class="flex-1 py-1 px-2 text-base text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-900 border border-indigo-400 dark:border-indigo-600 rounded outline-none shadow-sm"
      aria-label="Edit todo"
      @keydown.enter.prevent="submitEdit"
      @keydown.escape="$emit('edit-cancel')"
      @blur="handleBlur"
    />

    <!-- Display mode: rendered markdown title -->
    <div
      v-else
      data-testid="todo-title"
      class="flex-1 min-w-0 cursor-default select-none"
      :class="{
        'line-through text-gray-400 dark:text-gray-600': todo.status === 'completed',
        'text-gray-700 dark:text-gray-300': todo.status === 'active',
      }"
      @dblclick="$emit('edit-start', todo.id)"
    >
      <MarkdownContent :content="todo.title" />
    </div>

    <!-- Delete button — visible on hover / focus -->
    <button
      class="flex-shrink-0 text-xl leading-none text-gray-300 dark:text-gray-700 hover:text-red-500 dark:hover:text-red-400 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity"
      :aria-label="`Delete todo: ${todo.title}`"
      @click="$emit('delete', todo.id)"
    >
      ×
    </button>
  </li>
</template>

<script setup lang="ts">
import type { Todo } from '~/types/todo'

const props = defineProps<{
  todo: Todo
  /** Whether this specific item is in edit mode. */
  isEditing: boolean
}>()

const emit = defineEmits<{
  toggle: [id: string]
  delete: [id: string]
  'edit-start': [id: string]
  /** title is the new value; may be empty (parent handles blank → delete). */
  'edit-submit': [title: string]
  'edit-cancel': []
}>()

const editInputRef = ref<HTMLInputElement | null>(null)
const editValue = ref('')
// Guard against Enter + blur double-firing
let editSubmitted = false

watch(
  () => props.isEditing,
  (editing) => {
    if (editing) {
      editSubmitted = false
      editValue.value = props.todo.title
      nextTick(() => {
        editInputRef.value?.focus()
        editInputRef.value?.select()
      })
    }
  },
  { immediate: true },
)

const submitEdit = () => {
  if (editSubmitted) return
  editSubmitted = true
  emit('edit-submit', editValue.value)
}

const handleBlur = () => {
  if (!editSubmitted) {
    submitEdit()
  }
}
</script>
