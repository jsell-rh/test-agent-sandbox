<!--
  TodoItem — a single todo row.

  Display mode:
    - Checkbox: toggles status (optimistic).
    - Title: rendered as markdown via v-html (inline).  Double-click enters edit mode.
    - Delete button: visible on hover / focus-within.  Calls DELETE /api/todos/:id.

  Edit mode (editingTodoId === todo.id):
    - Pre-filled text input with current title (raw markdown string).
    - Enter / blur: submit → PATCH /api/todos/:id { title }.
    - Escape: cancel (restore original title, no API call).
    - Submitting an empty string: DELETE /api/todos/:id.
-->
<script setup lang="ts">
import type { Todo } from '~/types'

const props = defineProps<{
  todo: Todo
  isEditing: boolean
}>()

const emit = defineEmits<{
  toggle: [todo: Todo]
  startEdit: [todoId: string]
  submitEdit: [todo: Todo, newTitle: string]
  cancelEdit: []
  delete: [todoId: string]
}>()

const { renderInline } = useMarkdown()

// Edit input ref and value
const editInputRef = ref<HTMLInputElement | null>(null)
const editValue = ref('')

// When entering edit mode, pre-fill and focus the input
watch(
  () => props.isEditing,
  async (editing) => {
    if (editing) {
      editValue.value = props.todo.title
      await nextTick()
      editInputRef.value?.focus()
      editInputRef.value?.select()
    }
  },
  { immediate: true },
)

// Track client-side hydration to enable markdown rendering
const isClient = ref(false)
onMounted(() => { isClient.value = true })

// Rendered markdown (client-side only — SSR falls back to plain text)
const renderedTitle = computed(() =>
  isClient.value ? renderInline(props.todo.title) : props.todo.title,
)

// ── Handlers ──────────────────────────────────────────────────────────────────

function handleCheckboxChange(): void {
  emit('toggle', props.todo)
}

function handleDoubleClick(): void {
  emit('startEdit', props.todo.id)
}

function handleEditKeydown(event: KeyboardEvent): void {
  if (event.key === 'Enter') {
    event.preventDefault()
    submitEdit()
  } else if (event.key === 'Escape') {
    emit('cancelEdit')
  }
}

function handleEditBlur(): void {
  if (props.isEditing) {
    submitEdit()
  }
}

function submitEdit(): void {
  const newTitle = editValue.value.trim()
  emit('submitEdit', props.todo, newTitle)
}

function handleDelete(): void {
  emit('delete', props.todo.id)
}
</script>

<template>
  <li
    class="group flex items-center gap-3 px-4 py-3 border-b border-gray-100 last:border-b-0 transition-colors duration-100 hover:bg-gray-50/60"
    :class="{ 'bg-gray-50/40': isEditing }"
    :data-todo-id="todo.id"
    :data-status="todo.status"
  >
    <!-- Checkbox -->
    <div class="shrink-0 flex items-center" :class="{ 'opacity-0 pointer-events-none': isEditing }">
      <input
        :id="`todo-checkbox-${todo.id}`"
        type="checkbox"
        :checked="todo.status === 'completed'"
        :aria-label="`Mark &quot;${todo.title}&quot; as ${todo.status === 'active' ? 'completed' : 'active'}`"
        class="
          size-4 rounded border-gray-300 cursor-pointer
          text-brand-600 focus:ring-brand-500/30 focus:ring-2
          transition-colors
        "
        @change="handleCheckboxChange"
      />
    </div>

    <!-- Title (display mode) / Edit input -->
    <div class="flex-1 min-w-0">
      <!-- Edit mode input -->
      <input
        v-if="isEditing"
        ref="editInputRef"
        v-model="editValue"
        type="text"
        class="
          w-full rounded border border-brand-400 px-2 py-1
          text-gray-900 text-sm bg-white
          focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 focus:outline-none
        "
        :aria-label="`Edit todo: ${todo.title}`"
        aria-live="polite"
        @keydown="handleEditKeydown"
        @blur="handleEditBlur"
      />

      <!-- Display mode — markdown rendered title -->
      <label
        v-else
        :for="`todo-checkbox-${todo.id}`"
        class="block cursor-pointer select-none text-sm leading-snug todo-markdown"
        :class="
          todo.status === 'completed'
            ? 'text-gray-400 line-through decoration-gray-300'
            : 'text-gray-800'
        "
        :title="`Double-click to edit`"
        @dblclick="handleDoubleClick"
      >
        <!-- Client: rendered markdown; Server / SSR: raw text -->
        <!-- eslint-disable-next-line vue/no-v-html -->
        <span v-if="isClient" v-html="renderedTitle" />
        <span v-else>{{ todo.title }}</span>
      </label>
    </div>

    <!-- Delete button (visible on hover / focus-within) -->
    <button
      v-if="!isEditing"
      type="button"
      class="
        shrink-0 size-6 flex items-center justify-center rounded
        text-gray-300 hover:text-red-500 hover:bg-red-50
        opacity-0 group-hover:opacity-100 focus:opacity-100
        transition-all duration-150
      "
      :aria-label="`Delete &quot;${todo.title}&quot;`"
      tabindex="0"
      @click="handleDelete"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        class="size-4"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        aria-hidden="true"
      >
        <line x1="18" y1="6" x2="6" y2="18" />
        <line x1="6" y1="6" x2="18" y2="18" />
      </svg>
    </button>
  </li>
</template>
