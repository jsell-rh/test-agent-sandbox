<script setup lang="ts">
/**
 * Main Todo page — implements the full UI state machine from interface.spec.md.
 *
 * State:
 *   todos[]         — source of truth synced from API on mount
 *   filterCriteria  — all | active | completed  (default: all)
 *   editingTodoId   — TodoId | null             (default: null)
 *   errors[]        — auto-dismissing messages  (5 s TTL)
 *
 * All filter changes are client-side (no extra network requests).
 * Toggle and delete use optimistic updates with rollback on failure.
 */

import { FILTER_VALUES, type FilterCriteria } from '~/composables/useTodos'

const {
  todos,
  filterCriteria,
  editingTodoId,
  errors,
  filteredTodos,
  counts,
  loadTodos,
  createTodo,
  toggleTodo,
  deleteTodo,
  submitEdit,
  cancelEdit,
  startEdit,
  clearCompleted,
  setFilter,
  dismissError,
} = useTodos()

// ── New-todo input ───────────────────────────────────────────────────────────
const newTodoTitle = ref('')

async function handleNewTodoKeydown(event: KeyboardEvent): Promise<void> {
  if (event.key === 'Enter') {
    const submitted = await createTodo(newTodoTitle.value)
    if (submitted) newTodoTitle.value = ''
  } else if (event.key === 'Escape') {
    newTodoTitle.value = ''
  }
}

// ── Filter label helpers ─────────────────────────────────────────────────────
const FILTER_LABELS: Record<FilterCriteria, string> = {
  all: 'All',
  active: 'Active',
  completed: 'Completed',
}

const emptyStateMessage = computed<string>(() => {
  if (filterCriteria.value === 'active') return 'No active todos — great work!'
  if (filterCriteria.value === 'completed') return 'No completed todos yet.'
  return 'No todos yet. Add one above!'
})

// ── Page setup ───────────────────────────────────────────────────────────────
onMounted(loadTodos)

useHead({ title: 'todos' })
</script>

<template>
  <div class="min-h-screen bg-gray-100">
    <!-- ── Error toast rail ──────────────────────────────────────────────── -->
    <div
      role="region"
      aria-label="Notifications"
      aria-live="polite"
      class="fixed top-4 right-4 z-50 flex flex-col gap-2"
    >
      <div
        v-for="error in errors"
        :key="error.id"
        role="alert"
        class="
          flex items-center gap-3 rounded-lg border border-red-200
          bg-red-50 px-4 py-3 text-sm text-red-800 shadow-lg
        "
      >
        <span class="flex-1">{{ error.message }}</span>
        <button
          class="text-red-500 hover:text-red-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
          aria-label="Dismiss notification"
          @click="dismissError(error.id)"
        >
          ✕
        </button>
      </div>
    </div>

    <!-- ── Page content ──────────────────────────────────────────────────── -->
    <div class="mx-auto max-w-xl px-4 py-16">
      <!-- Header -->
      <h1
        class="
          mb-8 text-center font-thin tracking-widest
          text-6xl text-rose-400
        "
      >
        todos
      </h1>

      <!-- Main card -->
      <div class="overflow-hidden rounded-md bg-white shadow-xl">
        <!-- New-todo input -->
        <div class="flex items-center border-b border-gray-100">
          <input
            v-model="newTodoTitle"
            type="text"
            placeholder="What needs to be done?"
            aria-label="New todo title"
            class="
              w-full px-5 py-4 text-xl text-gray-700 outline-none
              placeholder:text-gray-300
            "
            @keydown="handleNewTodoKeydown"
          />
        </div>

        <!-- Todo list -->
        <ul v-if="filteredTodos.length > 0" role="list" aria-label="Todo items">
          <TodoItem
            v-for="todo in filteredTodos"
            :key="todo.id"
            :todo="todo"
            :editing="editingTodoId === todo.id"
            @toggle="toggleTodo(todo.id)"
            @delete="deleteTodo(todo.id)"
            @start-edit="startEdit(todo.id)"
            @submit-edit="(title) => submitEdit(todo.id, title)"
            @cancel-edit="cancelEdit()"
          />
        </ul>

        <!-- Empty state -->
        <div
          v-else
          class="py-14 text-center text-base text-gray-400"
          aria-live="polite"
        >
          {{ emptyStateMessage }}
        </div>

        <!-- Footer bar (visible only when at least one todo exists) -->
        <footer
          v-if="todos.length > 0"
          class="
            flex items-center justify-between border-t border-gray-100
            px-5 py-3 text-sm text-gray-500
          "
        >
          <!-- Left: active-item count -->
          <span aria-live="polite" aria-atomic="true">
            {{ counts.active }}
            {{ counts.active === 1 ? 'item' : 'items' }} left
          </span>

          <!-- Center: filter tabs -->
          <nav aria-label="Filter todos">
            <ul class="flex gap-1" role="list">
              <li v-for="filter in FILTER_VALUES" :key="filter">
                <button
                  :aria-pressed="filterCriteria === filter"
                  :aria-label="`Show ${FILTER_LABELS[filter]} todos`"
                  class="
                    rounded border px-3 py-1 capitalize
                    transition-colors focus:outline-none
                    focus-visible:ring-2 focus-visible:ring-rose-300
                  "
                  :class="
                    filterCriteria === filter
                      ? 'border-rose-300 text-rose-500'
                      : 'border-transparent hover:border-gray-300'
                  "
                  @click="setFilter(filter)"
                >
                  {{ FILTER_LABELS[filter] }}
                </button>
              </li>
            </ul>
          </nav>

          <!-- Right: clear-completed (visible only when completedCount > 0) -->
          <button
            v-if="counts.completed > 0"
            class="
              hover:text-gray-700 hover:underline
              focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-300
            "
            @click="clearCompleted()"
          >
            Clear completed
          </button>
          <!-- Placeholder to preserve layout when button is hidden -->
          <span v-else aria-hidden="true" class="invisible">Clear completed</span>
        </footer>
      </div>
    </div>
  </div>
</template>
