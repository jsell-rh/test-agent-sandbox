---
id: task-017
title: Filter bar, footer counts, and Clear completed button
spec_ref: specs/interface.spec.md
status: not-started
phase: null
deps: [task-014, task-015]
round: 0
branch: null
pr: null
---

## Scope

Implement the filter tabs and footer bar.

### Component: `FilterBar.vue`

- Three tabs: "All", "Active", "Completed"
- Active tab highlighted (visual indicator)
- Selecting a tab sets `filterCriteria` in `useTodos` → re-renders `filteredTodos` client-side (no API call)
- Keyboard navigable (arrow keys between tabs, Enter/Space to select)

### Component: `FooterBar.vue`

**Visibility**: rendered only when `todos.length > 0`

**Layout**:
- Left: "{N} item(s) left" where N = `counts.active`
  - Grammatically correct singular/plural: "1 item left" vs "2 items left"
- Center: `FilterBar` (canonical, single set of tabs)
- Right: "Clear completed" button
  - Visible only when `counts.completed > 0`
  - On click: `DELETE /api/todos?status=completed` → on success: remove all completed todos from `todos[]`, update counts

## Test Cases (write tests first)

- Clicking a filter tab sets `filterCriteria`; no API call made
- "All" tab is highlighted when `filterCriteria = 'all'`
- `FooterBar` not rendered when `todos` is empty
- "{1} item left" (singular) when `activeCount = 1`
- "{2} items left" (plural) when `activeCount = 2`
- "Clear completed" visible only when `completedCount > 0`
- Clicking "Clear completed" calls bulk delete; completed todos removed from local state
