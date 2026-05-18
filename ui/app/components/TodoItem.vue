<script setup lang="ts">
import type { Todo } from '~/types/todo'

const props = defineProps<{
  todo: Todo
  isEditing: boolean
}>()

const emit = defineEmits<{
  toggle: []
  editStart: []
  editCommit: [newTitle: string]
  editCancel: []
  delete: []
}>()

const { renderMarkdown } = useMarkdown()

const editValue = ref(props.todo.title)
const editInputRef = ref<HTMLInputElement | null>(null)

// Sync edit input value when editing starts
watch(
  () => props.isEditing,
  (editing) => {
    if (editing) {
      editValue.value = props.todo.title
      nextTick(() => {
        editInputRef.value?.focus()
        editInputRef.value?.select()
      })
    }
  },
)

function handleEditKeydown(event: KeyboardEvent): void {
  if (event.key === 'Enter') {
    emit('editCommit', editValue.value.trim())
  } else if (event.key === 'Escape') {
    emit('editCancel')
  }
}

function handleEditBlur(): void {
  if (props.isEditing) {
    emit('editCommit', editValue.value.trim())
  }
}

const titleHtml = computed(() => renderMarkdown(props.todo.title))
</script>

<template>
  <li
    class="
      group flex items-center gap-3 px-4 py-3
      hover:bg-gray-50 dark:hover:bg-gray-800/50
      transition-colors relative
    "
    :class="{ 'bg-gray-50 dark:bg-gray-800/50': isEditing }"
  >
    <!-- Checkbox -->
    <label class="flex-shrink-0 flex items-center" :for="`todo-${todo.id}`">
      <input
        :id="`todo-${todo.id}`"
        type="checkbox"
        :checked="todo.status === 'completed'"
        class="
          w-5 h-5 rounded-full border-2
          border-gray-300 dark:border-gray-600
          checked:bg-blue-500 checked:border-blue-500
          focus:ring-2 focus:ring-blue-500 focus:ring-offset-1
          cursor-pointer transition-colors
          appearance-none
        "
        :aria-label="`Mark '${todo.title}' as ${todo.status === 'active' ? 'completed' : 'active'}`"
        @change="emit('toggle')"
      />
    </label>

    <!-- Title / Edit input -->
    <div class="flex-1 min-w-0">
      <!-- Edit mode -->
      <input
        v-if="isEditing"
        ref="editInputRef"
        v-model="editValue"
        type="text"
        class="
          w-full bg-white dark:bg-gray-900
          border border-blue-400 dark:border-blue-500
          rounded px-2 py-0.5
          text-gray-800 dark:text-gray-100 text-base
          focus:outline-none focus:ring-2 focus:ring-blue-500
        "
        aria-label="Edit todo title"
        @keydown="handleEditKeydown"
        @blur="handleEditBlur"
      />

      <!-- Display mode -->
      <!-- eslint-disable-next-line vue/no-v-html -->
      <span
        v-else
        class="todo-title block truncate cursor-pointer text-base select-text"
        :class="todo.status === 'completed' ? 'todo-title--completed' : 'text-gray-800 dark:text-gray-100'"
        role="button"
        tabindex="0"
        :aria-label="`Edit todo: ${todo.title}`"
        v-html="titleHtml"
        @dblclick="emit('editStart')"
        @keydown.enter="emit('editStart')"
      />
    </div>

    <!-- Delete button (visible on hover / focus-within) -->
    <button
      class="
        flex-shrink-0 p-1 rounded
        text-gray-300 dark:text-gray-600
        hover:text-red-500 dark:hover:text-red-400
        opacity-0 group-hover:opacity-100 focus:opacity-100
        transition-opacity
      "
      aria-label="Delete todo"
      type="button"
      @click="emit('delete')"
    >
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
      </svg>
    </button>
  </li>
</template>

<style scoped>
/* Custom checkbox: filled circle when checked */
input[type="checkbox"] {
  background-image: none;
}

input[type="checkbox"]:checked {
  background-image: url("data:image/svg+xml,%3csvg viewBox='0 0 16 16' fill='white' xmlns='http://www.w3.org/2000/svg'%3e%3cpath d='M12.207 4.793a1 1 0 010 1.414l-5 5a1 1 0 01-1.414 0l-2-2a1 1 0 011.414-1.414L6.5 9.086l4.293-4.293a1 1 0 011.414 0z'/%3e%3c/svg%3e");
}
</style>
