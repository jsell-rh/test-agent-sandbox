<script setup lang="ts">
/**
 * TodoItem — renders a single todo with:
 *  - Checkbox for toggling active/completed status.
 *  - Title rendered as sanitised inline Markdown.
 *  - Double-click to enter inline edit mode.
 *  - Delete button (hover-visible).
 *
 * Edit mode:
 *  - Input pre-filled with the raw title text.
 *  - Enter or blur → emit update-title.
 *  - Escape → cancel without saving.
 *  - Empty title on submit → emit delete.
 */
import { ref, nextTick, computed, watch } from 'vue'
import type { Todo } from '~/types/todo'
import { renderMarkdownInline } from '~/utils/markdown'

const props = defineProps<{
  todo: Todo
  /** Whether this item is currently in inline edit mode. */
  editing: boolean
}>()

const emit = defineEmits<{
  (e: 'toggle'): void
  (e: 'update-title', newTitle: string): void
  (e: 'delete'): void
  (e: 'start-edit'): void
  (e: 'stop-edit'): void
}>()

// ── Local edit state ──────────────────────────────────────────────────────────

/** Draft value while editing. Initialised from todo.title when edit begins. */
const draft = ref('')
const editInput = ref<HTMLInputElement | null>(null)

/** Sync draft and focus the input whenever editing becomes active. */
watch(
  () => props.editing,
  async (nowEditing) => {
    if (nowEditing) {
      draft.value = props.todo.title
      await nextTick()
      editInput.value?.focus()
      editInput.value?.select()
    }
  },
  { immediate: true },
)

/** The title rendered as sanitised inline Markdown HTML. */
const titleHtml = computed(() => renderMarkdownInline(props.todo.title))

/** Checkbox id — ties <label> and <input> for accessibility. */
const checkboxId = computed(() => `todo-checkbox-${props.todo.id}`)

// ── Handlers ──────────────────────────────────────────────────────────────────

function startEdit(): void {
  // The watcher on `editing` handles draft init + focus when the parent
  // flips editing to true in response to this emit.
  emit('start-edit')
}

function submitEdit(): void {
  emit('update-title', draft.value)
  emit('stop-edit')
}

function cancelEdit(): void {
  emit('stop-edit')
}
</script>

<template>
  <li
    class="todo-item"
    :class="{
      'todo-item--completed': todo.status === 'completed',
      'todo-item--editing': editing,
    }"
    :data-testid="`todo-item-${todo.id}`"
  >
    <!-- View mode -->
    <div v-if="!editing" class="todo-item__view">
      <!-- Accessible checkbox -->
      <input
        :id="checkboxId"
        type="checkbox"
        class="todo-item__checkbox"
        :checked="todo.status === 'completed'"
        :aria-label="`Mark '${todo.title}' as ${todo.status === 'active' ? 'completed' : 'active'}`"
        @change="emit('toggle')"
      />

      <!-- Title — double-click enters edit mode -->
      <!-- eslint-disable-next-line vue/no-v-html -->
      <label
        :for="checkboxId"
        class="todo-item__label"
        @dblclick.prevent="startEdit"
      >
        <span
          class="todo-item__title markdown-content"
          :class="{ 'todo-item__title--done': todo.status === 'completed' }"
          v-html="titleHtml"
        />
      </label>

      <!-- Delete button -->
      <button
        class="todo-item__delete btn btn-danger"
        :aria-label="`Delete '${todo.title}'`"
        type="button"
        @click="emit('delete')"
      >
        <span aria-hidden="true">&times;</span>
      </button>
    </div>

    <!-- Edit mode -->
    <div v-else class="todo-item__edit">
      <input
        ref="editInput"
        v-model="draft"
        type="text"
        class="todo-item__edit-input"
        :aria-label="`Editing: ${todo.title}`"
        maxlength="500"
        @keydown.enter.prevent="submitEdit"
        @keydown.escape.prevent="cancelEdit"
        @blur="submitEdit"
      />
    </div>
  </li>
</template>

<style scoped>
.todo-item {
  display: flex;
  align-items: center;
  position: relative;
  border-bottom: 1px solid var(--color-border);
  min-height: 56px;
  transition: background-color var(--transition-fast);
}

.todo-item:last-child {
  border-bottom: none;
}

.todo-item:hover {
  background-color: var(--color-accent-light);
}

/* ── View mode layout ─────────────────────────────────────────────────────── */

.todo-item__view {
  display: flex;
  align-items: center;
  width: 100%;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-5);
}

/* ── Checkbox ─────────────────────────────────────────────────────────────── */

.todo-item__checkbox {
  flex-shrink: 0;
  width: 22px;
  height: 22px;
  border: 2px solid var(--color-border);
  border-radius: var(--radius-full);
  appearance: none;
  -webkit-appearance: none;
  cursor: pointer;
  background-color: var(--color-surface);
  transition: border-color var(--transition-fast), background-color var(--transition-fast);
  position: relative;
}

.todo-item__checkbox:checked {
  background-color: var(--color-checkbox);
  border-color: var(--color-checkbox);
}

.todo-item__checkbox:checked::after {
  content: '';
  position: absolute;
  left: 5px;
  top: 2px;
  width: 6px;
  height: 11px;
  border: 2px solid white;
  border-top: none;
  border-left: none;
  transform: rotate(45deg);
}

.todo-item__checkbox:hover:not(:checked) {
  border-color: var(--color-checkbox);
}

.todo-item__checkbox:focus-visible {
  outline: 2px solid var(--color-border-focus);
  outline-offset: 2px;
}

/* ── Label / title ────────────────────────────────────────────────────────── */

.todo-item__label {
  flex: 1;
  cursor: text;
  min-width: 0;
  /* Allow double-click to select text naturally, then enter edit mode */
}

.todo-item__title {
  display: block;
  word-break: break-word;
  font-size: var(--font-size-md);
  line-height: var(--line-height-relaxed);
  color: var(--color-text-primary);
  transition: color var(--transition-fast);
  user-select: none;
}

.todo-item__title--done {
  color: var(--color-completed-text);
  text-decoration: line-through;
}

/* ── Delete button ────────────────────────────────────────────────────────── */

.todo-item__delete {
  flex-shrink: 0;
  opacity: 0;
  width: 32px;
  height: 32px;
  padding: 0;
  font-size: var(--font-size-xl);
  line-height: 1;
  border-radius: var(--radius-md);
  transition: opacity var(--transition-fast), background-color var(--transition-fast);
}

.todo-item:hover .todo-item__delete,
.todo-item__delete:focus-visible {
  opacity: 1;
}

/* ── Edit mode ────────────────────────────────────────────────────────────── */

.todo-item__edit {
  width: 100%;
  padding: var(--space-2) var(--space-5);
}

.todo-item__edit-input {
  width: 100%;
  padding: var(--space-2) var(--space-3);
  font-size: var(--font-size-md);
  color: var(--color-text-primary);
  background-color: var(--color-surface);
  border: 2px solid var(--color-border-focus);
  border-radius: var(--radius-md);
  outline: none;
  box-shadow: inset 0 1px 3px rgb(0 0 0 / 0.06), 0 0 0 3px var(--color-accent-light);
  transition: border-color var(--transition-fast);
}

.todo-item__edit-input:focus {
  border-color: var(--color-accent);
}
</style>
