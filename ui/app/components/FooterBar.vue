<!--
  FooterBar — visible only when at least one Todo exists.

  Layout:
    Left:   "{N} item(s) left"
    Center: FilterTabs (compact — no counts shown)
    Right:  "Clear completed" (only when completedCount > 0)
-->
<script setup lang="ts">
import type { FilterCriteria, Counts } from '~/types'

const props = defineProps<{
  counts: Counts
  currentFilter: FilterCriteria
}>()

const emit = defineEmits<{
  changeFilter: [filter: FilterCriteria]
  clearCompleted: []
}>()

const itemsLeftLabel = computed(() => {
  const n = props.counts.active
  return `${n} item${n === 1 ? '' : 's'} left`
})
</script>

<template>
  <footer
    v-if="counts.all > 0"
    class="flex items-center justify-between gap-4 px-4 py-3 border-t border-gray-100 text-sm text-gray-500"
  >
    <!-- Left: active count -->
    <span class="min-w-[8rem]" aria-live="polite" aria-atomic="true">
      {{ itemsLeftLabel }}
    </span>

    <!-- Center: filter tabs (compact, no count badges) -->
    <FilterTabs
      :current="currentFilter"
      :counts="counts"
      compact
      @change="emit('changeFilter', $event)"
    />

    <!-- Right: clear completed -->
    <div class="min-w-[8rem] flex justify-end">
      <button
        v-if="counts.completed > 0"
        type="button"
        class="
          rounded px-2 py-1 text-gray-400
          hover:text-red-600 hover:bg-red-50
          transition-colors duration-150
        "
        @click="emit('clearCompleted')"
      >
        Clear completed
      </button>
    </div>
  </footer>
</template>
