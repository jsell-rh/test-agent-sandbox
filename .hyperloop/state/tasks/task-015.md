---
id: task-015
title: Filter bar, footer, and Clear completed
spec_ref: specs/interface.spec.md
status: not-started
phase: null
deps: [task-013]
round: 0
branch: null
pr: null
---

Implement the filter tabs, footer bar, and "Clear completed" action using TDD (component tests first).

**Filter Bar / Footer tabs (one canonical set of tabs):**
- Three tabs: "All", "Active", "Completed"
- Active tab highlighted
- Selecting a tab sets `filterCriteria` in the store; list re-renders client-side, no new network request

**Footer Bar** (visible only when at least one Todo exists):
- Left: "{N} item(s) left" where N = count of `active` todos (singular "item" when N=1)
- Center: Filter tabs (same set as above — render once, reference canonically)
- Right: "Clear completed" button — visible ONLY when `completedCount > 0`

**"Clear completed" action:**
- Calls `DELETE /api/todos?status=completed`
- On success: removes all completed todos from `todos[]` in store
- Button disappears when `completedCount` reaches 0

**Critical test cases:**
- Footer bar hidden when `todos[]` is empty
- "{N} item(s) left" reflects current active count after toggling
- "item" singular at N=1, "items" plural otherwise
- "Clear completed" button hidden when `completedCount === 0`
- "Clear completed" button visible when `completedCount > 0`
- Clicking "Clear completed" calls bulk delete; completed todos removed from store
- Clicking a filter tab updates `filterCriteria` without a network request
- Active tab is visually highlighted
