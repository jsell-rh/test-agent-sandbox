---
id: task-011
title: UI Edit Mode, Filter Bar, Footer Bar, Clear Completed
spec_ref: specs/interface.spec.md
status: not-started
phase: null
deps: [task-010]
round: 0
branch: null
pr: null
---

## Scope

Complete the UI by implementing inline editing, client-side filtering, and the footer actions.

### Edit mode (double-click to edit)

State: `editingTodoId: TodoId | null` (default null).

- Double-clicking a title sets `editingTodoId = todo.id` (enters edit mode for that item only).
- Only one item can be in edit mode at a time.
- Edit input is pre-filled with the current `TodoTitle`.
- Edit field is announced to screen readers when it appears.

Submission behaviours:
- Pressing **Enter** or **blurring** the field:
  - Non-empty value: `PATCH /api/todos/:id { title: newValue }` -> on success update `todos[]`; clear `editingTodoId`.
  - Empty value: `DELETE /api/todos/:id` -> on success remove from `todos[]`; clear `editingTodoId`.
- Pressing **Escape**: cancel without any API call; restore original title in the input; clear `editingTodoId`.

### Filter bar

Three tabs: "All", "Active", "Completed". The active tab is visually highlighted.

- Selecting a tab sets `FilterCriteria` in UI state.
- List re-renders by filtering the local `todos[]` — **no additional network request**.
- Filter tabs appear both above the list (Filter Bar) and in the Footer Bar center — same canonical state.

### Footer bar

Visible only when `todos[]` is non-empty.
- **Left**: "{N} item(s) left" (count of active todos in unfiltered `todos[]`).
- **Center**: filter tabs (shared state with Filter Bar above).
- **Right**: "Clear completed" button — visible only when `completedCount > 0`.

### Clear completed action

- Clicking "Clear completed" calls `DELETE /api/todos?status=completed`.
- On success: remove all completed todos from local `todos[]`.

### TDD: Required test cases (write tests first)

- Double-clicking a title enters edit mode for that item only.
- Pressing Escape in edit mode restores original title; no API call is made.
- Pressing Enter with non-empty value calls PATCH and updates the item in the list.
- Submitting blank title in edit mode calls DELETE and removes the item.
- Blurring the edit field with a non-empty value submits the update.
- Filter tabs correctly show/hide items without an additional network request.
- "All" tab shows all todos; "Active" hides completed; "Completed" hides active.
- "Clear completed" button is hidden when `completedCount === 0`.
- "Clear completed" button is visible when at least one completed todo exists.
- Clicking "Clear completed" removes all completed todos from the list.
- "{N} item(s) left" is recalculated after filter changes and after clear-completed.
