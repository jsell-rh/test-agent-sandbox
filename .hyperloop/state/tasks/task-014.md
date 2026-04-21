---
id: task-014
title: UI State Management
spec_ref: specs/interface.spec.md
status: not-started
phase: null
deps: [task-012, task-013]
round: 0
branch: null
pr: null
---

Implement the UI state store (Pinia or a Nuxt composable) managing the full UI State Machine from the spec.

### State shape

```ts
{
  todos:          Todo[]              // source of truth from API; ordered newest-first
  filter:         FilterCriteria      // 'all' | 'active' | 'completed', default 'all'
  editingTodoId:  string | null       // default null
  counts:         { all, active, completed }
  error:          string | null       // current inline error message
}
```

### Actions (all wired to `useTodoApi`)

- `loadTodos()` — on page load, calls `listTodos()`, populates `todos` and `counts`
- `createTodo(title)` — calls `createTodo(title)`, prepends result to `todos[]`, clears input signal
- `toggleTodo(id)` — **optimistic**: immediately flips status in `todos[]`, calls `updateTodo`, reverts on error
- `updateTitle(id, newTitle)` — calls `updateTodo`, updates todo in `todos[]` on success
- `deleteTodo(id)` — **optimistic**: immediately removes from `todos[]`, calls `deleteTodo`, restores on error
- `clearCompleted()` — calls `clearCompleted()`, removes all completed from `todos[]` on success
- `setFilter(filter)` — sets `filter` (client-side; no API call)
- `setEditingTodo(id | null)` — sets `editingTodoId`
- `setError(message | null)` — sets `error`; auto-clears after 5s when non-null

### Derived / computed

- `filteredTodos` — `todos` filtered by current `filter` (no API call)
- `activeCount` — count of `active` todos in `todos[]`
- `completedCount` — count of `completed` todos in `todos[]`

### Critical test cases

- `filteredTodos` correctly filters without network requests
- Optimistic toggle reverts on API error
- Optimistic delete restores item on API error
- `setError` auto-clears after 5s
- `activeCount` reflects current `todos[]` after toggling
