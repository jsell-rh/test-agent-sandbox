---
id: task-015
title: Todo item edit mode
spec_ref: specs/interface.spec.md
status: not-started
phase: null
deps: [task-014]
round: 0
branch: null
pr: null
---

## Summary

Implement edit mode for the `TodoItem` component: double-click to edit, keyboard shortcuts, and empty-title-deletes behaviour.

## Scope

**Entering edit mode**: double-clicking the title sets `editingTodoId = todo.id`; only one item can be in edit mode at a time.

**Edit field**:
- Pre-filled with the current `TodoTitle` (plain text, not Markdown)
- Auto-focused when edit mode activates
- Full-width, replaces the display title

**Exiting edit mode**:
- **Enter** or **blur**: submits via `PATCH /api/todos/:id { title: newValue }` (wired in task-017)
- **Escape**: cancels — restores the original title, clears `editingTodoId`, no API call
- **Submit with empty string**: calls `DELETE /api/todos/:id` (wired in task-017)

**Accessibility**: edit field is announced to screen readers when it appears.

## TDD Test Cases (from spec)

- Double-clicking a title enters edit mode for that item only
- Pressing Escape in edit mode restores original title without a network request
- Submitting blank title in edit mode deletes the item

## Notes

- `editingTodoId` is global UI state (only one item editable at a time); managed centrally in task-017.
- API calls triggered from edit mode are wired in task-017.
