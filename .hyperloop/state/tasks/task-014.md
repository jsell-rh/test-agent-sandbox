---
id: task-014
title: Nuxt 4 UI layout, page shell, and API composable
spec_ref: specs/user-interface.spec.md
status: not-started
phase: null
deps: [task-005]
round: 0
branch: null
pr: null
---

## Scope

Establish the UI foundation: the main page layout, global state, and the composable that wraps all API calls.

### Deliverables

**Layout / Page Shell**
- `app.vue` or `pages/index.vue` — single-page shell with header ("todos"), main content area, footer area
- Enterprise/clean visual style applied (minimal, high contrast, readable typography)
- Responsive layout

**Global State (composable: `useTodos`)**

Manages:
```
todos:          Todo[]           // source of truth from API
filterCriteria: FilterCriteria   // 'all' | 'active' | 'completed', default 'all'
editingTodoId:  TodoId | null    // currently edited item
```

Derived state:
- `filteredTodos` — `todos` filtered by `filterCriteria` (client-side, no extra API call)
- `counts` — `{ all, active, completed }` (from last API response)
- `activeCount` — `counts.active`
- `completedCount` — `counts.completed`

**API Composable (`useTodosApi`)**

Wraps `$fetch` calls to all `/api/todos` endpoints. Returns typed response or throws on error.

**Initial Load**

On page mount: `GET /api/todos` → populate `todos` and `counts`.

## Test Cases (write tests first)

- On mount, `useTodos` calls `GET /api/todos` and populates `todos`
- `filteredTodos` with `filterCriteria = 'active'` returns only active todos from local state (no API call)
- `filterCriteria` defaults to `'all'`
- `activeCount` reflects the `counts.active` from the last API response
