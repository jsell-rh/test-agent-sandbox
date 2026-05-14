<script setup lang="ts">
import { computed } from 'vue'
import type { FilterCriteria } from '~/types/todo'

const props = defineProps<{
  /** Number of active (incomplete) todos. */
  activeCount: number
  /** Number of completed todos. */
  completedCount: number
  /** Currently active filter tab. */
  filterCriteria: FilterCriteria
}>()

const emit = defineEmits<{
  filterChange: [filter: FilterCriteria]
  clearCompleted: []
}>()

/** Grammatically correct "{N} item(s) left" label. */
const itemsLeftLabel = computed(() => {
  const n = props.activeCount
  return `${n} ${n === 1 ? 'item' : 'items'} left`
})

const currentFilter = computed({
  get: () => props.filterCriteria,
  set: (filter: FilterCriteria) => emit('filterChange', filter),
})
</script>

<template>
  <footer class="footer-bar">
    <!-- Left: items left count -->
    <span class="footer-count" aria-live="polite" aria-atomic="true">
      {{ itemsLeftLabel }}
    </span>

    <!-- Center: filter tabs -->
    <FilterTabs v-model="currentFilter" />

    <!-- Right: clear completed button -->
    <button
      v-if="props.completedCount > 0"
      class="clear-completed-btn"
      type="button"
      @click="emit('clearCompleted')"
    >
      Clear completed
    </button>
    <span v-else class="footer-spacer" />
  </footer>
</template>

<style scoped>
.footer-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.625rem 1rem;
  border-top: 1px solid var(--color-border);
  font-size: 0.875rem;
  color: var(--color-text-muted);
  min-height: 2.75rem;
}

.footer-count {
  flex: 1;
  text-align: left;
}

.footer-spacer {
  flex: 1;
}

.clear-completed-btn {
  flex: 1;
  text-align: right;
  background: none;
  border: none;
  padding: 0;
  font-family: inherit;
  font-size: inherit;
  color: var(--color-text-muted);
  cursor: pointer;
  transition: color 0.15s;
}

.clear-completed-btn:hover {
  color: var(--color-danger);
  text-decoration: underline;
}
</style>
