<script setup lang="ts">
/**
 * TodoFooter — footer bar below the todo list.
 *
 * Spec:
 * - Visible only when at least one Todo exists.
 * - Left: "{N} item(s) left" where N = count of active Todos.
 * - Centre: filter tabs ("All" | "Active" | "Completed") — the canonical set.
 * - Right: "Clear completed" button, visible only when completedCount > 0.
 */
import { computed } from 'vue'
import { useTodos } from '~/composables/useTodos'
import type { FilterCriteria } from '~/types/todo'

const store = useTodos()

const tabs: { label: string; value: FilterCriteria }[] = [
  { label: 'All', value: 'all' },
  { label: 'Active', value: 'active' },
  { label: 'Completed', value: 'completed' },
]

const itemsLeftLabel = computed(() => {
  const n = store.counts.value.active
  return `${n} item${n === 1 ? '' : 's'} left`
})
</script>

<template>
  <!-- Conditionally rendered: visible only when at least one Todo exists -->
  <footer v-if="store.counts.value.all > 0" class="todo-footer" aria-label="Todo filters and summary">
    <!-- Left: items left count -->
    <span class="items-left" data-testid="items-left" aria-live="polite">
      {{ itemsLeftLabel }}
    </span>

    <!-- Centre: filter tabs -->
    <nav class="filter-tabs" aria-label="Filter todos">
      <button
        v-for="tab in tabs"
        :key="tab.value"
        class="filter-tab"
        :class="{ active: store.filter.value === tab.value }"
        type="button"
        :aria-pressed="store.filter.value === tab.value"
        :data-testid="`filter-${tab.value}`"
        @click="store.setFilter(tab.value)"
      >
        {{ tab.label }}
      </button>
    </nav>

    <!-- Right: clear completed (hidden when no completed todos) -->
    <div class="footer-right">
      <button
        v-if="store.counts.value.completed > 0"
        class="clear-completed"
        type="button"
        data-testid="clear-completed"
        @click="store.clearCompleted()"
      >
        Clear completed
      </button>
    </div>
  </footer>
</template>
