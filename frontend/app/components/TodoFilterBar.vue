<script setup lang="ts">
import type { FilterCriteria } from '~/types/todo'

const { filter, setFilter, counts } = useTodos()

const FILTERS: { value: FilterCriteria; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'completed', label: 'Completed' },
]
</script>

<template>
  <nav aria-label="Filter todos" class="flex items-center gap-1 justify-center">
    <button
      v-for="f in FILTERS"
      :key="f.value"
      type="button"
      class="filter-tab"
      :class="{ active: filter === f.value }"
      :aria-current="filter === f.value ? 'page' : undefined"
      @click="setFilter(f.value)"
    >
      {{ f.label }}
      <span
        class="ml-1 text-xs opacity-60"
        aria-hidden="true"
      >
        ({{ counts[f.value] }})
      </span>
    </button>
  </nav>
</template>
