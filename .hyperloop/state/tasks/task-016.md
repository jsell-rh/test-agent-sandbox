---
id: task-016
title: New todo input component and todo list rendering
spec_ref: specs/interface.spec.md
status: not-started
phase: null
deps: [task-014, task-015]
round: 0
branch: null
pr: null
---

## Scope

Implement the new-todo creation input and the ordered todo list that renders `TodoItem` components.

### Component: `NewTodoInput.vue`

- Text input with placeholder "What needs to be done?"
- Enter key → `POST /api/todos { title }` → on success: prepend new todo to `todos[]`, clear input
- Escape key → clear input without creating
- On API error (e.g., 422): input is NOT cleared; error message displayed inline

### Component: `TodoList.vue`

- Renders `filteredTodos` as an ordered list (newest first — `createdAt` descending)
- Passes each `TodoItem` the `isEditing` prop based on `editingTodoId === todo.id`
- Empty state: contextual message when `filteredTodos` is empty
  - Filter = all → "No todos yet"
  - Filter = active → "No active todos"
  - Filter = completed → "No completed todos"

### State wiring

`editingTodoId` transitions:
- `TodoItem` emits `startEdit` → set `editingTodoId = todo.id`
- `TodoItem` emits `cancelEdit` or update succeeds → set `editingTodoId = null`
- Only one item can be in edit mode at a time

## Test Cases (write tests first)

- Typing a title and pressing Enter calls `POST /api/todos`; on success input is cleared
- Pressing Escape in new-todo input clears without API call
- On 422 response, input is NOT cleared and error is shown
- `TodoList` renders one `TodoItem` per todo in `filteredTodos`
- Only the todo with `id === editingTodoId` receives `isEditing=true`
- Empty state message changes based on active filter
