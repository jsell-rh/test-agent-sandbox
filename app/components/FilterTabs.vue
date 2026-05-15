<script setup lang="ts">
import type { FilterCriteria } from '~/types/todo'
import { FILTER_TABS, FILTER_LABELS } from '~/types/todo'

const props = defineProps<{
  /** The currently active filter. */
  modelValue: FilterCriteria
}>()

const emit = defineEmits<{
  'update:modelValue': [filter: FilterCriteria]
}>()
</script>

<template>
  <nav class="filter-tabs" aria-label="Filter todos">
    <button
      v-for="tab in FILTER_TABS"
      :key="tab"
      class="filter-tab"
      :class="{ 'filter-tab--active': props.modelValue === tab }"
      :aria-current="props.modelValue === tab ? 'page' : undefined"
      type="button"
      @click="emit('update:modelValue', tab)"
    >
      {{ FILTER_LABELS[tab] }}
    </button>
  </nav>
</template>

<style scoped>
.filter-tabs {
  display: flex;
  gap: 0.25rem;
  align-items: center;
}

.filter-tab {
  padding: 0.25rem 0.625rem;
  font-size: 0.8125rem;
  font-family: inherit;
  color: var(--color-text-muted);
  background: transparent;
  border: 1px solid transparent;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition:
    color 0.15s,
    border-color 0.15s;
}

.filter-tab:hover {
  color: var(--color-text);
  border-color: var(--color-border-hover);
}

.filter-tab--active {
  color: var(--color-brand);
  border-color: var(--color-brand);
  font-weight: 500;
}
</style>
