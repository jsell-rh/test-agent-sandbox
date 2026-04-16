---
id: task-008
title: SPA UI — core layout, new todo input, list, and filter bar (TDD)
spec_ref: specs/interface.spec.md
status: not-started
phase: null
deps: [task-007]
round: 0
branch: null
pr: null
---

## Scope

Build the core single-page application. No full-page reloads after initial load.

### Components

**Header**: Application title ("todos").

**New Todo Input**:
- Text field with placeholder "What needs to be done?"
- Pressing Enter calls `POST /api/todos`. Input clears on success.
- Pressing Escape clears input without creating a todo.

**Todo List**:
- Ordered by `createdAt` descending (newest first).
- Each Todo Item displays:
  - Checkbox: toggles `status` via `PATCH /api/todos/:id`. Checkbox reverts on API error (optimistic rollback).
  - Title text.
  - Delete button ("x"): visible on hover, calls `DELETE /api/todos/:id`.

**Filter Bar / Footer Bar**:
- Footer visible only when at least one Todo exists.
- Left: "{N} item(s) left" where N = count of `active` Todos.
- Center: Three filter tabs — "All", "Active", "Completed". Active tab highlighted.
- Right: "Clear completed" button (visible only when `completedCount > 0`). Calls `DELETE /api/todos?status=completed`.

**Empty State**: Contextual message when filtered list is empty.

### UI State

```
FilterCriteria: all | active | completed  (default: all)
editingTodoId:  TodoId | null             (default: null)
todos:          Todo[]                    (source of truth from API)
```

### State Transitions (core)

- Page load: `GET /api/todos` -> populate `todos[]`
- Enter in new-todo input -> `POST /api/todos` -> prepend to `todos[]`, clear input
- Click checkbox -> `PATCH /api/todos/:id { status: toggled }` -> update todo in `todos[]`
- Click delete button -> `DELETE /api/todos/:id` -> remove from `todos[]`
- Click filter tab -> set `FilterCriteria`; re-render list client-side (no additional network request)
- Click "Clear completed" -> `DELETE /api/todos?status=completed` -> remove all completed from `todos[]`

### Critical Test Cases (from spec)

- Entering a title and pressing Enter creates a new item at the top of the list
- Pressing Escape in the new-todo input clears without creating
- "Clear completed" button only visible when `completedCount > 0`
- "{N} item(s) left" reflects current `active` count after toggling
- Filter tabs correctly show/hide items without an additional network request

### Non-Functional Requirements

| Concern | Requirement |
|---|---|
| Perceived latency | Optimistic UI updates for toggle and delete; rollback on API error |
| Initial load | Full todo list loaded on page load via `GET /api/todos` |
| Keyboard navigation | All actions reachable without a mouse |
