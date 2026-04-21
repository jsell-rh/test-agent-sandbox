---
id: task-014
title: Todo item edit mode
spec_ref: specs/interface.spec.md
status: not-started
phase: null
deps: [task-013]
round: 0
branch: null
pr: null
---

Implement in-place editing of a Todo's title within the `TodoItem` component using TDD (component tests first).

**Edit mode behaviour:**
- Double-clicking the title text sets `editingTodoId = todo.id` (only one item can be in edit mode at a time)
- An input field appears pre-filled with the current `TodoTitle`
- The input field is announced to screen readers (aria attributes)
- **Enter / blur**: calls `PATCH /api/todos/:id { title: newTitle }`; on success: updates todo in `todos[]`, clears `editingTodoId`
- **Escape**: cancels edit, restores original title display, clears `editingTodoId` — no API call
- **Submit empty string**: calls `DELETE /api/todos/:id`; on success: removes item from `todos[]`, clears `editingTodoId`

**Critical test cases:**
- Double-clicking title sets `editingTodoId`; only that item shows edit input
- Edit field is pre-filled with current title
- Pressing Escape restores original title without API call
- Pressing Enter with changed title calls PATCH; store updated on success; `editingTodoId` cleared
- Submitting blank title calls DELETE; item removed from store; `editingTodoId` cleared
- Entering edit mode on a second item clears edit mode on the first
