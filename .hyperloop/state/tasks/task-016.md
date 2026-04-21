---
id: task-016
title: Filter bar and footer bar
spec_ref: specs/interface.spec.md
status: not-started
phase: null
deps: [task-012, task-014]
round: 0
branch: null
pr: null
---

## Summary

Implement the footer bar with filter tabs, active-item count, and "Clear completed" button.

## Scope

**Footer bar** (visible only when at least one Todo exists):

- **Left**: "{N} item(s) left" — N = count of `active` todos; updates reactively
- **Center**: Filter tabs — "All", "Active", "Completed"; active tab highlighted
  - Selecting a tab updates `FilterCriteria` and re-renders the list client-side (no additional API request)
- **Right**: "Clear completed" button — visible only when `completedCount > 0`; triggers `DELETE /api/todos?status=completed` (wired in task-017)

**Filter behaviour**: client-side filtering over the `todos[]` array; no new network request on tab change.

## TDD Test Cases (from spec)

- "Clear completed" button only visible when `completedCount > 0`
- "{N} item(s) left" reflects current `active` count after toggling
- Filter tabs correctly show/hide items without an additional network request

## Notes

- API calls (clear completed) are wired in task-017.
- The filter tabs here and the filter bar in the main view are one canonical set of tabs as per the spec.
