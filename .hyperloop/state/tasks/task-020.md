---
id: task-020
title: Todo item component (view mode: checkbox, title, delete button)
spec_ref: specs/interface.spec.md
status: not-started
phase: null
deps: [task-018]
round: 0
branch: null
pr: null
---

## Summary

Implement the **Todo Item** component in view mode.

- Checkbox: toggles status between `active` and `completed` via `PATCH /api/todos/:id`.
- Title text: renders markdown (uses Nuxt markdown support from task-016). Double-click enters edit mode.
- Delete button ("×"): visible on hover. Calls `DELETE /api/todos/:id`.
- Checkbox input must have an associated label for accessibility.

## TDD Cases

- Clicking checkbox calls toggle; item status updates in the list.
- Clicking delete button removes item from the list.
- "{N} item(s) left" reflects current active count after toggling.
