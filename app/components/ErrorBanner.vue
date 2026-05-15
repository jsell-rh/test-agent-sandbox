<script setup lang="ts">
import type { ErrorNotification } from '~/composables/useTodos'

defineProps<{
  errors: readonly ErrorNotification[]
}>()

const emit = defineEmits<{
  dismiss: [id: string]
}>()
</script>

<template>
  <Transition name="fade">
    <div v-if="errors.length > 0" class="error-banner-stack" aria-live="assertive" aria-atomic="false">
      <div
        v-for="error in errors"
        :key="error.id"
        class="error-banner"
        role="alert"
      >
        <span class="error-icon" aria-hidden="true">⚠</span>
        <span class="error-message">{{ error.message }}</span>
        <button
          class="error-dismiss"
          type="button"
          aria-label="Dismiss error"
          @click="emit('dismiss', error.id)"
        >
          ×
        </button>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.error-banner-stack {
  position: fixed;
  bottom: 1.5rem;
  right: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  z-index: 100;
  max-width: 24rem;
}

.error-banner {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  background: var(--color-surface);
  border: 1px solid var(--color-danger);
  border-left: 4px solid var(--color-danger);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-md);
  font-size: 0.875rem;
  color: var(--color-text);
}

.error-icon {
  color: var(--color-danger);
  flex-shrink: 0;
}

.error-message {
  flex: 1;
}

.error-dismiss {
  background: none;
  border: none;
  padding: 0;
  font-size: 1.25rem;
  line-height: 1;
  color: var(--color-text-muted);
  cursor: pointer;
  flex-shrink: 0;
  transition: color 0.15s;
}

.error-dismiss:hover {
  color: var(--color-danger);
}

/* Transition */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s, transform 0.2s;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(0.5rem);
}
</style>
