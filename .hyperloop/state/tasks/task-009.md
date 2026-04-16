---
id: task-009
title: SPA UI — edit mode, error display, accessibility, and keyboard navigation (TDD)
spec_ref: specs/interface.spec.md
status: not-started
phase: null
deps: [task-008]
round: 0
branch: null
pr: null
---

## Scope

Complete the SPA with edit-mode behaviour, error handling, accessibility, and full keyboard navigation.

### Edit Mode (Todo Item)

State transition: `editingTodoId = todo.id` on double-click; `null` on exit.

- Double-clicking a title enters edit mode for that item only (all others remain in read mode).
- Input field pre-filled with current `TodoTitle`.
- Pressing Enter or blurring the field -> `PATCH /api/todos/:id { title: newTitle }` -> update `todos[]`, clear `editingTodoId`.
- Pressing Escape -> cancel; restore original title; clear `editingTodoId` (no API call).
- Submitting an empty string -> `DELETE /api/todos/:id` -> remove from `todos[]`, clear `editingTodoId`.

### Error Display

- API errors surfaced as non-blocking inline messages.
- Auto-dismiss after 5 seconds.
- On `POST` 500: input not cleared; error message displayed; UI state unchanged.
- On `PATCH` 500 (toggle): checkbox reverts to previous state (optimistic rollback).
- On network offline: pending actions show error; previously loaded list remains visible.

### Accessibility

- Checkbox inputs have associated `<label>` elements.
- Edit field is announced to screen readers (e.g. `aria-label` or visible label).

### Keyboard Navigation

All actions reachable without a mouse:
- Tab/Shift-Tab through todo items and controls.
- Space/Enter to activate checkboxes and buttons.
- Enter to submit new todo or edited title.
- Escape to cancel edit.

### Critical Test Cases (from spec)

- Double-clicking a title enters edit mode for that item only
- Pressing Escape in edit mode restores original title (no API call made)
- Submitting blank title in edit mode deletes the item
- API returns 500 on create: input not cleared; error message displayed; UI state unchanged
- API returns 500 on toggle: checkbox reverts to previous state
- Duplicate rapid toggles: second request supersedes first; final server state wins

### Failure Modes

| Scenario | Expected Behaviour |
|---|---|
| API 500 on create | Input preserved; error message shown; state unchanged |
| API 500 on toggle | Optimistic update rolled back |
| Network offline | Error shown; previously loaded list remains |
| Duplicate rapid toggles | Second request supersedes first; server state wins |
