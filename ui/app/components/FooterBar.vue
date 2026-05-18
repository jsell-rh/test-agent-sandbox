<script setup lang="ts">
import type { FilterCriteria } from '~/types/todo'

defineProps<{
  activeCount: number
  completedCount: number
  filter: FilterCriteria
}>()

const emit = defineEmits<{
  'update:filter': [value: FilterCriteria]
  clearCompleted: []
}>()
</script>

<template>
  <footer
    class="
      flex items-center justify-between
      px-4 py-2
      border-t border-gray-100 dark:border-gray-800
      text-sm text-gray-400 dark:text-gray-500
    "
  >
    <!-- Items left -->
    <span class="flex-shrink-0">
      <span class="font-medium text-gray-600 dark:text-gray-300">{{ activeCount }}</span>
      {{ activeCount === 1 ? 'item left' : 'items left' }}
    </span>

    <!-- Filter tabs (canonical — same tabs as above the list) -->
    <FilterTabs
      :model-value="filter"
      @update:model-value="emit('update:filter', $event)"
    />

    <!-- Clear completed -->
    <div class="flex-shrink-0 w-28 text-right">
      <button
        v-if="completedCount > 0"
        class="
          text-sm text-gray-400 dark:text-gray-500
          hover:text-red-500 dark:hover:text-red-400
          transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded
        "
        type="button"
        @click="emit('clearCompleted')"
      >
        Clear completed
      </button>
    </div>
  </footer>
</template>
