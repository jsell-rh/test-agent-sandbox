<script setup lang="ts">
/**
 * TodoItem — individual Todo item component (specs/interface.spec.md)
 *
 * Displays a single Todo with:
 *  - Checkbox: toggle status (active ↔ completed)
 *  - Title: rendered as Markdown (inline); double-click enters edit mode
 *  - Delete button: visible on hover
 *  - Edit mode: text input pre-filled with current title
 *    - Enter / blur  → emit edit-submit(newTitle)
 *    - Escape        → emit edit-cancel
 *    - Empty submit  → emit edit-submit('') (parent treats as delete)
 *
 * Race-condition guard:
 *   `@blur` on the edit input would fire when the input is removed from DOM
 *   (e.g. after Enter or Escape causes the parent to unmount it). The
 *   `_pendingKeyboardAction` flag suppresses the blur-triggered submit in
 *   those cases, preventing double-submit on Enter and spurious submit on Escape.
 *
 * This component is intentionally stateless w.r.t. the todo data:
 *   - All data flows in via props (todo, isEditing).
 *   - All mutations flow out via emits.
 *   - The parent (index.vue / useTodos) owns the state machine.
 */

import { ref, computed, watch, nextTick } from 'vue'
import { marked } from 'marked'
import { FILTER_ACTIVE, FILTER_COMPLETED } from '../composables/useTodos'
import { KEY_ENTER, KEY_ESCAPE } from '~/utils/keyboard'
import type { TodoResource } from '../composables/useTodos'

// ---------------------------------------------------------------------------
// Props & Emits
// ---------------------------------------------------------------------------

const props = defineProps<{
  /** The Todo resource to display. */
  todo: TodoResource
  /** When true, the edit input is shown instead of the title. */
  isEditing: boolean
}>()

const emit = defineEmits<{
  /** User clicked the checkbox — parent should call toggleTodo(todo.id). */
  toggle: []
  /** User clicked the delete button — parent should call deleteTodo(todo.id). */
  delete: []
  /** User double-clicked the title — parent should call startEditing(todo.id). */
  'edit-start': []
  /**
   * User submitted the edit field.
   * If newTitle is empty string, parent should call deleteTodo(todo.id).
   * Otherwise, parent should call updateTodoTitle(todo.id, newTitle).
   */
  'edit-submit': [newTitle: string]
  /** User pressed Escape — parent should call cancelEditing(). */
  'edit-cancel': []
}>()

// ---------------------------------------------------------------------------
// Checkbox id (unique per instance for accessible label association)
// ---------------------------------------------------------------------------

const checkboxId = computed(() => `todo-checkbox-${props.todo.id}`)

// ---------------------------------------------------------------------------
// Markdown rendering
// ---------------------------------------------------------------------------

/**
 * Escape `<` and `>` to prevent raw HTML tags from being interpreted by
 * `marked` or the browser via `v-html`.
 *
 * Only angle brackets are escaped — NOT `&` — because `marked` already
 * escapes `&` in text nodes during rendering (double-escaping `&` would
 * produce incorrect output such as `&amp;amp;`).
 *
 * Markdown syntax (*, _, `, [], ()) does not use `<` or `>`, so pre-escaping
 * angle brackets does not affect bold, italic, inline code, or link rendering.
 */
function escapeAngleBrackets(text: string): string {
  return text.replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

/**
 * Render the todo title as inline Markdown HTML.
 *
 * Uses marked.parseInline() to produce inline elements only (bold, italic,
 * code, links) — no block-level wrapping tags (e.g. <p>). This keeps the
 * title visually correct within a list item.
 *
 * Security:
 *  - `marked` v15 passes raw HTML tags through without escaping.
 *    We pre-escape `<` and `>` so that any HTML in the title renders as
 *    visible text rather than executable markup.
 *  - Additionally strip `javascript:` protocol from link hrefs as
 *    defence-in-depth against crafted link XSS.
 */
const renderedTitle = computed<string>(() => {
  // Pre-escape angle brackets to neutralise raw HTML injection via v-html.
  const safe = escapeAngleBrackets(props.todo.title)
  // { async: false } ensures the return type is statically `string`
  const raw = marked.parseInline(safe, { async: false })
  // Strip javascript: protocol from links (defence-in-depth against XSS)
  return raw.replace(/href\s*=\s*["']javascript:[^"']*["']/gi, 'href="#"')
})

// ---------------------------------------------------------------------------
// Edit mode local state
// ---------------------------------------------------------------------------

/**
 * Local edit buffer — holds the text the user is currently typing.
 *
 * Initialised (and re-initialised) from props.todo.title each time
 * isEditing becomes true. Discarded on cancel.
 */
const editText = ref(props.todo.title)

/** Reference to the edit <input> element — used to auto-focus on edit start. */
const editInput = ref<HTMLInputElement | null>(null)

/**
 * Guard flag — set to true when a keyboard action (Enter/Escape) has already
 * handled the edit outcome. Prevents the subsequent @blur event (which fires
 * when the input is removed from the DOM) from triggering a spurious second
 * `edit-submit` after Enter, or an unwanted `edit-submit` after Escape.
 */
let _pendingKeyboardAction = false

/**
 * Sync editText with the current todo title whenever edit mode is entered.
 *
 * This ensures that if the title was updated by another action while another
 * todo was being edited, the edit buffer starts from the latest value.
 */
watch(
  () => props.isEditing,
  (entering) => {
    if (entering) {
      editText.value = props.todo.title
      _pendingKeyboardAction = false
      nextTick(() => editInput.value?.focus())
    }
  },
  { immediate: true },
)

// ---------------------------------------------------------------------------
// Edit mode handlers
// ---------------------------------------------------------------------------

/**
 * Submit the edit (keyboard path: Enter key).
 *
 * Trims the input. If the result is empty, emits edit-submit('') — the
 * parent interprets this as a delete command (spec § UI State Machine).
 */
function _submitEdit(): void {
  _pendingKeyboardAction = true
  const trimmed = editText.value.trim()
  emit('edit-submit', trimmed)
}

function handleEditKeydown(event: KeyboardEvent): void {
  if (event.key === KEY_ENTER) {
    _submitEdit()
  }
  else if (event.key === KEY_ESCAPE) {
    _pendingKeyboardAction = true
    emit('edit-cancel')
  }
}

/**
 * Handle blur on the edit input.
 *
 * Skipped when a keyboard action has already handled the edit — this prevents
 * the DOM-removal blur (caused by parent removing the input after Enter/Escape)
 * from emitting a second `edit-submit`.
 */
function handleBlur(): void {
  if (_pendingKeyboardAction) {
    // A keyboard action (Enter/Escape) already handled this edit session.
    // This blur fires because the input was removed from the DOM after the
    // keyboard action; suppress it to prevent a duplicate emit.
    _pendingKeyboardAction = false
    return
  }
  const trimmed = editText.value.trim()
  emit('edit-submit', trimmed)
}
</script>

<template>
  <li
    data-testid="todo-item"
    class="todo-item"
    :class="{ [FILTER_COMPLETED]: todo.status === FILTER_COMPLETED }"
  >
    <!-- Checkbox + label — associated via id/for for accessibility -->
    <input
      :id="checkboxId"
      data-testid="todo-checkbox"
      type="checkbox"
      class="todo-checkbox"
      :checked="todo.status === FILTER_COMPLETED"
      @change="emit('toggle')"
    >
    <label :for="checkboxId" class="todo-label-sr">Toggle {{ todo.title }}</label>

    <!-- View mode: title with markdown rendering -->
    <span
      v-if="!isEditing"
      data-testid="todo-title"
      class="todo-title"
      :class="{ [FILTER_COMPLETED]: todo.status === FILTER_COMPLETED }"
      role="button"
      tabindex="0"
      @dblclick="emit('edit-start')"
      @keydown.enter="emit('edit-start')"
      v-html="renderedTitle"
    />

    <!-- Edit mode: text input -->
    <input
      v-else
      ref="editInput"
      v-model="editText"
      data-testid="todo-edit-input"
      type="text"
      class="todo-edit-input"
      :aria-label="`Edit todo: ${todo.title}`"
      @keydown="handleEditKeydown"
      @blur="handleBlur"
    >

    <!-- Delete button — aria-label includes the todo title so screen-reader
         users can distinguish which specific item will be deleted. -->
    <button
      data-testid="todo-delete"
      class="todo-delete"
      type="button"
      :aria-label="`Delete todo: ${todo.title}`"
      @click="emit('delete')"
    >
      ×
    </button>
  </li>
</template>

<style scoped>
.todo-item {
  display: flex;
  align-items: center;
  padding: 1rem;
  border-bottom: 1px solid #ededed;
  position: relative;
}

.todo-item.completed .todo-title {
  text-decoration: line-through;
  color: #d9d9d9;
}

.todo-checkbox {
  margin: 0 0.75rem 0 0;
  flex-shrink: 0;
  width: 1.25rem;
  height: 1.25rem;
  cursor: pointer;
}

/* Visually-hidden label — readable by screen readers, invisible in the UI.
   The checkbox is already visually obvious; the label provides the text alternative. */
.todo-label-sr {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.todo-title {
  flex: 1;
  word-break: break-word;
  cursor: default;
}

.todo-title:focus-visible {
  outline: 2px solid #4a90e2;
  border-radius: 2px;
}

.todo-edit-input {
  flex: 1;
  padding: 0.4rem 0.5rem;
  border: 1px solid #999;
  border-radius: 4px;
  font-size: 1rem;
  font-family: inherit;
  box-shadow: inset 0 -1px 5px 0 rgba(0, 0, 0, 0.2);
}

.todo-delete {
  display: none;
  margin-left: 0.5rem;
  padding: 0 0.25rem;
  background: none;
  border: none;
  color: #cc9a9a;
  font-size: 1.5rem;
  line-height: 1;
  cursor: pointer;
  flex-shrink: 0;
}

.todo-delete:hover {
  color: #af5b5e;
}

/* Reveal delete button on item hover */
.todo-item:hover .todo-delete,
.todo-item:focus-within .todo-delete {
  display: block;
}
</style>
