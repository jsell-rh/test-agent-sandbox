---
id: task-013
title: Main view layout — header, new-todo input, empty state
spec_ref: specs/interface.spec.md
status: not-started
phase: null
deps: [task-012]
round: 0
branch: null
pr: null
---

## Summary

Implement the main page shell: application header, new-todo input field, todo list container, and empty-state message.

## Scope

**Header**: Application title "todos".

**New Todo Input**:
- Text field with placeholder "What needs to be done?"
- Pressing Enter submits (calls `POST /api/todos` when wired in task-017)
- Pressing Escape clears the input without submitting
- Input clears on successful creation
- Keyboard focus lands here on page load

**Todo List Container**:
- Ordered list rendered newest-first (`createdAt` descending)
- Placeholder slot for Todo Item components (task-014)

**Empty State**:
- Displayed when the filtered list is empty
- Message is contextual: e.g., "No todos yet" for `all`, "No active todos" for `active`, "No completed todos" for `completed`

## Notes

- This task covers static structure and local UI state for the input field.
- API wiring happens in task-017 (state machine + integration).
- Accessible: the input has a visible label or `aria-label`.
