<!--
  TodoInput — new-todo entry field.

  Spec behaviour:
  - Pressing Enter submits (calls createTodo) and clears the input on success.
  - Pressing Escape clears the input without submitting.
  - An empty string is not submitted.
  - API errors are surfaced to the parent via the 'error' event.
-->
<script setup lang="ts">
const emit = defineEmits<{
  create: [title: string]
  error: [message: string]
}>()

const inputValue = ref('')
const isSubmitting = ref(false)
const inputRef = ref<HTMLInputElement | null>(null)

async function handleSubmit(): Promise<void> {
  const title = inputValue.value.trim()
  if (!title || isSubmitting.value) return

  isSubmitting.value = true
  try {
    emit('create', title)
    inputValue.value = ''
  } finally {
    isSubmitting.value = false
  }
}

function handleKeydown(event: KeyboardEvent): void {
  if (event.key === 'Enter') {
    event.preventDefault()
    handleSubmit()
  } else if (event.key === 'Escape') {
    inputValue.value = ''
    inputRef.value?.blur()
  }
}

/** Allow parent to focus the input programmatically. */
defineExpose({ focus: () => inputRef.value?.focus() })
</script>

<template>
  <div class="relative">
    <label for="new-todo-input" class="sr-only">
      Add a new todo
    </label>
    <input
      id="new-todo-input"
      ref="inputRef"
      v-model="inputValue"
      type="text"
      placeholder="What needs to be done?"
      autocomplete="off"
      autocorrect="off"
      spellcheck="true"
      :disabled="isSubmitting"
      class="
        w-full rounded-lg border border-gray-200 bg-white px-4 py-3
        text-gray-900 placeholder-gray-400 text-base
        shadow-sm
        transition-all duration-150
        hover:border-gray-300
        focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 focus:outline-none
        disabled:opacity-60 disabled:cursor-not-allowed
      "
      @keydown="handleKeydown"
    />
    <!-- Submit hint -->
    <span
      v-if="inputValue.trim()"
      class="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 pointer-events-none select-none"
      aria-hidden="true"
    >
      ↵ add
    </span>
  </div>
</template>
