<script setup lang="ts">
/**
 * ErrorNotification.vue — non-blocking inline error message component.
 *
 * Spec (specs/interface.spec.md § Non-Functional Requirements):
 *   "API errors surfaced to user as non-blocking inline messages;
 *    auto-dismiss after 5s"
 *
 * Design:
 *   - Inline rendering only — no fixed overlay, no modal — so it does not
 *     obscure or block the todo list below it.
 *   - role="alert" announces the message to screen readers immediately
 *     without requiring focus, satisfying the accessibility requirement.
 *   - The parent (index.vue) controls visibility (renders this component
 *     only when errorMessage is non-null) and supplies the dismiss handler.
 *
 * Props:
 *   message — the error string to display.
 *
 * Emits:
 *   dismiss — emitted when the user clicks the dismiss button.
 *             The parent calls dismissError() in response.
 */

defineProps<{
  /** The human-readable error message to display. */
  message: string
}>()

const emit = defineEmits<{
  /** User clicked dismiss — parent should call dismissError(). */
  dismiss: []
}>()
</script>

<template>
  <div
    data-testid="error-notification"
    class="error-notification"
    role="alert"
  >
    <span
      data-testid="error-message"
      class="error-notification__message"
    >
      {{ message }}
    </span>
    <button
      data-testid="error-dismiss"
      class="error-notification__dismiss"
      type="button"
      aria-label="Dismiss error"
      @click="emit('dismiss')"
    >
      ×
    </button>
  </div>
</template>

<style scoped>
.error-notification {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  padding: 0.625rem 1rem;
  background: #fff0f0;
  border: 1px solid #f5a5a5;
  border-radius: 4px;
  color: #b00020;
  font-size: 0.875rem;
  /* Inline positioning — does not block the todo list */
  position: relative;
  z-index: 0;
}

.error-notification__message {
  flex: 1;
}

.error-notification__dismiss {
  background: none;
  border: none;
  cursor: pointer;
  color: inherit;
  font-size: 1.25rem;
  line-height: 1;
  padding: 0 0.25rem;
  flex-shrink: 0;
}

.error-notification__dismiss:hover {
  opacity: 0.7;
}

.error-notification__dismiss:focus-visible {
  outline: 2px solid #b00020;
  border-radius: 2px;
}
</style>
