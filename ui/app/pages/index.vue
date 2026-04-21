<script setup lang="ts">
// Home page — placeholder for the Todo application (implemented in task-009).
// This page is intentionally minimal: the real UI wiring happens once the
// REST endpoints (task-009) are available.

definePageMeta({
  title: 'Todos',
})

useSeoMeta({
  title: 'Todos',
  description: 'Enterprise-grade todo management',
})
</script>

<template>
  <div class="page-home">
    <h1 class="page-home__title">todos</h1>
    <p class="page-home__subtitle">
      Manage your tasks with clarity and focus.
    </p>

    <!-- Todo interface will be wired here in subsequent tasks -->
    <div class="page-home__content" data-testid="todo-container">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.page-home {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.5rem;
}

.page-home__title {
  font-size: 5rem;
  font-weight: 100;
  color: var(--color-brand-900);
  letter-spacing: -0.05em;
  opacity: 0.35;
  line-height: 1;
  margin: 0;
  text-align: center;
}

.page-home__subtitle {
  font-size: 0.875rem;
  color: var(--color-text-secondary);
  margin: 0;
  text-align: center;
}

.page-home__content {
  width: 100%;
}
</style>
