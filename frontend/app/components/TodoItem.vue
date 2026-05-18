<script setup lang="ts">
import { renderMarkdownInlineSync } from '~/composables/useMarkdown'
import type { Todo } from '~/types/todo'

const props = defineProps<{
  todo: Todo
}>()

const { toggleTodo, deleteTodo, updateTitle, startEditing, cancelEditing, editingTodoId } =
  useTodos()

const isEditing = computed(() => editingTodoId.value === props.todo.id)
const editValue = ref('')
const editInputRef = ref<HTMLInputElement | null>(null)

function beginEdit() {
  editValue.value = props.todo.title
  startEditing(props.todo.id)
}

// Auto-focus the edit input whenever we enter edit mode
watch(isEditing, async (editing) => {
  if (editing) {
    await nextTick()
    editInputRef.value?.focus()
    editInputRef.value?.select()
  }
})

function handleEditKeydown(event: KeyboardEvent) {
  if (event.key === 'Enter') {
    commitEdit()
  } else if (event.key === 'Escape') {
    cancelEditing()
  }
}

async function commitEdit() {
  const title = editValue.value.trim()
  if (title === '') {
    // Spec: submitting empty string deletes the todo
    await deleteTodo(props.todo.id)
  } else {
    await updateTitle(props.todo.id, title)
  }
}

/**
 * Render inline markdown for the title.
 * DOMPurify-sanitised on the client; escaped plain text on SSR.
 */
const titleHtml = computed(() => renderMarkdownInlineSync(props.todo.title))

const isCompleted = computed(() => props.todo.status === 'completed')
</script>

<template>
  <li
    class="todo-item group"
    :class="{ 'opacity-60': isCompleted }"
    :data-testid="`todo-item-${todo.id}`"
  >
    <!-- Checkbox -->
    <button
      type="button"
      class="todo-checkbox"
      :class="{ checked: isCompleted }"
      role="checkbox"
      :aria-checked="isCompleted"
      :aria-label="
        isCompleted ? `Mark '${todo.title}' as active` : `Mark '${todo.title}' as completed`
      "
      @click="toggleTodo(todo.id)"
    >
      <svg
        v-if="isCompleted"
        class="w-3 h-3 text-white"
        viewBox="0 0 12 12"
        fill="currentColor"
        aria-hidden="true"
      >
        <path
          fill-rule="evenodd"
          d="M10.28 2.28a.75.75 0 0 0-1.06 0L4.5 7 2.78 5.28a.75.75 0 0 0-1.06 1.06l2.25 2.25a.75.75 0 0 0 1.06 0l5.25-5.25a.75.75 0 0 0 0-1.06Z"
        />
      </svg>
    </button>

    <!-- Title / Edit field -->
    <div class="flex-1 min-w-0">
      <!-- Edit input -->
      <input
        v-if="isEditing"
        ref="editInputRef"
        v-model="editValue"
        type="text"
        class="w-full text-sm font-medium text-slate-800 bg-white border border-brand-400
               rounded-md px-2 py-0.5 outline-none ring-2 ring-brand-200"
        :aria-label="`Edit title for: ${todo.title}`"
        @keydown="handleEditKeydown"
        @blur="commitEdit"
      />

      <!-- Title display (double-click to edit) -->
      <span
        v-else
        class="block min-w-0 text-sm font-medium cursor-pointer select-none"
        :class="isCompleted ? 'text-slate-400' : 'text-slate-800'"
        @dblclick="beginEdit"
      >
        <!-- Sanitised by DOMPurify (client) / escaped (SSR) — safe to use v-html -->
        <!-- eslint-disable-next-line vue/no-v-html -->
        <span
          class="prose prose-sm max-w-none"
          :class="{ 'line-through': isCompleted }"
          v-html="titleHtml"
        />
      </span>
    </div>

    <!-- Delete button — visible on hover via group-hover utility class -->
    <button
      type="button"
      class="btn-danger opacity-0 group-hover:opacity-100 transition-opacity duration-100
             flex-shrink-0 p-1 rounded-md hover:bg-red-50"
      :aria-label="`Delete todo: ${todo.title}`"
      @click="deleteTodo(todo.id)"
    >
      <svg class="w-4 h-4" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
        <path
          d="M5.28 4.22a.75.75 0 0 0-1.06 1.06L6.94 8l-2.72 2.72a.75.75 0 1 0 1.06 1.06L8 9.06l2.72 2.72a.75.75 0 1 0 1.06-1.06L9.06 8l2.72-2.72a.75.75 0 0 0-1.06-1.06L8 6.94 5.28 4.22Z"
        />
      </svg>
    </button>
  </li>
</template>
