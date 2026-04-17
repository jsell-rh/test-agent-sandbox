---
id: task-018
title: Todo state management composable (todos[], FilterCriteria, editingTodoId)
spec_ref: specs/interface.spec.md
status: not-started
phase: null
deps: [task-016, task-017]
round: 0
branch: null
pr: null
---

## Summary

Implement the `useTodos` composable encapsulating the UI state machine from the spec.

**State**:
```
todos: Todo[]           // source of truth from API
filterCriteria: 'all' | 'active' | 'completed'  // default: 'all'
editingTodoId: string | null                      // default: null
```

**Derived**:
- `filteredTodos` — client-side filter over `todos[]` (no extra network request).
- `counts` — `{ all, active, completed }` computed from `todos[]`.

**Actions** (call API via `useTodoApi`, then mutate state):
- `loadTodos()` — initial load via `GET /api/todos`.
- `createTodo(title)` — prepend to `todos[]` on success; clear input state.
- `setFilter(criteria)` — update `filterCriteria`.
- `startEditing(id)` / `stopEditing()` — manage `editingTodoId`.
