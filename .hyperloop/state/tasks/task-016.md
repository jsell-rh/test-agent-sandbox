---
id: task-016
title: Main Todo Page
spec_ref: specs/interface.spec.md
status: not-started
phase: null
deps: [task-012, task-014, task-015]
round: 0
branch: null
pr: null
---

Implement the main (and only) page of the SPA, assembling all UI components. No full-page reloads after initial load.

### Sections

**Header**
- Application title: "todos"

**New Todo Input**
- `<input>` with placeholder "What needs to be done?"
- Enter key → `store.createTodo(inputValue)`, clears input on success
- Escape key → clears input without creating

**Todo List**
- Ordered list of `<TodoItem>` components, rendered from `store.filteredTodos`
- Order: `createdAt` descending (newest first — maintained by store)
- **Empty state**: when `filteredTodos` is empty, display contextual message (e.g. "No active todos", "Nothing completed yet", "No todos yet")

**Filter Bar** (also appears in Footer)
- Three tabs: "All", "Active", "Completed"
- Active tab highlighted
- Selecting a tab calls `store.setFilter(criteria)` — client-side only, no API call

**Footer Bar** (visible only when `store.todos.length > 0`)
- Left: "{N} item(s) left" where N = `store.activeCount`
- Center: Filter tabs (same canonical set as Filter Bar above)
- Right: "Clear completed" button — visible only when `store.completedCount > 0`. Calls `store.clearCompleted()`.

**Error Display**
- Inline, non-blocking error message when `store.error` is non-null
- Auto-dismisses after 5s (managed by store)
- Accessible: `role="alert"` or equivalent

### On page load

- Calls `store.loadTodos()` to populate the todo list.

### Critical test cases

- Entering title + Enter creates item at top of list
- Pressing Escape in new-todo input clears without creating
- Filter tabs show/hide items without network requests
- "Clear completed" only visible when `completedCount > 0`
- "{N} item(s) left" reflects active count after toggling
- Footer hidden when no todos exist
- Empty state message shown when filtered list is empty
- API 500 on create: input not cleared; error message displayed; list unchanged
