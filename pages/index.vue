<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-950 py-16 px-4">
    <div class="max-w-xl mx-auto">
      <!-- Application header -->
      <h1
        class="text-6xl font-thin text-center text-indigo-400/80 dark:text-indigo-500/60 tracking-wider mb-10 select-none"
      >
        todos
      </h1>

      <!-- Main card -->
      <div
        class="bg-white dark:bg-gray-900 rounded-lg shadow-[0_2px_4px_rgba(0,0,0,.2),0_25px_50px_rgba(0,0,0,.1)]"
      >
        <!-- New todo input -->
        <TodoInput ref="todoInputRef" @create="handleCreate" />

        <!-- Todo list (ordered newest first — from API) -->
        <TodoList
          v-if="todos.length > 0"
          :todos="filteredTodos"
          :editing-todo-id="editingTodoId"
          @toggle="handleToggle"
          @delete="handleDelete"
          @edit-start="handleEditStart"
          @edit-submit="handleEditSubmit"
          @edit-cancel="stopEditing"
        />

        <!-- Empty state: shown when the filtered list is empty but todos exist -->
        <div
          v-else-if="counts.all > 0 && filteredTodos.length === 0"
          class="py-12 text-center text-sm text-gray-400 dark:text-gray-600"
          aria-live="polite"
        >
          No {{ filter }} todos yet.
        </div>

        <!-- Empty state: no todos at all -->
        <div
          v-else-if="counts.all === 0"
          class="py-12 text-center text-sm text-gray-300 dark:text-gray-700"
          aria-live="polite"
        >
          Nothing here yet — add your first todo above.
        </div>

        <!-- Footer: visible only when at least one todo exists -->
        <TodoFooter
          v-if="counts.all > 0"
          :active-count="counts.active"
          :completed-count="counts.completed"
          :current-filter="filter"
          @filter-change="setFilter"
          @clear-completed="handleClearCompleted"
        />
      </div>

      <p class="text-center text-xs text-gray-300 dark:text-gray-700 mt-8 select-none">
        Double-click a todo to edit it
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
const {
  todos,
  counts,
  filter,
  editingTodoId,
  filteredTodos,
  loadTodos,
  createTodo,
  updateTodo,
  deleteTodo,
  clearCompleted,
  setFilter,
  startEditing,
  stopEditing,
} = useTodos()

// Template ref to the input component
const todoInputRef = ref<{ clear: () => void } | null>(null)

// Hydrate state on first load
await useAsyncData('todos', () => loadTodos())

/** Create handler — clears input only on confirmed success. */
const handleCreate = async (title: string) => {
  try {
    await createTodo(title)
    todoInputRef.value?.clear()
  } catch {
    // Error already surfaced via useErrors; input intentionally not cleared.
  }
}

const handleToggle = async (id: string) => {
  const todo = todos.value.find((t) => t.id === id)
  if (!todo) return
  const newStatus = todo.status === 'active' ? 'completed' : 'active'
  try {
    await updateTodo(id, { status: newStatus })
  } catch {
    // Rollback handled inside useTodos.
  }
}

const handleDelete = async (id: string) => {
  try {
    await deleteTodo(id)
  } catch {
    // Rollback handled inside useTodos.
  }
}

const handleEditStart = (id: string) => {
  startEditing(id)
}

const handleEditSubmit = async (id: string, title: string) => {
  if (!title.trim()) {
    // Blank submission → delete the todo
    try {
      await deleteTodo(id)
    } catch {
      // Rollback handled inside useTodos.
    }
    stopEditing()
    return
  }
  try {
    await updateTodo(id, { title })
  } catch {
    // Rollback handled inside useTodos.
  }
  stopEditing()
}

const handleClearCompleted = async () => {
  try {
    await clearCompleted()
  } catch {
    // Rollback handled inside useTodos.
  }
}

// Page metadata
useSeoMeta({
  title: 'todos',
  description: 'Enterprise todo management',
})
</script>
