---
id: task-013
title: Todo item component (checkbox, title, delete)
spec_ref: specs/interface.spec.md
status: not-started
phase: null
deps: [task-012]
round: 0
branch: null
pr: null
---

Implement the `TodoItem` component for each todo in the list using TDD (component tests first).

**TodoItem component elements:**
- **Checkbox**: associated label (for accessibility); toggling calls `PATCH /api/todos/:id` with the opposite status (`active`↔`completed`); updates the item in `todos[]` on success
- **Title text**: displays the todo title; double-click enters edit mode (handled in task-014)
- **Delete button ("×")**: visible on hover; calls `DELETE /api/todos/:id`; removes item from `todos[]` on success

**Visual states:**
- Active todo: normal text
- Completed todo: visually distinct (e.g. strikethrough, muted colour)
- Hover: delete button visible

**Critical test cases:**
- Checkbox label is associated with input (accessibility)
- Clicking checkbox calls PATCH with toggled status; todo updated in store on success
- Delete button only visible on hover
- Clicking delete calls DELETE /:id; todo removed from store on success
- Completed todo renders with visual completed state
