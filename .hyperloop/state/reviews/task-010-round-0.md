---
task_id: task-010
round: 0
role: implementer
verdict: pass
---

All interface-layer work called for by `specs/interface.spec.md` was already implemented on this branch across prior commits. This pass audited the implementation against every spec requirement and confirmed all tests pass.

## What was verified

### REST API contract (server/api/todos/)

- `GET /api/todos` — filter query param (all/active/completed), returns `{ todos, counts }` where counts always reflect ALL todos regardless of filter; invalid filter returns 400. ✅
- `POST /api/todos` — creates todo via `Todo.create()`, returns 201 with full resource; empty/whitespace title returns 422 INVALID_TITLE; missing/non-string title returns 400. ✅
- `GET /api/todos/:id` — returns 200 with resource or 404 TODO_NOT_FOUND. ✅
- `PATCH /api/todos/:id` — partial update for title and/or status; maps status→domain commands (complete/reopen); returns 422 on invalid title, 400 on unknown status, 404 on unknown id. ✅
- `DELETE /api/todos/:id` — 204 no body on success, 404 on unknown id. ✅
- `DELETE /api/todos?status=completed` — bulk delete, returns `{ deletedCount }`; 400 on missing/unsupported status param. ✅
- Error envelope `{ error, message }` consistently applied via `formatApiError` + Nitro plugin. ✅

### UI application layer (app/)

- **Pinia store** (`todos.ts`) — owns todos[], counts, filterCriteria, editingTodoId, loading, errors[]. Client-side `filteredTodos` getter (no extra network request). `addError` auto-dismisses after 5s. ✅
- **`useApi` composable** — typed wrapper around `$fetch`; covers all six endpoints; normalises 4xx/5xx into `ApiClientError`. ✅
- **`useTodoActions` composable** — optimistic toggle (rollback on failure), optimistic delete (rollback on failure), clearCompleted (reload on failure), createTodo, updateTitle (empty→delete). ✅
- **`index.vue` page** — header "todos", new-todo input (Enter creates, Escape clears), todo list ordered newest-first, empty state contextual messages, footer (N items left, filter tabs, Clear completed button only when completedCount>0). ✅
- **`TodoItem.vue` component** — checkbox with accessible label, title with inline Markdown rendering, double-click edit mode, Enter/blur submits, Escape cancels, empty submit triggers delete. ✅

### Test coverage

- **78 infrastructure tests** (server API integration, repository, migrations, error formatter, error utilities) — all pass. ✅
- **111 app tests** (store unit tests, TodoItem component tests, index page tests, markdown utility tests) — all pass. ✅
- Total: **189 tests**, 0 failures.
