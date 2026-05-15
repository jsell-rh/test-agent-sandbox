<script setup lang="ts">
/**
 * FooterBar.vue — footer bar component (specs/interface.spec.md).
 *
 * Visible only when todos[] is non-empty (rendered conditionally by the parent).
 *
 * Layout (three slots):
 *   Left   — "{N} item(s) left" where N = counts.active
 *   Centre — FilterTabs (canonical filter tab set)
 *   Right  — "Clear completed" button (only when counts.completed > 0)
 *
 * Props:
 *   counts — { all, active, completed } — always computed over all todos[]
 *   filter — the active FilterCriteria, passed to FilterTabs
 *
 * Emits:
 *   update:filter   — forwarded from FilterTabs click
 *   clear-completed — emitted when the "Clear completed" button is clicked
 */

import FilterTabs from './FilterTabs.vue'
import type { FilterCriteria } from '~/composables/useTodos'

interface Counts {
  all: number
  active: number
  completed: number
}

const props = defineProps<{
  counts: Counts
  filter: FilterCriteria
}>()

const emit = defineEmits<{
  'update:filter': [filter: FilterCriteria]
  'clear-completed': []
}>()
</script>

<template>
  <footer class="footer-bar" data-testid="footer-bar">
    <span class="items-left" data-testid="items-left">
      {{ props.counts.active }} {{ props.counts.active === 1 ? 'item' : 'items' }} left
    </span>

    <FilterTabs
      :filter="props.filter"
      @update:filter="emit('update:filter', $event)"
    />

    <button
      v-if="props.counts.completed > 0"
      class="clear-completed"
      data-testid="clear-completed"
      @click="emit('clear-completed')"
    >
      Clear completed
    </button>
  </footer>
</template>

<style scoped>
.footer-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.625rem 1rem;
  font-size: 0.875rem;
  color: #777;
  border-top: 1px solid #e6e6e6;
}

.items-left {
  flex: 1;
  text-align: left;
}

.clear-completed {
  background: none;
  border: none;
  cursor: pointer;
  color: inherit;
  font-size: inherit;
  padding: 0;
}

.clear-completed:hover {
  text-decoration: underline;
}
</style>
