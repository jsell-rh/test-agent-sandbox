<script setup lang="ts">
import type { FilterCriteria } from '~/types/todo'

const props = defineProps<{
  filter: FilterCriteria
}>()

const message = computed<string>(() => {
  if (props.filter === 'active') return 'No active todos — great work!'
  if (props.filter === 'completed') return 'Nothing completed yet.'
  return 'No todos found.'
})
</script>

<template>
  <div
    class="py-10 text-center text-gray-400 dark:text-gray-500"
    role="status"
    aria-live="polite"
  >
    <svg
      class="w-10 h-10 mx-auto mb-3 opacity-40"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="1.5"
        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
      />
    </svg>
    <p class="text-sm font-medium">{{ message }}</p>
  </div>
</template>
