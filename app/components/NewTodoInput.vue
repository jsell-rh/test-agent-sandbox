<script setup lang="ts">
/**
 * NewTodoInput.vue — New Todo Input component.
 *
 * Spec (specs/interface.spec.md — UI Application Layer > New Todo Input):
 *   - Text field with placeholder "What needs to be done?"
 *   - Enter key: calls `createTodo` prop with the trimmed title.
 *       On success: clears the input.
 *       On failure: leaves input unchanged; emits 'error' with the message.
 *   - Escape key: clears the input without any API call.
 *
 * `createTodo` is received as a prop so the parent page (index.vue) controls
 * the shared todos[] state via useTodos(). This avoids a second useTodos()
 * instance with isolated reactive state.
 */

import { ref } from 'vue'
import { KEY_ENTER, KEY_ESCAPE } from '~/utils/keyboard'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const FALLBACK_CREATE_ERROR = 'Failed to create todo'

/**
 * Maximum title length — mirrors TodoTitle.MAX_LENGTH on the server
 * (server/domain/value-objects/TodoTitle.ts).
 *
 * Duplicated here because client components cannot import server-only modules
 * across the Nuxt server/client boundary. If the server-side limit changes,
 * this constant must be updated to match.
 */
const MAX_TITLE_LENGTH = 500

// ---------------------------------------------------------------------------
// Props & emits
// ---------------------------------------------------------------------------

const props = defineProps<{
  /** Bound to useTodos().createTodo — calls POST /api/todos and prepends to todos[]. */
  createTodo: (title: string) => Promise<void>
}>()

const emit = defineEmits<{
  /** Emitted when the API call fails. The parent handles display (future task). */
  (e: 'error', message: string): void
}>()

// ---------------------------------------------------------------------------
// Local state
// ---------------------------------------------------------------------------

const inputTitle = ref('')

// ---------------------------------------------------------------------------
// Event handlers
// ---------------------------------------------------------------------------

async function handleEnter(): Promise<void> {
  const title = inputTitle.value.trim()
  if (!title) return

  try {
    await props.createTodo(title)
    inputTitle.value = ''
  } catch (err) {
    // Leave input unchanged so the user can retry or correct the title.
    const message = err instanceof Error ? err.message : FALLBACK_CREATE_ERROR
    emit('error', message)
  }
}

function handleEscape(): void {
  inputTitle.value = ''
}

async function handleKeydown(event: KeyboardEvent): Promise<void> {
  if (event.key === KEY_ENTER) {
    await handleEnter()
  } else if (event.key === KEY_ESCAPE) {
    handleEscape()
  }
}
</script>

<template>
  <input
    v-model="inputTitle"
    type="text"
    class="new-todo-input"
    data-testid="new-todo-input"
    placeholder="What needs to be done?"
    aria-label="New todo title"
    :maxlength="MAX_TITLE_LENGTH"
    @keydown="handleKeydown"
  />
</template>

<style scoped>
.new-todo-input {
  width: 100%;
  padding: 1rem 1rem 1rem 4rem;
  font-size: 1.5rem;
  font-weight: 300;
  border: none;
  border-bottom: 1px solid #ededed;
  box-sizing: border-box;
  background: rgba(0, 0, 0, 0.003);
  outline: none;
}

.new-todo-input::placeholder {
  font-style: italic;
  font-weight: 300;
  color: #e6e6e6;
}
</style>
