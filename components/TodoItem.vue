<script setup lang="ts">
/**
 * TodoItem — a single todo row.
 *
 * Spec behaviour:
 * - Checkbox toggles status (active ↔ completed) via PATCH with optimistic update.
 * - Title: double-click enters edit mode; supports full markdown rendering.
 * - Edit mode:
 *   - Input pre-filled with current title.
 *   - Enter OR blur → submit (PATCH title); clear editingTodoId on success.
 *   - Escape → cancel (restore original title, no API call).
 *   - Empty submission → DELETE the todo.
 * - Delete button ("×"): visible on hover; calls DELETE with optimistic removal.
 */
import { ref, computed, nextTick } from 'vue'
import { marked } from 'marked'
import { useTodos } from '~/composables/useTodos'
import type { TodoResource } from '~/types/todo'

const props = defineProps<{ todo: TodoResource }>()

const store = useTodos()

// Edit buffer — initialised when entering edit mode.
const editValue = ref(props.todo.title)
const editInputRef = ref<HTMLInputElement | null>(null)

const isEditing = computed(() => store.editingTodoId.value === props.todo.id)

/** Rendered markdown HTML for the todo title (inline markdown only). */
const renderedTitle = computed(() =>
  marked.parseInline(props.todo.title, { async: false }) as string,
)

function enterEditMode(): void {
  editValue.value = props.todo.title
  store.startEditing(props.todo.id)
  // Focus the input after Vue renders the edit field
  nextTick(() => {
    editInputRef.value?.focus()
    editInputRef.value?.select()
  })
}

async function submitEdit(): Promise<void> {
  if (!isEditing.value) return
  const success = await store.updateTitle(props.todo.id, editValue.value)
  if (success) {
    store.cancelEditing()
  }
}

function cancelEdit(): void {
  editValue.value = props.todo.title
  store.cancelEditing()
}

function handleEditKeydown(event: KeyboardEvent): void {
  if (event.key === 'Enter') {
    event.preventDefault()
    submitEdit()
  } else if (event.key === 'Escape') {
    cancelEdit()
  }
}

async function handleToggle(): Promise<void> {
  await store.toggleTodo(props.todo.id)
}

async function handleDelete(): Promise<void> {
  await store.deleteTodo(props.todo.id)
}
</script>

<template>
  <li
    class="todo-item"
    :class="{ completed: todo.status === 'completed', editing: isEditing }"
    data-testid="todo-item"
  >
    <div v-if="!isEditing" class="todo-view">
      <!-- Checkbox: associated label satisfies accessibility requirement -->
      <label class="todo-checkbox-label" :for="`toggle-${todo.id}`">
        <input
          :id="`toggle-${todo.id}`"
          type="checkbox"
          class="todo-checkbox"
          :checked="todo.status === 'completed'"
          :aria-label="`Mark &quot;${todo.title}&quot; as ${todo.status === 'active' ? 'completed' : 'active'}`"
          :data-testid="`checkbox-${todo.id}`"
          @change="handleToggle"
        />
        <span class="todo-toggle-visual" aria-hidden="true" />
      </label>

      <!-- Title: double-click to enter edit mode; renders markdown -->
      <span
        class="todo-title"
        :data-testid="`title-${todo.id}`"
        @dblclick="enterEditMode"
        v-html="renderedTitle"
      />

      <!-- Delete button: visible on hover via CSS -->
      <button
        class="todo-delete"
        type="button"
        :aria-label="`Delete &quot;${todo.title}&quot;`"
        :data-testid="`delete-${todo.id}`"
        @click="handleDelete"
      >
        ×
      </button>
    </div>

    <!-- Edit mode input -->
    <div v-else class="todo-edit-wrapper">
      <input
        ref="editInputRef"
        v-model="editValue"
        class="todo-edit-input"
        type="text"
        aria-label="Edit todo title"
        aria-live="polite"
        :data-testid="`edit-input-${todo.id}`"
        @keydown="handleEditKeydown"
        @blur="submitEdit"
      />
    </div>
  </li>
</template>
