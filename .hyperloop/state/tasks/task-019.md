---
id: task-019
title: Accessibility and keyboard navigation
spec_ref: specs/interface.spec.md
status: not-started
phase: null
deps: [task-013, task-014, task-015, task-016]
round: 0
branch: null
pr: null
---

## Summary

Audit and implement accessibility and keyboard navigation requirements across all UI components.

## Scope

**Accessibility requirements** (from spec):
- Checkbox inputs have associated `<label>` elements (linked via `for`/`id` or wrapping)
- Edit field is announced to screen readers when it appears (e.g., `aria-live` region or focus management)
- All interactive elements have visible focus indicators
- Color contrast meets WCAG AA minimum

**Keyboard navigation** (all actions reachable without a mouse):
- Tab order covers: new-todo input → todo items (checkbox, title, delete button) → filter tabs → clear-completed button
- Checkbox toggleable via Space
- Delete button activatable via Enter/Space
- Filter tabs navigable via Tab or arrow keys
- Double-click to edit mode also accessible via keyboard (e.g., Enter on focused title)
- Edit mode: Enter to submit, Escape to cancel, Tab-out (blur) to submit

## Notes

- This task is a cross-cutting concern — it touches all components built in tasks 013–016.
- Prefer semantic HTML (`<button>`, `<input type="checkbox">`, `<ul>/<li>`) which provides keyboard behaviour for free; add ARIA only where semantics are insufficient.
