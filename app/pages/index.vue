<script setup lang="ts">
/**
 * Main page — full Todo list application.
 *
 * Layout (top → bottom):
 *   Header      → app title "todos"
 *   New input   → create todo on Enter
 *   Todo list   → TodoItem components, filtered by store.filterCriteria
 *   Empty state → contextual message when filtered list is empty
 *   Footer      → active count · filter tabs · "Clear completed"
 *   Toast area  → transient API error messages (auto-dismiss 5s)
 *
 * All data operations are delegated to useTodoActions().
 * Reactive UI state lives in the Pinia todos store.
 */
import { ref, onMounted } from 'vue'
import { useTodosStore } from '~/stores/todos'
import TodoItem from '~/components/TodoItem.vue'

const store = useTodosStore()
const { loadTodos, createTodo, toggleTodo, updateTitle, deleteTodo, clearCompleted } =
  useTodoActions()

// ── New-todo input ────────────────────────────────────────────────────────────

const newTitle = ref('')

async function handleNewTodo(): Promise<void> {
  if (!newTitle.value.trim()) return
  const ok = await createTodo(newTitle.value)
  if (ok) newTitle.value = ''
}

function handleNewTodoKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape') {
    newTitle.value = ''
  }
}

// ── Filter tabs ───────────────────────────────────────────────────────────────

const filterTabs = [
  { label: 'All', value: 'all' },
  { label: 'Active', value: 'active' },
  { label: 'Completed', value: 'completed' },
] as const

// ── Empty state message ───────────────────────────────────────────────────────

const emptyMessages: Record<string, string> = {
  all: 'No todos yet — add one above.',
  active: 'All done! No active todos.',
  completed: 'Nothing completed yet.',
}

// ── Bootstrap ─────────────────────────────────────────────────────────────────

onMounted(() => loadTodos())
</script>

<template>
  <main class="todo-page">
    <!-- ── Header ──────────────────────────────────────────────────────────── -->
    <header class="todo-header">
      <h1 class="todo-title">todos</h1>
    </header>

    <!-- ── App card ────────────────────────────────────────────────────────── -->
    <section class="todo-card" aria-label="Todo application">

      <!-- New todo input -->
      <div class="todo-new">
        <input
          v-model="newTitle"
          class="todo-new__input"
          type="text"
          placeholder="What needs to be done?"
          aria-label="New todo title"
          maxlength="500"
          :disabled="store.loading && store.todos.length === 0"
          @keydown.enter.prevent="handleNewTodo"
          @keydown="handleNewTodoKeydown"
        />
      </div>

      <!-- Loading skeleton (first load only) -->
      <Transition name="fade">
        <div v-if="store.loading && store.todos.length === 0" class="todo-loading" aria-live="polite" aria-busy="true">
          <span class="sr-only">Loading todos…</span>
          <div v-for="n in 3" :key="n" class="todo-loading__row" />
        </div>
      </Transition>

      <!-- Todo list -->
      <TransitionGroup
        v-if="!store.loading || store.todos.length > 0"
        tag="ul"
        name="slide-down"
        class="todo-list"
        role="list"
        aria-label="Todo items"
      >
        <TodoItem
          v-for="todo in store.filteredTodos"
          :key="todo.id"
          :todo="todo"
          :editing="store.editingTodoId === todo.id"
          @toggle="toggleTodo(todo)"
          @update-title="(title) => updateTitle(todo, title)"
          @delete="deleteTodo(todo)"
          @start-edit="store.startEditing(todo.id)"
          @stop-edit="store.stopEditing()"
        />
      </TransitionGroup>

      <!-- Empty state -->
      <Transition name="fade">
        <div
          v-if="!store.loading && store.filteredTodos.length === 0"
          class="todo-empty"
          aria-live="polite"
        >
          <p class="todo-empty__text">
            {{ emptyMessages[store.filterCriteria] }}
          </p>
        </div>
      </Transition>

      <!-- Footer (only when todos exist) -->
      <Transition name="fade">
        <footer v-if="store.hasAnyTodos" class="todo-footer">
          <!-- Active count -->
          <span class="todo-footer__count" aria-live="polite">
            {{ store.counts.active }}
            {{ store.counts.active === 1 ? 'item' : 'items' }} left
          </span>

          <!-- Filter tabs -->
          <nav class="todo-filter" aria-label="Filter todos">
            <button
              v-for="tab in filterTabs"
              :key="tab.value"
              class="todo-filter__tab"
              :class="{ 'todo-filter__tab--active': store.filterCriteria === tab.value }"
              :aria-current="store.filterCriteria === tab.value ? 'page' : undefined"
              type="button"
              @click="store.setFilter(tab.value)"
            >
              {{ tab.label }}
            </button>
          </nav>

          <!-- Clear completed -->
          <Transition name="fade">
            <button
              v-if="store.hasCompletedTodos"
              class="todo-footer__clear btn btn-ghost"
              type="button"
              @click="clearCompleted"
            >
              Clear completed
            </button>
          </Transition>

          <!-- Spacer to maintain layout when button is hidden -->
          <span v-if="!store.hasCompletedTodos" class="todo-footer__spacer" aria-hidden="true" />
        </footer>
      </Transition>
    </section>

    <!-- ── Toast errors ─────────────────────────────────────────────────────── -->
    <TransitionGroup
      tag="ul"
      name="slide-down"
      class="todo-toasts"
      aria-live="assertive"
      aria-label="Notifications"
      role="list"
    >
      <li
        v-for="error in store.errors"
        :key="error.id"
        class="todo-toast"
        role="alert"
      >
        <span class="todo-toast__message">{{ error.message }}</span>
        <button
          class="todo-toast__dismiss btn btn-ghost"
          :aria-label="`Dismiss: ${error.message}`"
          type="button"
          @click="store.dismissError(error.id)"
        >
          &times;
        </button>
      </li>
    </TransitionGroup>
  </main>
</template>

<style scoped>
/* ── Page shell ───────────────────────────────────────────────────────────── */

.todo-page {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: var(--space-16) var(--space-4) var(--space-8);
  min-height: 100dvh;
  background-color: var(--color-bg);
}

/* ── Header ───────────────────────────────────────────────────────────────── */

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

/* ── Card ─────────────────────────────────────────────────────────────────── */

.todo-card {
  width: 100%;
  max-width: var(--content-max-width);
  background-color: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-lg);
  overflow: hidden;
}

/* ── New todo input ───────────────────────────────────────────────────────── */

.todo-new {
  padding: var(--space-4) var(--space-5);
  border-bottom: 1px solid var(--color-border);
}

.todo-new__input {
  width: 100%;
  padding: var(--space-3) var(--space-4);
  font-size: var(--font-size-md);
  color: var(--color-text-primary);
  background-color: transparent;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  outline: none;
  transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
}

.todo-new__input::placeholder {
  color: var(--color-text-muted);
}

.todo-new__input:focus {
  border-color: var(--color-border-focus);
  box-shadow: 0 0 0 3px var(--color-accent-light);
}

.todo-new__input:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* ── Loading skeleton ─────────────────────────────────────────────────────── */

.todo-loading {
  padding: var(--space-4) var(--space-5);
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.todo-loading__row {
  height: 24px;
  background: linear-gradient(
    90deg,
    var(--color-border) 25%,
    var(--color-bg) 50%,
    var(--color-border) 75%
  );
  background-size: 200% 100%;
  border-radius: var(--radius-sm);
  animation: shimmer 1.5s infinite;
}

.todo-loading__row:nth-child(2) { width: 80%; }
.todo-loading__row:nth-child(3) { width: 60%; }

@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

/* ── Todo list ────────────────────────────────────────────────────────────── */

.todo-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

/* ── Empty state ──────────────────────────────────────────────────────────── */

.todo-empty {
  padding: var(--space-10) var(--space-8);
  text-align: center;
}

.todo-empty__text {
  color: var(--color-text-muted);
  font-size: var(--font-size-sm);
}

/* ── Footer ───────────────────────────────────────────────────────────────── */

.todo-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-3) var(--space-5);
  border-top: 1px solid var(--color-border);
  gap: var(--space-4);
  min-height: 48px;
}

.todo-footer__count {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  white-space: nowrap;
  flex: 0 0 auto;
  min-width: 80px;
}

.todo-footer__spacer {
  flex: 0 0 auto;
  min-width: 80px;
}

.todo-footer__clear {
  font-size: var(--font-size-sm);
  padding: var(--space-1) var(--space-3);
  flex: 0 0 auto;
}

/* ── Filter tabs ──────────────────────────────────────────────────────────── */

.todo-filter {
  display: flex;
  gap: var(--space-1);
  flex: 0 0 auto;
}

.todo-filter__tab {
  padding: var(--space-1) var(--space-3);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-secondary);
  background: transparent;
  border: 1px solid transparent;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: color var(--transition-fast), border-color var(--transition-fast),
    background-color var(--transition-fast);
}

.todo-filter__tab:hover {
  color: var(--color-text-primary);
  border-color: var(--color-border);
}

.todo-filter__tab--active {
  color: var(--color-accent);
  border-color: var(--color-accent);
  background-color: var(--color-accent-light);
}

/* ── Toast notifications ──────────────────────────────────────────────────── */

.todo-toasts {
  list-style: none;
  position: fixed;
  bottom: var(--space-6);
  right: var(--space-6);
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  z-index: 100;
  max-width: 400px;
  width: calc(100vw - var(--space-8));
}

.todo-toast {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  background-color: var(--color-surface);
  border: 1px solid var(--color-danger);
  border-left-width: 4px;
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-md);
}

.todo-toast__message {
  flex: 1;
  font-size: var(--font-size-sm);
  color: var(--color-text-primary);
}

.todo-toast__dismiss {
  flex-shrink: 0;
  padding: var(--space-1);
  font-size: var(--font-size-lg);
  line-height: 1;
  width: 24px;
  height: 24px;
  border-radius: var(--radius-sm);
}

/* ── Responsive ───────────────────────────────────────────────────────────── */

@media (max-width: 480px) {
  .todo-footer {
    flex-wrap: wrap;
    justify-content: center;
    gap: var(--space-2);
  }

  .todo-footer__count {
    order: 2;
    min-width: auto;
    flex-basis: 100%;
    text-align: center;
  }

  .todo-filter {
    order: 1;
    justify-content: center;
  }

  .todo-footer__clear,
  .todo-footer__spacer {
    order: 3;
    min-width: auto;
  }

  .todo-toasts {
    bottom: var(--space-4);
    right: var(--space-4);
    left: var(--space-4);
    width: auto;
    max-width: none;
  }
}
</style>
