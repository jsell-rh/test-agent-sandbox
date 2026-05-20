<template>
  <!-- Fixed notification tray — ARIA live region so errors are announced. -->
  <div
    v-if="errors.length"
    class="fixed bottom-4 right-4 z-50 flex flex-col gap-2"
    aria-live="polite"
    aria-label="Notifications"
  >
    <div
      v-for="error in errors"
      :key="error.id"
      role="alert"
      class="flex items-center gap-3 max-w-sm px-4 py-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg shadow-lg text-red-700 dark:text-red-300 text-sm"
    >
      <span class="flex-1">{{ error.message }}</span>
      <button
        class="flex-shrink-0 text-red-400 hover:text-red-600 dark:hover:text-red-200 text-lg leading-none"
        aria-label="Dismiss notification"
        @click="removeError(error.id)"
      >
        ×
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
const { errors, removeError } = useErrors()
</script>
