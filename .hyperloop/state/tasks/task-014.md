---
id: task-014
title: Todo item component — checkbox, title, delete button
spec_ref: specs/interface.spec.md
status: not-started
phase: null
deps: [task-012]
round: 0
branch: null
pr: null
---

## Summary

Implement the `TodoItem` component displaying a single todo with a completion checkbox, Markdown-rendered title, and a delete button.

## Scope

**Display mode** (default):
- **Checkbox**: toggles `status` between `active` and `completed`; checked when `status === 'completed'`
  - Has an associated `<label>` for accessibility
- **Title text**: rendered as Markdown (using the library configured in task-012); double-click enters edit mode
- **Delete button ("×")**: visible on hover; triggers delete flow

**Completed styling**: completed todos have a visually distinct style (e.g., line-through, muted color).

**Hover state**: delete button appears on row hover; keyboard-focusable too.

## Notes

- This task covers the visual component and local interaction state (hover) only.
- Checkbox toggle and delete button API calls are wired in task-017 (state machine + integration).
- Edit mode (double-click) is implemented in task-015.
- Markdown rendering of the title uses the library set up in task-012.
