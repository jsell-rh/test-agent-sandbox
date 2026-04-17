---
id: task-009
title: UI Shell — SPA Setup, Initial Data Load, Todo List Rendering
spec_ref: specs/interface.spec.md
status: not-started
phase: null
deps: [task-007, task-008]
round: 0
branch: null
pr: null
---

## Scope

Deliver the minimal viable SPA: the page shell, loading todo data from the API on startup,
and rendering the list. No interactions yet (those are in task-010 and task-011).

### SPA setup

- Single HTML entry point served by the application server.
- No full-page reloads after initial load.
- Accessibility: checkbox inputs have associated labels; all interactive elements reachable by keyboard.

### Initial data load

- On page load: `GET /api/todos` -> populate `todos[]` state and render the list.
- UI state:
  ```
  FilterCriteria: all | active | completed  (default: all)
  editingTodoId:  TodoId | null             (default: null)
  todos:          Todo[]
  ```

### Components to render

**Header**: displays "todos" application title.

**Todo List**: ordered list of Todo items sorted by `createdAt` descending (newest first).

Each **Todo Item** displays:
- Checkbox (reflects `status`; interactions wired in task-010).
- Title text (edit mode wired in task-011).
- Delete button ("x") visible on hover (interaction wired in task-010).

**Empty State**: when the (filtered) list is empty, display a contextual message.

**Footer Bar** (visible only when at least one Todo exists):
- Left: "{N} item(s) left" where N = count of `active` todos.
- Center: filter tabs placeholder (interactions wired in task-011).
- Right: "Clear completed" button placeholder (wired in task-011).

### TDD: Required test cases (write tests first)

- Page load fetches `GET /api/todos` and renders the returned todos.
- Todos are ordered newest-first (createdAt descending).
- Empty state message is shown when `todos[]` is empty.
- Footer bar is hidden when `todos[]` is empty.
- Footer bar shows the correct "{N} item(s) left" count.
- Accessibility: each checkbox has an associated label.
