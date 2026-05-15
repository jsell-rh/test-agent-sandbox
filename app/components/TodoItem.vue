<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import type { TodoResource } from '~/types/todo'
import { renderMarkdownInline } from '~/utils/markdown'

const props = defineProps<{
  todo: TodoResource
  /** True when this item is in edit mode. */
  isEditing: boolean
}>()

const emit = defineEmits<{
  /** User clicked the checkbox — request status toggle. */
  toggle: [id: string]
  /** User clicked the delete button. */
  delete: [id: string]
  /** User double-clicked the title — enter edit mode. */
  startEdit: [id: string]
  /** User confirmed the edit (Enter or blur). Empty string means delete intent. */
  saveEdit: [id: string, newTitle: string]
  /** User pressed Escape — cancel edit with no changes. */
  cancelEdit: [id: string]
}>()

// ---------------------------------------------------------------------------
// Edit mode state
// ---------------------------------------------------------------------------

const editValue = ref(props.todo.title)
const editInput = ref<HTMLInputElement>()

/** Flag to skip blur handler when Enter/Escape already committed the action. */
let _enterOrEscapeHandled = false

// When edit mode starts, focus the input and position cursor at end
watch(
  () => props.isEditing,
  async (editing) => {
    if (editing) {
      editValue.value = props.todo.title
      _enterOrEscapeHandled = false
      await nextTick()
      if (editInput.value) {
        editInput.value.focus()
        // Position cursor at end of text
        const len = editInput.value.value.length
        editInput.value.setSelectionRange(len, len)
      }
    }
  },
)

function handleEditKeydown(event: KeyboardEvent): void {
  if (event.key === 'Enter') {
    _enterOrEscapeHandled = true
    emit('saveEdit', props.todo.id, editValue.value.trim())
  }
  else if (event.key === 'Escape') {
    _enterOrEscapeHandled = true
    emit('cancelEdit', props.todo.id)
  }
}

function handleEditBlur(): void {
  if (_enterOrEscapeHandled) {
    _enterOrEscapeHandled = false
    return
  }
  emit('saveEdit', props.todo.id, editValue.value.trim())
}

// ---------------------------------------------------------------------------
// Markdown rendering
// ---------------------------------------------------------------------------

const renderedTitle = computed(() => renderMarkdownInline(props.todo.title))

// ---------------------------------------------------------------------------
// Checkbox ID for label association (accessibility)
// ---------------------------------------------------------------------------

const checkboxId = computed(() => `todo-checkbox-${props.todo.id}`)
</script>

<template>
  <li
    class="todo-item"
    :class="{
      'todo-item--completed': todo.status === 'completed',
      'todo-item--editing': isEditing,
    }"
  >
    <!-- View mode -->
    <template v-if="!isEditing">
      <div class="todo-view">
        <!-- Checkbox with associated label for accessibility -->
        <input
          :id="checkboxId"
          class="todo-checkbox"
          type="checkbox"
          :checked="todo.status === 'completed'"
          :aria-label="`Mark '${todo.title}' as ${todo.status === 'completed' ? 'active' : 'completed'}`"
          @change="emit('toggle', todo.id)"
        />
        <label
          :for="checkboxId"
          class="todo-checkbox-label"
          aria-hidden="true"
        />

        <!-- Title — double-click to enter edit mode -->
        <span
          class="todo-title"
          tabindex="0"
          role="button"
          :aria-label="`Edit: ${todo.title}`"
          @dblclick="emit('startEdit', todo.id)"
          @keydown.enter="emit('startEdit', todo.id)"
          v-html="renderedTitle"
        />

        <!-- Delete button (visible on hover via CSS) -->
        <button
          class="todo-delete"
          type="button"
          :aria-label="`Delete: ${todo.title}`"
          @click="emit('delete', todo.id)"
        >
          ×
        </button>
      </div>
    </template>

    <!-- Edit mode -->
    <template v-else>
      <input
        ref="editInput"
        v-model="editValue"
        class="todo-edit-input"
        type="text"
        :aria-label="`Editing: ${todo.title}. Press Enter to save, Escape to cancel.`"
        @keydown="handleEditKeydown"
        @blur="handleEditBlur"
      />
    </template>
  </li>
</template>

<style scoped>
.todo-item {
  position: relative;
  list-style: none;
  border-bottom: 1px solid var(--color-border);
}

.todo-item:last-child {
  border-bottom: none;
}

/* ----------------------------- View mode ---------------------------------- */

.todo-view {
  display: flex;
  align-items: center;
  padding: 0;
  min-height: 3.5rem;
}

/* Hide the native checkbox; use the custom label as the visual toggle */
.todo-checkbox {
  position: absolute;
  opacity: 0;
  width: 2.75rem;
  height: 100%;
  margin: 0;
  cursor: pointer;
  z-index: 1;
}

.todo-checkbox-label {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2.75rem;
  height: 3.5rem;
  flex-shrink: 0;
  cursor: pointer;
}

/* Custom checkbox ring */
.todo-checkbox-label::before {
  content: '';
  display: block;
  width: 1.375rem;
  height: 1.375rem;
  border: 2px solid var(--color-border-hover);
  border-radius: 50%;
  box-sizing: border-box;
  transition: border-color 0.2s, background 0.2s;
}

/* Checked state */
.todo-item--completed .todo-checkbox-label::before {
  background: var(--color-success);
  border-color: var(--color-success);
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 10 7'%3E%3Cpath d='M1 3.5L3.5 6 9 1' stroke='%23fff' stroke-width='1.8' fill='none' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: center;
  background-size: 0.75rem;
}

.todo-title {
  flex: 1;
  padding: 0.875rem 0.5rem 0.875rem 0;
  font-size: 1rem;
  color: var(--color-text);
  word-break: break-word;
  cursor: default;
  line-height: 1.5;
}

/* Completed todo: strike-through */
.todo-item--completed .todo-title {
  color: var(--color-text-muted);
  text-decoration: line-through;
}

/* Delete button: hidden until hover */
.todo-delete {
  opacity: 0;
  background: none;
  border: none;
  padding: 0 1rem;
  font-size: 1.5rem;
  line-height: 1;
  color: var(--color-danger);
  cursor: pointer;
  transition: opacity 0.15s;
  flex-shrink: 0;
}

.todo-item:hover .todo-delete,
.todo-item:focus-within .todo-delete {
  opacity: 1;
}

/* ----------------------------- Edit mode ---------------------------------- */

.todo-edit-input {
  width: 100%;
  padding: 0.875rem 0.875rem 0.875rem 3.5rem;
  font-size: 1rem;
  font-family: inherit;
  color: var(--color-text);
  background: var(--color-surface-elevated);
  border: none;
  border-top: 1px solid var(--color-brand-light);
  border-bottom: 1px solid var(--color-brand-light);
  outline: none;
  box-shadow: inset 0 -2px 0 var(--color-brand);
  box-sizing: border-box;
}
</style>
