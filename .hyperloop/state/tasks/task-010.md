---
id: task-010
title: UI Create, Toggle, Delete Interactions with Optimistic Updates
spec_ref: specs/interface.spec.md
status: not-started
phase: null
deps: [task-009]
round: 0
branch: null
pr: null
---

## Scope

Wire up the three primary mutation interactions: creating a new Todo, toggling status, and
deleting. Toggle and delete use optimistic UI updates with rollback on API error.
Implement inline error display.

### New Todo Input

- Text field with placeholder "What needs to be done?".
- Pressing Enter calls `POST /api/todos` with the current input value.
- On success: prepend new todo to `todos[]`; clear the input field.
- On API error (e.g. 422 or 500): input is NOT cleared; error message displayed; UI state unchanged.
- Pressing Escape in the new-todo input clears the field without creating a todo.

### Checkbox toggle

- Clicking a checkbox calls `PATCH /api/todos/:id` with the toggled status.
- **Optimistic update**: toggle the status in `todos[]` immediately before the API call.
- On API error: revert the todo in `todos[]` to its previous status; display error message.
- Duplicate rapid toggles: last request wins; intermediate state does not persist.

### Delete button ("x")

- Visible on hover over a Todo item.
- Clicking calls `DELETE /api/todos/:id`.
- **Optimistic update**: remove the todo from `todos[]` immediately before the API call.
- On API error: restore the todo in `todos[]`; display error message.

### Error display

- API errors appear as non-blocking inline messages.
- Auto-dismiss after 5 seconds.
- Screen-reader accessible (announced as alerts).

### TDD: Required test cases (write tests first)

- Entering a title and pressing Enter creates a new item at the top of the list.
- New item input is cleared after successful creation.
- Pressing Escape in the new-todo input clears without creating.
- 422 response on create: input not cleared, error message shown, list unchanged.
- 500 response on toggle: checkbox reverts to previous state.
- Delete button is visible on hover.
- Successful delete removes item from the list.
- Optimistic delete followed by API error restores the item.
- "{N} item(s) left" count updates after toggling a todo.
