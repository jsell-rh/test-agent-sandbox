---
id: task-024
title: Error handling UI and accessibility (inline messages, keyboard nav, a11y)
spec_ref: specs/interface.spec.md
status: not-started
phase: null
deps: [task-016]
round: 0
branch: null
pr: null
---

## Summary

Implement the cross-cutting UI concerns from the Non-Functional Requirements.

**Error display**:
- API errors surfaced as non-blocking inline messages (not modal/blocking).
- Auto-dismiss after 5 seconds.
- Network offline: pending actions show error; previously loaded list remains visible.

**Accessibility**:
- All checkbox inputs have associated labels.
- Edit field announced to screen readers.
- All actions reachable via keyboard only.

**Keyboard navigation**:
- Tab through all interactive elements.
- Enter/Escape on edit fields.
- Enter on new-todo input.
- Space/Enter on checkboxes.

**Initial load**: Full todo list loaded via `GET /api/todos` on page mount.
