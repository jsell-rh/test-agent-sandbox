<script setup lang="ts">
import type { FilterCriteria } from '~/types/todo'

const { counts, clearCompleted, filter, setFilter } = useTodos()

const FILTERS: { value: FilterCriteria; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'completed', label: 'Completed' },
]

const activeLabel = computed(() =>
  counts.value.active === 1 ? '1 item left' : `${counts.value.active} items left`,
)
</script>

<template>
  <footer
    class="card px-4 py-2.5 flex items-center gap-4 text-xs text-slate-500"
    aria-label="Todo summary"
  >
    <!-- Items left counter -->
    <span class="flex-1 font-medium" aria-live="polite" aria-atomic="true">
      {{ activeLabel }}
    </span>

    <!-- Filter tabs (canonical set — same as TodoFilterBar) -->
    <nav class="flex items-center gap-0.5" aria-label="Filter todos">
      <button
        v-for="f in FILTERS"
        :key="f.value"
        type="button"
        class="filter-tab !text-xs"
        :class="{ active: filter === f.value }"
        :aria-current="filter === f.value ? 'page' : undefined"
        @click="setFilter(f.value)"
      >
        {{ f.label }}
      </button>
    </nav>

    <!-- Clear completed -->
    <div class="flex-1 flex justify-end">
      <button
        v-if="counts.completed > 0"
        type="button"
        class="btn-danger"
        @click="clearCompleted"
      >
        Clear completed
      </button>
    </div>
  </footer>
</template>
