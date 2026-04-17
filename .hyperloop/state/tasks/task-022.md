---
id: task-022
title: Filter bar and footer bar (counts, filter tabs, Clear completed)
spec_ref: specs/interface.spec.md
status: not-started
phase: null
deps: [task-018]
round: 0
branch: null
pr: null
---

## Summary

Implement the **Filter Bar** and **Footer Bar** components.

**Filter Bar / Footer tabs**: Three tabs — "All", "Active", "Completed". Active tab highlighted. Selecting a tab calls `setFilter(criteria)`. Re-renders the list client-side (no additional network request).

**Footer Bar** (visible only when at least one Todo exists):
- Left: "{N} item(s) left" where N = count of active todos.
- Center: Filter tabs (same as Filter Bar — one canonical set).
- Right: "Clear completed" button — visible only when `completedCount > 0`. Calls `DELETE /api/todos?status=completed`.

**Empty State**: When the filtered list is empty, display a contextual message.

## TDD Cases

- Filter tabs show/hide items without an additional network request.
- "Clear completed" button only visible when `completedCount > 0`.
- "{N} item(s) left" reflects current active count after toggling.
- Footer hidden when todo list is empty.
