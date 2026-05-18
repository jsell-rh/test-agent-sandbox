<script setup lang="ts">
import TodoNewInput from '~/components/TodoNewInput.vue'
import TodoList from '~/components/TodoList.vue'
import TodoFilterBar from '~/components/TodoFilterBar.vue'
import TodoFooter from '~/components/TodoFooter.vue'
import ErrorToast from '~/components/ErrorToast.vue'

const { loadTodos, todos, counts, errorMessages } = useTodos()

onMounted(() => {
  loadTodos()
})
</script>

<template>
  <div class="min-h-screen bg-slate-50 flex flex-col">
    <!-- Header -->
    <header class="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-10">
      <div class="max-w-2xl mx-auto px-4 sm:px-6 h-16 flex items-center gap-3">
        <!-- Logo mark -->
        <div
          class="w-8 h-8 rounded-lg bg-brand-500 flex items-center justify-center flex-shrink-0"
          aria-hidden="true"
        >
          <svg class="w-4 h-4 text-white" viewBox="0 0 16 16" fill="currentColor">
            <path
              fill-rule="evenodd"
              d="M13.854 3.646a.5.5 0 0 1 0 .708l-7 7a.5.5 0 0 1-.708 0l-3.5-3.5a.5.5 0 1 1 .708-.708L6.5 10.293l6.646-6.647a.5.5 0 0 1 .708 0z"
            />
          </svg>
        </div>
        <h1 class="text-xl font-semibold tracking-tight text-slate-900">todos</h1>
        <span
          v-if="counts.all > 0"
          class="ml-auto text-xs font-medium text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full"
          aria-label="`${counts.all} todos total`"
        >
          {{ counts.all }}
        </span>
      </div>
    </header>

    <!-- Main content -->
    <main class="flex-1 max-w-2xl w-full mx-auto px-4 sm:px-6 py-8">
      <div class="space-y-4">
        <!-- New todo input -->
        <TodoNewInput />

        <!-- Filter bar (only shown when todos exist) -->
        <TodoFilterBar v-if="counts.all > 0" />

        <!-- Todo list -->
        <TodoList />

        <!-- Footer bar -->
        <TodoFooter v-if="counts.all > 0" />
      </div>
    </main>

    <!-- Error toasts -->
    <ErrorToast :messages="errorMessages" />
  </div>
</template>
