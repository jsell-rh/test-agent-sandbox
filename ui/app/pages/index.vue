<!--
  Main view: Todo List page.

  State machine implemented here, delegating to useTodos composable.
  All API interactions are coordinated through the composable.

  Spec behaviour:
  - Full todo list loaded on mount via GET /api/todos.
  - Filter is applied client-side (no extra network request).
  - Optimistic updates for toggle and delete; rollback on error.
  - API errors surfaced as non-blocking notifications (auto-dismiss 5s).
  - All actions reachable by keyboard.
-->
<script setup lang="ts">
import type { Todo, FilterCriteria } from '~/types'

const {
  filteredTodos,
  counts,
  filterCriteria,
  editingTodoId,
  isLoading,
  loadTodos,
  createTodo,
  toggleTodo,
  updateTitle,
  deleteTodo,
  clearCompleted,
  setFilter,
  startEditing,
  cancelEditing,
  pushNotification,
} = useTodos()

// ── Initial data load ─────────────────────────────────────────────────────────

onMounted(loadTodos)

// ── Event handlers ────────────────────────────────────────────────────────────

async function handleCreate(title: string): Promise<void> {
  try {
    await createTodo(title)
  } catch (err: unknown) {
    const msg = extractApiMessage(err, 'Failed to create todo.')
    pushNotification(msg)
  }
}

async function handleToggle(todo: Todo): Promise<void> {
  await toggleTodo(todo)
}

async function handleSubmitEdit(todo: Todo, newTitle: string): Promise<void> {
  if (!newTitle) {
    // Empty string → delete the todo (spec requirement)
    await deleteTodo(todo.id)
    return
  }
  try {
    await updateTitle(todo, newTitle)
  } catch (err: unknown) {
    const msg = extractApiMessage(err, 'Failed to update title.')
    pushNotification(msg)
  }
}

async function handleDelete(todoId: string): Promise<void> {
  await deleteTodo(todoId)
}

async function handleClearCompleted(): Promise<void> {
  await clearCompleted()
}

function handleFilterChange(filter: FilterCriteria): void {
  setFilter(filter)
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function extractApiMessage(err: unknown, fallback: string): string {
  if (err && typeof err === 'object' && 'data' in err) {
    const data = (err as { data?: { message?: string } }).data
    if (data?.message) return data.message
  }
  return fallback
}
</script>

<template>
  <main class="mx-auto max-w-2xl px-4 py-16">
    <!-- ── Header ───────────────────────────────────────────────────────────── -->
    <header class="mb-10 text-center">
      <h1 class="text-5xl font-bold tracking-tight text-brand-600 select-none">
        todos
      </h1>
      <p class="mt-2 text-sm text-gray-400 tracking-wide uppercase font-medium">
        Task management
      </p>
    </header>

    <!-- ── Main card ────────────────────────────────────────────────────────── -->
    <div class="rounded-xl bg-white shadow-sm border border-gray-200 overflow-hidden">
      <!-- New todo input -->
      <div class="px-4 pt-4 pb-3">
        <TodoInput @create="handleCreate" />
      </div>

      <!-- Loading skeleton -->
      <div
        v-if="isLoading"
        class="px-4 py-8 flex justify-center"
        aria-label="Loading todos"
        role="status"
      >
        <div class="flex gap-1.5">
          <span
            v-for="i in 3"
            :key="i"
            class="size-2 rounded-full bg-gray-200 animate-bounce"
            :style="{ animationDelay: `${(i - 1) * 0.15}s` }"
          />
        </div>
      </div>

      <!-- Filter bar (above the list) -->
      <div
        v-else-if="counts.all > 0"
        class="px-4 pb-2 pt-1 flex items-center justify-between border-b border-gray-100"
      >
        <FilterTabs
          :current="filterCriteria"
          :counts="counts"
          @change="handleFilterChange"
        />
        <span class="text-xs text-gray-400">
          {{ counts.all }} total
        </span>
      </div>

      <!-- Todo list -->
      <TodoList
        v-if="!isLoading"
        :todos="filteredTodos"
        :current-filter="filterCriteria"
        :editing-todo-id="editingTodoId"
        @toggle="handleToggle"
        @start-edit="startEditing"
        @submit-edit="handleSubmitEdit"
        @cancel-edit="cancelEditing"
        @delete="handleDelete"
      />

      <!-- Footer bar -->
      <FooterBar
        v-if="!isLoading"
        :counts="counts"
        :current-filter="filterCriteria"
        @change-filter="handleFilterChange"
        @clear-completed="handleClearCompleted"
      />
    </div>

    <!-- ── Keyboard shortcut hint ────────────────────────────────────────────── -->
    <p
      v-if="!isLoading && counts.all > 0"
      class="mt-4 text-center text-xs text-gray-300 select-none"
    >
      Double-click a title to edit &middot; Press Esc to cancel
    </p>
  </main>
</template>
