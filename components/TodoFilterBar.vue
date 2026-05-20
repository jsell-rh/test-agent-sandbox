<template>
  <nav aria-label="Filter todos">
    <ul class="flex gap-1 list-none p-0 m-0">
      <li v-for="option in FILTER_OPTIONS" :key="option.value">
        <button
          class="px-3 py-1 text-sm rounded-full border transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-400"
          :class="
            currentFilter === option.value
              ? 'border-indigo-300 text-indigo-600 dark:border-indigo-700 dark:text-indigo-400'
              : 'border-transparent text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300'
          "
          :aria-pressed="currentFilter === option.value"
          @click="$emit('filter-change', option.value)"
        >
          {{ option.label }}
        </button>
      </li>
    </ul>
  </nav>
</template>

<script setup lang="ts">
import type { FilterCriteria } from '~/types/todo'

defineProps<{
  currentFilter: FilterCriteria
}>()

defineEmits<{
  'filter-change': [filter: FilterCriteria]
}>()

const FILTER_OPTIONS: { value: FilterCriteria; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'completed', label: 'Completed' },
]
</script>
