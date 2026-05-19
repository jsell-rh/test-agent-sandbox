<script setup lang="ts">
/**
 * TodoItem — represents a single Todo in the list.
 *
 * View mode:
 *   - Labelled checkbox: toggles status via @toggle event.
 *   - Title text (rendered as safe inline Markdown): double-click → edit mode.
 *   - Hover/focus-revealed delete button.
 *
 * Edit mode (when `editing` prop is true):
 *   - Text input pre-filled with the current title.
 *   - Enter / blur  → @submit-edit with the current input value.
 *   - Escape        → @cancel-edit (no change).
 *   - Blank submit  → @submit-edit with '' (parent deletes the todo).
 *
 * Accessibility:
 *   - Checkbox has an associated <label> via `for`/`id` (plus aria-label).
 *   - Edit input has `role="textbox"` and `aria-label` to announce edit mode.
 *   - Delete button has a descriptive `aria-label`.
 */

import type { Todo } from '~/composables/useTodos'
import { renderInlineMarkdown } from '~/utils/markdown'

// ── Props & emits ─────────────────────────────────────────────────────────────

const props = defineProps<{
  todo: Todo
  /** True when this item is in edit mode. */
  editing: boolean
}>()

const emit = defineEmits<{
  /** User clicked the checkbox — toggle active ↔ completed. */
  toggle: []
  /** User clicked the delete button (or submitted blank in edit mode). */
  delete: []
  /** User double-clicked the title — enter edit mode. */
  startEdit: []
  /** User pressed Enter or blurred the edit field. Payload: new title string. */
  submitEdit: [title: string]
  /** User pressed Escape in edit mode — cancel without saving. */
  cancelEdit: []
}>()

// ── Edit-mode state ───────────────────────────────────────────────────────────

/** Local copy of the title for the edit input. */
const editTitle = ref(props.todo.title)

/** Ref to the edit <input> so we can focus it when entering edit mode. */
const editInput = ref<HTMLInputElement | null>(null)

/**
 * Guard flag to prevent the blur handler from emitting a second submitEdit
 * immediately after the Enter keydown handler has already emitted it.
 * (Some browsers fire blur synchronously when Enter is pressed on an input.)
 */
const submitFiredByKeydown = ref(false)

/** When editing begins, reset the local copy and focus the input. */
watch(
  () => props.editing,
  async (isEditing) => {
    if (isEditing) {
      editTitle.value = props.todo.title
      submitFiredByKeydown.value = false
      await nextTick()
      editInput.value?.focus()
      editInput.value?.select()
    }
  },
)

// ── Edit-mode handlers ────────────────────────────────────────────────────────

function handleEditKeydown(event: KeyboardEvent): void {
  if (event.key === 'Enter') {
    event.preventDefault()
    submitFiredByKeydown.value = true
    emit('submitEdit', editTitle.value)
  } else if (event.key === 'Escape') {
    submitFiredByKeydown.value = true // prevent any pending blur from submitting
    emit('cancelEdit')
  }
}

/**
 * Blur handler: submit only if Enter has NOT already triggered submission.
 * This prevents duplicate submits when pressing Enter causes an input blur.
 */
function handleEditBlur(): void {
  if (props.editing && !submitFiredByKeydown.value) {
    emit('submitEdit', editTitle.value)
  }
}

// ── Checkbox unique ID (for label association) ────────────────────────────────
const checkboxId = `todo-checkbox-${props.todo.id}`
</script>

<template>
  <li
    class="group relative flex items-center border-b border-gray-100 last:border-0"
    :class="{ 'opacity-60': todo.status === 'completed' }"
  >
    <!-- ── Edit mode ─────────────────────────────────────────────────────── -->
    <template v-if="editing">
      <div class="flex-1 px-4 py-2">
        <input
          :id="`edit-${todo.id}`"
          ref="editInput"
          v-model="editTitle"
          type="text"
          role="textbox"
          aria-label="Edit todo title"
          aria-multiline="false"
          class="
            w-full rounded border border-rose-300 px-3 py-2 text-lg text-gray-700
            outline-none focus:ring-2 focus:ring-rose-200
          "
          @keydown="handleEditKeydown"
          @blur="handleEditBlur"
        />
      </div>
    </template>

    <!-- ── View mode ─────────────────────────────────────────────────────── -->
    <template v-else>
      <!-- Checkbox with associated label (a11y: label wraps the input) -->
      <label
        :for="checkboxId"
        class="flex cursor-pointer items-center py-4 pl-4 pr-2"
      >
        <input
          :id="checkboxId"
          type="checkbox"
          :checked="todo.status === 'completed'"
          :aria-label="`Mark '${todo.title}' as ${todo.status === 'active' ? 'completed' : 'active'}`"
          class="h-5 w-5 cursor-pointer accent-rose-400"
          @change="$emit('toggle')"
        />
      </label>

      <!-- Title: safe inline Markdown rendered via v-html.
           tabindex="0" + keydown handlers ensure keyboard users can enter
           edit mode without a mouse (NFR: all actions reachable via keyboard).
           Enter and F2 are standard "activate / edit" keys. -->
      <span
        class="
          flex-1 cursor-pointer select-none py-4 pr-4 text-lg text-gray-700
          prose prose-sm max-w-none
          focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-300
        "
        :class="{ 'text-gray-400 line-through': todo.status === 'completed' }"
        tabindex="0"
        :aria-label="`${todo.title} — press Enter or F2 to edit`"
        @dblclick="$emit('startEdit')"
        @keydown.enter.prevent="$emit('startEdit')"
        @keydown.f2="$emit('startEdit')"
        v-html="renderInlineMarkdown(todo.title)"
      />

      <!-- Delete button (visible on hover / keyboard focus) -->
      <button
        class="
          absolute right-3 top-1/2 -translate-y-1/2
          text-xl text-rose-300 opacity-0 transition-opacity
          hover:text-rose-500 group-hover:opacity-100
          focus:outline-none focus-visible:opacity-100 focus-visible:ring-2
          focus-visible:ring-rose-300
        "
        :aria-label="`Delete todo: ${todo.title}`"
        tabindex="0"
        @click="$emit('delete')"
      >
        ×
      </button>
    </template>
  </li>
</template>
