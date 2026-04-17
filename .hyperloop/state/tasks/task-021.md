---
id: task-021
title: Todo item edit mode (double-click, Enter/Escape/blur, empty-submit deletes)
spec_ref: specs/interface.spec.md
status: not-started
phase: null
deps: [task-020]
round: 0
branch: null
pr: null
---

## Summary

Implement edit mode for the Todo Item component.

- Double-clicking the title sets `editingTodoId = todo.id`.
- Edit input is pre-filled with current title.
- Enter or blur: submits `PATCH /api/todos/:id { title: newTitle }`; clears `editingTodoId` on success.
- Escape: cancels, restores original title, clears `editingTodoId` (no API call).
- Empty string on submit: calls `DELETE /api/todos/:id`; removes from list; clears `editingTodoId`.
- Edit field announced to screen readers (`aria-label` or role).

## TDD Cases

- Double-clicking a title enters edit mode for that item only.
- Pressing Escape in edit mode restores original title without saving.
- Submitting blank title in edit mode deletes the item.
- Only one item is in edit mode at a time.
