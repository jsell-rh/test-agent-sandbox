<!--
  FilterTabs — All / Active / Completed filter selector.

  Used in two places:
    1. As a standalone bar above the todo list.
    2. Embedded in the FooterBar (center slot).

  Both instances share the same FilterCriteria state.
-->
<script setup lang="ts">
import type { FilterCriteria, Counts } from '~/types'

const props = defineProps<{
  current: FilterCriteria
  counts: Counts
  compact?: boolean
}>()

const emit = defineEmits<{
  change: [filter: FilterCriteria]
}>()

const tabs: { label: string; value: FilterCriteria }[] = [
  { label: 'All', value: 'all' },
  { label: 'Active', value: 'active' },
  { label: 'Completed', value: 'completed' },
]
</script>

<template>
  <nav
    :aria-label="compact ? 'Filter todos' : 'Todo filter'"
    class="flex items-center gap-1"
  >
    <button
      v-for="tab in tabs"
      :key="tab.value"
      type="button"
      role="tab"
      :aria-selected="current === tab.value"
      :aria-controls="'todo-list'"
      :class="[
        'rounded-md px-3 py-1.5 text-sm font-medium transition-all duration-150 select-none',
        current === tab.value
          ? 'bg-brand-600 text-white shadow-sm'
          : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100',
      ]"
      @click="emit('change', tab.value)"
    >
      {{ tab.label }}
      <span
        v-if="!compact"
        class="ml-1.5 inline-flex items-center justify-center rounded-full px-1.5 py-0.5 text-xs leading-none"
        :class="
          current === tab.value
            ? 'bg-white/20 text-white'
            : 'bg-gray-100 text-gray-500'
        "
      >
        {{ counts[tab.value] }}
      </span>
    </button>
  </nav>
</template>
