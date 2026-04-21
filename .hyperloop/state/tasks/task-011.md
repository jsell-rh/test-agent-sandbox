---
id: task-011
title: UI app shell, API client, and state store
spec_ref: specs/interface.spec.md
status: not-started
phase: null
deps: [task-005, task-009, task-010]
round: 0
branch: null
pr: null
---

Implement the Nuxt 4 SPA foundation: the app shell layout, a typed API client, and the Pinia state store that owns UI state.

**UI state (Pinia store):**
```
todos:          Todo[]           // source of truth from API
filterCriteria: FilterCriteria  // all | active | completed (default: all)
editingTodoId:  TodoId | null   // default null
```

**API client (typed fetch wrapper for all endpoints):**
- `listTodos(filter?: FilterCriteria): Promise<{ todos, counts }>`
- `createTodo(title: string): Promise<Todo>`
- `getTodo(id: TodoId): Promise<Todo>`
- `updateTodo(id: TodoId, patch: { title?: string, status?: TodoStatus }): Promise<Todo>`
- `deleteTodo(id: TodoId): Promise<void>`
- `clearCompleted(): Promise<{ deletedCount: number }>`

**App shell:**
- Single-page layout (`pages/index.vue` or equivalent)
- Header with application title "todos"
- On page load: call `listTodos()`, populate `todos[]` in store
- Enterprise, clean visual style baseline (spacing, typography, colour scheme)

**Tests:**
- Store initialises with `filterCriteria: 'all'`, `editingTodoId: null`, `todos: []`
- `listTodos` API call populates store on page load
- API client methods are typed correctly (TypeScript compilation passes)
