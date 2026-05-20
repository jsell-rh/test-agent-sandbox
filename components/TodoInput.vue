<script setup lang="ts">
/**
 * TodoInput — new-todo creation input.
 *
 * Spec behaviour:
 * - Placeholder "What needs to be done?"
 * - Enter key calls POST /api/todos (via store); clears input on success.
 * - Escape key clears the input without creating.
 * - 500 response: input is NOT cleared; error message displayed by parent.
 */
import { ref } from 'vue'
import { useTodos } from '~/composables/useTodos'

const store = useTodos()
const inputValue = ref('')

async function handleKeydown(event: KeyboardEvent): Promise<void> {
  if (event.key === 'Escape') {
    inputValue.value = ''
    return
  }
  if (event.key === 'Enter') {
    const title = inputValue.value.trim()
    if (!title) return
    const success = await store.createTodo(title)
    // Spec: "Clears on success" / "Input not cleared" on 500
    if (success) {
      inputValue.value = ''
    }
  }
}
</script>

<template>
  <input
    v-model="inputValue"
    class="todo-input"
    type="text"
    placeholder="What needs to be done?"
    aria-label="New todo — press Enter to add"
    data-testid="new-todo-input"
    @keydown="handleKeydown"
  />
</template>
