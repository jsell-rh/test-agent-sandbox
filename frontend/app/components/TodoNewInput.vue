<script setup lang="ts">
const { createTodo } = useTodos()

const inputValue = ref('')
const isSubmitting = ref(false)

async function handleSubmit() {
  const title = inputValue.value.trim()
  if (!title) return

  isSubmitting.value = true
  const ok = await createTodo(title)
  if (ok) {
    inputValue.value = ''
  }
  isSubmitting.value = false
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Enter') {
    handleSubmit()
  } else if (event.key === 'Escape') {
    inputValue.value = ''
  }
}
</script>

<template>
  <div class="card">
    <div class="px-4 py-3 flex items-center gap-3">
      <!-- Decorative add icon -->
      <svg
        class="w-5 h-5 text-slate-300 flex-shrink-0"
        viewBox="0 0 20 20"
        fill="currentColor"
        aria-hidden="true"
      >
        <path
          d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z"
        />
      </svg>

      <input
        v-model="inputValue"
        type="text"
        placeholder="What needs to be done?"
        :disabled="isSubmitting"
        class="flex-1 text-slate-800 placeholder-slate-400 bg-transparent outline-none
               text-sm font-medium disabled:opacity-50"
        aria-label="New todo title"
        @keydown="handleKeydown"
      />

      <span
        v-if="isSubmitting"
        class="text-xs text-slate-400"
        aria-live="polite"
        aria-label="Saving…"
      >
        Saving…
      </span>
    </div>
  </div>
</template>
