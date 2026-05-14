<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { createTodosApiClient, TODOS_PATH_SEGMENT } from '~/composables/useTodosApi'
import { useTodos } from '~/composables/useTodos'

useHead({
  title: 'todos',
  meta: [
    { name: 'description', content: 'Enterprise todo application' },
    { name: 'viewport', content: 'width=device-width, initial-scale=1' },
  ],
})

const { public: runtimePublic } = useRuntimeConfig()
const todosUrl = `${runtimePublic.apiBase}${TODOS_PATH_SEGMENT}`
const api = createTodosApiClient(todosUrl)

const {
  todos,
  filteredTodos,
  filterCriteria,
  editingTodoId,
  errors,
  activeCount,
  completedCount,
  totalCount,
  loadTodos,
  createTodo,
  toggleTodo,
  updateTodoTitle,
  deleteTodo,
  clearCompleted,
  setFilter,
  startEditing,
  stopEditing,
  dismissError,
} = useTodos(api)

/** Ref for the NewTodoInput so we can call clear() on it after success. */
const newTodoInputRef = ref<{ clear: () => void } | null>(null)

/** Handle new todo submission — clear input only on API success. */
async function handleSubmitTodo(title: string): Promise<void> {
  const succeeded = await createTodo(title)
  if (succeeded) {
    newTodoInputRef.value?.clear()
  }
}

/**
 * Handle saving an edited todo.
 *
 * Empty title means the user wants to delete the item (spec requirement:
 * "Submitting an empty string deletes the Todo").
 */
async function handleSaveEdit(id: string, newTitle: string): Promise<void> {
  if (!newTitle.trim()) {
    await deleteTodo(id)
  }
  else {
    await updateTodoTitle(id, newTitle)
  }
}

onMounted(async () => {
  await loadTodos()
})
</script>

<template>
  <div class="app-wrapper">
    <main class="app-container">
      <AppHeader />

      <section class="todo-card" aria-label="Todo list">
        <!-- New todo input -->
        <NewTodoInput
          ref="newTodoInputRef"
          @submit="handleSubmitTodo"
        />

        <!-- Todo list -->
        <TodoList
          v-if="filteredTodos.length > 0"
          :todos="filteredTodos"
          :editing-todo-id="editingTodoId"
          @toggle="toggleTodo"
          @delete="deleteTodo"
          @start-edit="startEditing"
          @save-edit="handleSaveEdit"
          @cancel-edit="stopEditing"
        />

        <!-- Empty state -->
        <EmptyState
          v-else
          :filter="filterCriteria"
        />

        <!-- Footer (only when there are todos) -->
        <FooterBar
          v-if="totalCount > 0"
          :active-count="activeCount"
          :completed-count="completedCount"
          :filter-criteria="filterCriteria"
          @filter-change="setFilter"
          @clear-completed="clearCompleted"
        />
      </section>
    </main>

    <!-- Error notifications -->
    <ErrorBanner
      :errors="errors"
      @dismiss="dismissError"
    />
  </div>
</template>

<style scoped>
.app-wrapper {
  min-height: 100vh;
  background: var(--color-bg);
}

.app-container {
  max-width: 36rem;
  margin: 0 auto;
  padding: 0 1rem 6rem;
}

.todo-card {
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-card);
  overflow: hidden;
}

/* Pseudo-shadow layers below the card (TodoMVC-inspired) */
.todo-card::before,
.todo-card::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 100%;
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-card);
  z-index: -1;
}

.todo-card::before {
  transform: translateY(2px) scaleX(0.97);
  opacity: 0.7;
}

.todo-card::after {
  transform: translateY(4px) scaleX(0.94);
  opacity: 0.4;
}
</style>
