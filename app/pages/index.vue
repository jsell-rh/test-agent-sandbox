<template>
  <main class="todo-page">
    <header class="todo-header">
      <h1 class="todo-title">todos</h1>
    </header>

    <section class="todo-card" aria-label="Todo application">
      <!--
        Placeholder content — replaced by full component tree in task-011.
        Keeps the page functional as a shell during scaffold phase.
      -->
      <div class="todo-placeholder">
        <p class="todo-placeholder__text">
          Todo list will be rendered here.
        </p>
      </div>
    </section>
  </main>
</template>

<style scoped>
.todo-page {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: var(--space-16) var(--space-4) var(--space-8);
  min-height: 100dvh;
  background-color: var(--color-bg);
}

.todo-header {
  text-align: center;
  margin-bottom: var(--space-8);
}

.todo-title {
  font-size: clamp(2.5rem, 6vw, 4rem);
  font-weight: var(--font-weight-bold);
  letter-spacing: -0.03em;
  color: var(--color-accent);
  line-height: var(--line-height-tight);
}

.todo-card {
  width: 100%;
  max-width: var(--content-max-width);
  background-color: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-lg);
  overflow: hidden;
}

.todo-placeholder {
  padding: var(--space-12) var(--space-8);
  text-align: center;
}

.todo-placeholder__text {
  color: var(--color-text-muted);
  font-size: var(--font-size-sm);
}
</style>
