<template>
  <div class="error-container" role="alert" aria-live="polite" aria-atomic="false">
    <TransitionGroup name="error-list">
      <div
        v-for="error in errors"
        :key="error.id"
        class="error-banner"
      >
        <span class="error-banner-icon" aria-hidden="true">⚠</span>
        <span class="error-banner-text">{{ error.message }}</span>
        <button
          type="button"
          class="error-banner-close"
          aria-label="Dismiss error"
          @click="$emit('dismiss', error.id)"
        >
          ×
        </button>
      </div>
    </TransitionGroup>
  </div>
</template>

<script setup lang="ts">
import type { UiError } from '~/types/todo'

defineProps<{ errors: UiError[] }>()
defineEmits<{ dismiss: [id: string] }>()
</script>

<style scoped>
.error-list-enter-active,
.error-list-leave-active {
  transition: all 200ms ease;
}

.error-list-enter-from {
  opacity: 0;
  transform: translateX(1rem);
}

.error-list-leave-to {
  opacity: 0;
  transform: translateX(1rem);
}
</style>
