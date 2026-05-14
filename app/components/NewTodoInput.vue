<script setup lang="ts">
import { ref } from 'vue'

const emit = defineEmits<{
  /** Emitted when the user submits a new todo title. The caller is responsible
   *  for calling `clear()` via the template ref if the API call succeeds. */
  submit: [title: string]
}>()

const inputValue = ref('')
const inputEl = ref<HTMLInputElement>()

function handleKeydown(event: KeyboardEvent): void {
  if (event.key === 'Enter') {
    const title = inputValue.value.trim()
    if (title) {
      emit('submit', title)
      // Do NOT clear here — caller clears on success via clear()
    }
  }
  else if (event.key === 'Escape') {
    inputValue.value = ''
  }
}

/** Clear the input field. Called by the parent after a successful API create. */
function clear(): void {
  inputValue.value = ''
}

/** Focus the input field programmatically. */
function focus(): void {
  inputEl.value?.focus()
}

defineExpose({ clear, focus })
</script>

<template>
  <div class="new-todo-wrapper">
    <input
      ref="inputEl"
      v-model="inputValue"
      class="new-todo-input"
      type="text"
      placeholder="What needs to be done?"
      aria-label="New todo title. Press Enter to add."
      autocomplete="off"
      spellcheck="true"
      @keydown="handleKeydown"
    />
  </div>
</template>

<style scoped>
.new-todo-wrapper {
  border-bottom: 1px solid var(--color-border);
}

.new-todo-input {
  width: 100%;
  padding: 1rem 1rem 1rem 3.5rem;
  font-size: 1.125rem;
  font-family: inherit;
  color: var(--color-text);
  border: none;
  outline: none;
  background: transparent;
  box-sizing: border-box;
}

.new-todo-input::placeholder {
  color: var(--color-text-placeholder);
  font-style: italic;
}
</style>
