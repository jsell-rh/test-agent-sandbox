<script setup lang="ts">
import type { FilterCriteria } from '~/types/todo'

const props = defineProps<{
  modelValue: FilterCriteria
}>()

const emit = defineEmits<{
  'update:modelValue': [value: FilterCriteria]
}>()

const tabs: { label: string; value: FilterCriteria }[] = [
  { label: 'All', value: 'all' },
  { label: 'Active', value: 'active' },
  { label: 'Completed', value: 'completed' },
]
</script>

<template>
  <nav
    class="flex gap-1"
    role="tablist"
    aria-label="Filter todos"
  >
    <button
      v-for="tab in tabs"
      :key="tab.value"
      role="tab"
      :aria-selected="modelValue === tab.value"
      :class="[
        'px-3 py-1 rounded-md text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500',
        modelValue === tab.value
          ? 'bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400'
          : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800',
      ]"
      type="button"
      @click="emit('update:modelValue', tab.value)"
    >
      {{ tab.label }}
    </button>
  </nav>
</template>
