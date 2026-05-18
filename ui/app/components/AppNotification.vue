<script setup lang="ts">
import type { AppNotification } from '~/types'

defineProps<{
  notifications: AppNotification[]
}>()

const emit = defineEmits<{
  dismiss: [id: string]
}>()
</script>

<template>
  <Teleport to="body">
    <div
      aria-live="polite"
      aria-atomic="false"
      class="fixed top-4 right-4 z-50 flex flex-col gap-2 w-full max-w-sm"
    >
      <TransitionGroup
        name="notification"
        tag="div"
        class="flex flex-col gap-2"
      >
        <div
          v-for="n in notifications"
          :key="n.id"
          role="alert"
          class="flex items-start gap-3 rounded-lg border px-4 py-3 shadow-lg text-sm"
          :class="{
            'bg-red-50 border-red-200 text-red-800': n.level === 'error',
            'bg-amber-50 border-amber-200 text-amber-800': n.level === 'warning',
            'bg-blue-50 border-blue-200 text-blue-800': n.level === 'info',
          }"
        >
          <!-- Icon -->
          <span aria-hidden="true" class="shrink-0 mt-0.5">
            <svg
              v-if="n.level === 'error'"
              xmlns="http://www.w3.org/2000/svg"
              class="size-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <svg
              v-else-if="n.level === 'warning'"
              xmlns="http://www.w3.org/2000/svg"
              class="size-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            <svg
              v-else
              xmlns="http://www.w3.org/2000/svg"
              class="size-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </span>

          <p class="flex-1 leading-snug">{{ n.message }}</p>

          <button
            type="button"
            class="shrink-0 rounded opacity-60 hover:opacity-100 transition-opacity"
            :aria-label="`Dismiss notification: ${n.message}`"
            @click="emit('dismiss', n.id)"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="size-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<style scoped>
.notification-enter-active,
.notification-leave-active {
  transition:
    opacity 0.2s ease,
    transform 0.2s ease;
}
.notification-enter-from {
  opacity: 0;
  transform: translateX(1rem);
}
.notification-leave-to {
  opacity: 0;
  transform: translateX(1rem);
}
</style>
