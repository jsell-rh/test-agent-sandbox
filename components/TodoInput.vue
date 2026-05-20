<template>
  <div class="relative border-b border-gray-100 dark:border-gray-800">
    <input
      ref="inputRef"
      v-model="inputValue"
      data-testid="new-todo-input"
      type="text"
      placeholder="What needs to be done?"
      class="w-full py-4 pl-14 pr-4 text-lg text-gray-700 dark:text-gray-300 placeholder-gray-300 dark:placeholder-gray-600 bg-transparent outline-none"
      aria-label="New todo — press Enter to add"
      @keydown.enter="handleSubmit"
      @keydown.escape="handleEscape"
    />
  </div>
</template>

<script setup lang="ts">
const emit = defineEmits<{
  /** Emitted with the trimmed title when the user presses Enter. */
  create: [title: string]
}>()

const inputRef = ref<HTMLInputElement | null>(null)
const inputValue = ref('')

const handleSubmit = () => {
  const title = inputValue.value.trim()
  if (!title) return
  emit('create', title)
  // Note: the parent is responsible for calling clear() on success.
  // The input intentionally keeps its value until the parent confirms success,
  // satisfying the spec requirement: "Input not cleared" on API error.
}

const handleEscape = () => {
  inputValue.value = ''
}

/** Called by the parent after a successful create. */
const clear = () => {
  inputValue.value = ''
}

/** Expose clear() so the parent can call it after a confirmed success. */
defineExpose({ clear })
</script>
