<script setup lang="ts">
defineProps<{
  messages: readonly string[]
}>()
</script>

<template>
  <div
    aria-live="assertive"
    aria-atomic="false"
    class="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 pointer-events-none"
  >
    <TransitionGroup name="toast">
      <div
        v-for="(msg, idx) in messages"
        :key="`${idx}-${msg}`"
        role="alert"
        class="pointer-events-auto bg-red-600 text-white text-sm font-medium px-4 py-2.5
               rounded-lg shadow-lg flex items-center gap-2 max-w-sm"
      >
        <svg
          class="w-4 h-4 flex-shrink-0"
          viewBox="0 0 16 16"
          fill="currentColor"
          aria-hidden="true"
        >
          <path
            d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1ZM7.25 4.75a.75.75 0 0 1 1.5 0v3.5a.75.75 0 0 1-1.5 0v-3.5Zm.75 7a1 1 0 1 1 0-2 1 1 0 0 1 0 2Z"
          />
        </svg>
        <span>{{ msg }}</span>
      </div>
    </TransitionGroup>
  </div>
</template>

<style scoped>
.toast-enter-active,
.toast-leave-active {
  transition: all 0.25s ease;
}

.toast-enter-from {
  opacity: 0;
  transform: translateY(8px);
}

.toast-leave-to {
  opacity: 0;
  transform: scale(0.95);
}
</style>
