<template>
  <!--
    Visible only when at least one todo exists (enforced by parent via v-if).
    Layout: [N item(s) left] [Filter tabs] [Clear completed]
  -->
  <div
    class="flex items-center justify-between gap-4 px-4 py-3 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-800 text-sm text-gray-500 dark:text-gray-400"
  >
    <!-- Left: active item count -->
    <span data-testid="items-left" class="min-w-[6rem] whitespace-nowrap">
      {{ activeCount }} {{ activeCount === 1 ? 'item' : 'items' }} left
    </span>

    <!-- Center: filter tabs -->
    <TodoFilterBar
      :current-filter="currentFilter"
      @filter-change="$emit('filter-change', $event)"
    />

    <!-- Right: clear completed — shown only when there are completed todos -->
    <span class="min-w-[6rem] flex justify-end">
      <button
        v-if="completedCount > 0"
        data-testid="clear-completed"
        class="hover:text-gray-700 dark:hover:text-gray-200 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-400 rounded"
        @click="$emit('clear-completed')"
      >
        Clear completed
      </button>
    </span>
  </div>
</template>

<script setup lang="ts">
import type { FilterCriteria } from '~/types/todo'

defineProps<{
  activeCount: number
  completedCount: number
  currentFilter: FilterCriteria
}>()

defineEmits<{
  'filter-change': [filter: FilterCriteria]
  'clear-completed': []
}>()
</script>
