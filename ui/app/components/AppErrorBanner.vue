<script setup lang="ts">
/**
 * AppErrorBanner — displays an error message that auto-dismisses after 5s.
 *
 * Spec: "Error display: Inline messages auto-dismiss after 5s"
 *       (specs/interface.spec.md — UI Non-Functional Requirements)
 */

interface Props {
  message: string
  /** Duration in ms before the banner dismisses itself (default 5000) */
  duration?: number
}

const props = withDefaults(defineProps<Props>(), {
  duration: 5_000,
})

const emit = defineEmits<{
  dismiss: []
}>()

const visible = ref(true)
let timer: ReturnType<typeof setTimeout>

watch(
  () => props.message,
  () => {
    visible.value = true
    clearTimeout(timer)
    timer = setTimeout(dismiss, props.duration)
  },
  { immediate: true },
)

onUnmounted(() => clearTimeout(timer))

function dismiss() {
  visible.value = false
  emit('dismiss')
}
</script>

<template>
  <Transition name="banner">
    <div
      v-if="visible"
      role="alert"
      aria-live="assertive"
      aria-atomic="true"
      class="app-error-banner"
    >
      <span class="app-error-banner__message">{{ message }}</span>
      <button
        class="app-error-banner__close"
        aria-label="Dismiss error"
        @click="dismiss"
      >
        &times;
      </button>
    </div>
  </Transition>
</template>

<style scoped>
.app-error-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  background: #fff5f5;
  border: 1px solid #fc8181;
  border-radius: 0.5rem;
  color: #c53030;
  font-size: 0.875rem;
}

.app-error-banner__close {
  background: transparent;
  border: none;
  cursor: pointer;
  color: inherit;
  font-size: 1.25rem;
  line-height: 1;
  padding: 0;
  opacity: 0.7;
  transition: opacity var(--transition-fast);
}

.app-error-banner__close:hover {
  opacity: 1;
}

.banner-enter-active,
.banner-leave-active {
  transition: opacity var(--transition-fast), transform var(--transition-fast);
}

.banner-enter-from,
.banner-leave-to {
  opacity: 0;
  transform: translateY(-0.5rem);
}
</style>
