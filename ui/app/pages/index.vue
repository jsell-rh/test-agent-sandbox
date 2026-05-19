<template>
  <div class="app-wrapper">
    <!-- Application header -->
    <header class="app-header">
      <h1 class="app-title">todos</h1>
    </header>

    <main class="app-container" aria-label="Todo list application">
      <div class="card">
        <!-- New todo input -->
        <section class="new-todo-section" aria-label="Add new todo">
          <input
            ref="newTodoInputRef"
            v-model="newTodoText"
            type="text"
            class="new-todo-input"
            placeholder="What needs to be done?"
            aria-label="New todo title"
            maxlength="500"
            @keydown.enter.prevent="handleCreate"
            @keydown.escape.prevent="newTodoText = ''"
          />
        </section>

        <!-- Filter bar (top) — only shown when todos exist -->
        <nav
          v-if="counts.all > 0"
          class="filter-bar"
          aria-label="Filter todos"
        >
          <button
            v-for="tab in FILTER_TABS"
            :key="tab.value"
            type="button"
            class="filter-tab"
            :class="{ active: filter === tab.value }"
            :aria-pressed="filter === tab.value"
            @click="setFilter(tab.value)"
          >
            {{ tab.label }}
          </button>
        </nav>

        <!-- Todo list -->
        <ul class="todo-list" aria-label="Todo items">
          <!-- Empty state -->
          <li v-if="filteredTodos.length === 0 && counts.all > 0" class="todo-list-empty">
            No {{ filter === 'all' ? '' : filter }} todos.
          </li>

          <li v-else-if="filteredTodos.length === 0" class="todo-list-empty">
            Add your first todo above ↑
          </li>

          <TodoItem
            v-for="todo in filteredTodos"
            :key="todo.id"
            :todo="todo"
            :is-editing="editingTodoId === todo.id"
            @toggle="toggleTodo"
            @start-edit="startEditing"
            @save-edit="handleSaveEdit"
            @cancel-edit="cancelEditing"
            @delete="deleteTodo"
          />
        </ul>

        <!-- Footer bar — visible only when at least one todo exists -->
        <footer v-if="counts.all > 0" class="footer-bar" aria-label="Todo summary">
          <div class="footer-count" aria-live="polite" aria-atomic="true">
            {{ counts.active }} {{ counts.active === 1 ? 'item' : 'items' }} left
          </div>

          <nav class="footer-filters" aria-label="Filter todos">
            <button
              v-for="tab in FILTER_TABS"
              :key="tab.value"
              type="button"
              class="filter-tab"
              :class="{ active: filter === tab.value }"
              :aria-pressed="filter === tab.value"
              @click="setFilter(tab.value)"
            >
              {{ tab.label }}
            </button>
          </nav>

          <div class="footer-actions">
            <button
              v-if="counts.completed > 0"
              type="button"
              class="clear-completed-btn"
              aria-label="Clear all completed todos"
              @click="clearCompleted"
            >
              Clear completed
            </button>
          </div>
        </footer>
      </div>
    </main>

    <!-- Error notifications -->
    <ErrorBanners :errors="errors" @dismiss="dismissError" />
  </div>
</template>

<script setup lang="ts">
import type { FilterCriteria } from '~/types/todo'

const {
  todos,
  counts,
  filter,
  editingTodoId,
  errors,
  filteredTodos,
  loadTodos,
  createTodo,
  toggleTodo,
  updateTitle,
  deleteTodo,
  clearCompleted,
  setFilter,
  startEditing,
  cancelEditing,
  dismissError,
} = useTodos()

const FILTER_TABS: { label: string; value: FilterCriteria }[] = [
  { label: 'All', value: 'all' },
  { label: 'Active', value: 'active' },
  { label: 'Completed', value: 'completed' },
]

const newTodoText = ref('')
const newTodoInputRef = ref<HTMLInputElement | null>(null)

// Load todos on mount
onMounted(() => {
  loadTodos()
})

async function handleCreate(): Promise<void> {
  if (!newTodoText.value.trim()) return
  const success = await createTodo(newTodoText.value)
  if (success) {
    newTodoText.value = ''
    nextTick(() => newTodoInputRef.value?.focus())
  }
}

async function handleSaveEdit(id: string, title: string): Promise<void> {
  await updateTitle(id, title)
}

// Page metadata
useHead({
  title: 'todos',
})
</script>
