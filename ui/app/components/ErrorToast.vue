<script setup lang="ts">
const { errors, removeError } = useErrors()
</script>

<template>
  <!-- Fixed bottom-right notification area -->
  <div
    class="fixed bottom-6 right-6 z-50 flex flex-col gap-2"
    role="alert"
    aria-live="assertive"
    aria-atomic="false"
  >
    <TransitionGroup name="slide">
      <div
        v-for="error in errors"
        :key="error.id"
        class="
          flex items-start gap-3
          bg-white dark:bg-gray-900
          border border-red-200 dark:border-red-900
          rounded-xl shadow-lg
          px-4 py-3
          max-w-sm
        "
      >
        <!-- Error icon -->
        <svg
          class="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>

        <!-- Message -->
        <p class="flex-1 text-sm text-gray-700 dark:text-gray-200">
          {{ error.message }}
        </p>

        <!-- Dismiss -->
        <button
          class="
            flex-shrink-0 p-0.5 rounded
            text-gray-400 dark:text-gray-500
            hover:text-gray-600 dark:hover:text-gray-300
            transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500
          "
          :aria-label="`Dismiss: ${error.message}`"
          type="button"
          @click="removeError(error.id)"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </TransitionGroup>
  </div>
</template>
