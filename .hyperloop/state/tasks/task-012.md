---
id: task-012
title: New Todo input and Todo list components
spec_ref: specs/interface.spec.md
status: not-started
phase: null
deps: [task-011]
round: 0
branch: null
pr: null
---

Implement the new-todo input field and the todo list container using TDD (component tests first).

**New Todo Input component:**
- Text field with placeholder "What needs to be done?"
- Pressing Enter calls `POST /api/todos`, prepends result to `todos[]`, clears input on success
- Pressing Escape clears the input without creating a todo
- On API error (e.g. 422): input is NOT cleared; the error message is surfaced inline

**Todo List container:**
- Ordered list of `TodoItem` components (order: `createdAt` descending, newest first)
- Derives visible list from `todos[]` filtered by `filterCriteria` — client-side filter, no extra network request
- Empty state: when filtered list is empty, show a contextual message (e.g. "No active tasks" / "Nothing completed yet")

**Critical test cases (component tests):**
- Typing a title and pressing Enter creates a new item prepended to the list
- Pressing Escape in the new-todo input clears without creating
- Filter `active` hides completed items without additional network request
- Filter `completed` hides active items without additional network request
- Empty state message shown when filtered list is empty
- API error on create: input not cleared, error message displayed, `todos[]` unchanged
