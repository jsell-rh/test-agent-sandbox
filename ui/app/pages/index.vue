<script setup lang="ts">
const {
  todos,
  filteredTodos,
  counts,
  filter,
  editingTodoId,
  loading,
  fetchTodos,
  createTodo,
  toggleTodo,
  updateTitle,
  deleteTodo,
  clearCompleted,
} = useTodos()

// Load todos on page mount
onMounted(fetchTodos)
</script>

<template>
  <div class="mx-auto px-4 py-12 sm:py-16" style="max-width: var(--todo-max-width)">
    <!-- Header -->
    <AppHeader />

    <!-- Main card -->
    <div class="mt-8 space-y-0">
      <!-- New-todo input always visible -->
      <TodoInput :on-create="createTodo" />

      <!-- Loading skeleton -->
      <div v-if="loading" class="mt-4 bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-6">
        <div class="space-y-3">
          <div
            v-for="n in 3"
            :key="n"
            class="h-5 bg-gray-100 dark:bg-gray-800 rounded animate-pulse"
          />
        </div>
      </div>

      <!-- Todo list + footer (visible when at least one todo exists) -->
      <template v-else-if="todos.length > 0">
        <div class="mt-4 bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden">
          <!-- Filter bar (above the list) -->
          <div class="px-4 pt-3 pb-2 border-b border-gray-100 dark:border-gray-800">
            <FilterTabs v-model="filter" />
          </div>

          <!-- List or empty-state -->
          <TransitionGroup
            v-if="filteredTodos.length > 0"
            tag="ul"
            name="slide"
            role="list"
            aria-label="Todo list"
            class="divide-y divide-gray-100 dark:divide-gray-800"
          >
            <TodoItem
              v-for="todo in filteredTodos"
              :key="todo.id"
              :todo="todo"
              :is-editing="editingTodoId === todo.id"
              @toggle="toggleTodo(todo)"
              @edit-start="editingTodoId = todo.id"
              @edit-commit="updateTitle(todo.id, $event)"
              @edit-cancel="editingTodoId = null"
              @delete="deleteTodo(todo.id)"
            />
          </TransitionGroup>

          <!-- Empty state for filtered view -->
          <EmptyState v-else :filter="filter" />

          <!-- Footer bar -->
          <FooterBar
            :active-count="counts.active"
            :completed-count="counts.completed"
            :filter="filter"
            @update:filter="filter = $event"
            @clear-completed="clearCompleted"
          />
        </div>
      </template>

      <!-- First-run empty state (no todos at all) -->
      <div
        v-else
        class="mt-4 text-center py-16 text-gray-400 dark:text-gray-500"
      >
        <p class="text-base font-medium">No todos yet</p>
        <p class="mt-1 text-sm">Add your first task above to get started.</p>
      </div>
    </div>
  </div>
</template>
