<script setup lang="ts">
/**
 * New-todo input field.
 *
 * Accepts an async `onCreate` prop so the parent can control when the
 * input is cleared: it clears only on success, keeping the value intact
 * if the API call fails (per spec §Non-Functional Requirements).
 */
const props = defineProps<{
  onCreate: (title: string) => Promise<void>
}>()

const inputValue = ref('')
const isSubmitting = ref(false)
const inputRef = ref<HTMLInputElement | null>(null)

async function handleSubmit(): Promise<void> {
  const title = inputValue.value.trim()
  if (!title || isSubmitting.value) return

  isSubmitting.value = true
  try {
    await props.onCreate(title)
    inputValue.value = '' // clear only on success
  } catch {
    // Keep the input value so the user can correct and retry.
    // The error message is surfaced by the parent via useErrors().
  } finally {
    isSubmitting.value = false
  }
}

function handleKeydown(event: KeyboardEvent): void {
  if (event.key === 'Enter') {
    handleSubmit()
  } else if (event.key === 'Escape') {
    inputValue.value = ''
  }
}
</script>

<template>
  <div
    class="
      flex items-center gap-3
      bg-white dark:bg-gray-900
      rounded-xl shadow-sm border border-gray-200 dark:border-gray-800
      px-4 py-3
      focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500
      transition-shadow
    "
  >
    <!-- Visual add icon -->
    <span
      class="text-gray-300 dark:text-gray-600 select-none flex-shrink-0"
      aria-hidden="true"
    >
      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
      </svg>
    </span>

    <input
      ref="inputRef"
      v-model="inputValue"
      type="text"
      placeholder="What needs to be done?"
      class="
        flex-1 bg-transparent text-gray-800 dark:text-gray-100
        placeholder-gray-400 dark:placeholder-gray-500
        text-base focus:outline-none
      "
      aria-label="New todo title"
      :disabled="isSubmitting"
      @keydown="handleKeydown"
    />

    <!-- Keyboard hint -->
    <kbd
      v-if="inputValue.trim()"
      class="
        hidden sm:inline-flex items-center gap-1
        text-xs text-gray-400 dark:text-gray-500
        font-mono flex-shrink-0
      "
      aria-hidden="true"
    >
      <span>↵</span> to add
    </kbd>
  </div>
</template>
