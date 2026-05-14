<script setup lang="ts">
import { computed } from 'vue'
import type { FilterCriteria } from '~/types/todo'

const props = defineProps<{
  /** The currently active filter (determines contextual message). */
  filter: FilterCriteria
}>()

const message = computed<string>(() => {
  switch (props.filter) {
    case 'active':
      return 'No active todos. Great work!'
    case 'completed':
      return 'No completed todos yet.'
    default:
      return 'No todos yet. Add one above to get started.'
  }
})
</script>

<template>
  <div class="empty-state" role="status" aria-live="polite">
    <p class="empty-message">{{ message }}</p>
  </div>
</template>

<style scoped>
.empty-state {
  padding: 3rem 1.5rem;
  text-align: center;
}

.empty-message {
  color: var(--color-text-placeholder);
  font-size: 1rem;
  font-style: italic;
  margin: 0;
}
</style>
