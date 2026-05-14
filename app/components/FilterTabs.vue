<script setup lang="ts">
/**
 * FilterTabs.vue — canonical filter-tab component (specs/interface.spec.md).
 *
 * Renders three tabs (All / Active / Completed) and emits `update:filter`
 * when a tab is clicked.  Used in the Footer Bar centre slot; this is the
 * ONE canonical tab set referenced throughout the spec.
 *
 * Props:
 *   filter — the active FilterCriteria; controls which tab is highlighted.
 *
 * Emits:
 *   update:filter — emitted with the new FilterCriteria when a tab is clicked.
 */

import { FILTER_ALL, FILTER_ACTIVE, FILTER_COMPLETED } from '~/composables/useTodos'
import type { FilterCriteria } from '~/composables/useTodos'

defineProps<{ filter: FilterCriteria }>()

const emit = defineEmits<{ 'update:filter': [filter: FilterCriteria] }>()

/**
 * Tab definitions.  An array of plain objects so there are no magic strings
 * scattered through the template — labels and values are co-located here.
 */
const TABS: { label: string; value: FilterCriteria }[] = [
  { label: 'All', value: FILTER_ALL },
  { label: 'Active', value: FILTER_ACTIVE },
  { label: 'Completed', value: FILTER_COMPLETED },
]
</script>

<template>
  <nav class="filter-tabs" aria-label="Filter todos">
    <button
      v-for="tab in TABS"
      :key="tab.value"
      class="filter-tab"
      :class="{ 'filter-tab--active': filter === tab.value }"
      :aria-current="filter === tab.value ? 'true' : undefined"
      data-testid="filter-tab"
      @click="emit('update:filter', tab.value)"
    >
      {{ tab.label }}
    </button>
  </nav>
</template>

<style scoped>
.filter-tabs {
  display: flex;
  gap: 0.25rem;
}

.filter-tab {
  background: none;
  border: 1px solid transparent;
  border-radius: 3px;
  cursor: pointer;
  padding: 0.2rem 0.6rem;
  color: inherit;
  font-size: inherit;
}

.filter-tab:hover {
  border-color: rgba(175, 47, 47, 0.3);
}

.filter-tab--active {
  border-color: rgba(175, 47, 47, 0.6);
}
</style>
