---
id: task-017
title: UI state machine and API integration
spec_ref: specs/interface.spec.md
status: not-started
phase: null
deps: [task-009, task-010, task-011, task-013, task-014, task-015, task-016]
round: 0
branch: null
pr: null
---

## Summary

Implement the central UI state machine and wire all components to the backend API. Includes optimistic updates with rollback on failure.

## Scope

**State**:
```
FilterCriteria: all | active | completed   (default: all)
editingTodoId:  TodoId | null              (default: null)
todos:          Todo[]                     (source of truth from API)
```

**Initial load**: `GET /api/todos` on page load; populate `todos[]`.

**State transitions and API calls**:

| User action | API call | On success | On failure |
|---|---|---|---|
| Type title + Enter | `POST /api/todos` | Prepend to `todos[]`, clear input | Input not cleared, error displayed |
| Click checkbox | `PATCH /api/todos/:id { status: toggled }` | Update todo in `todos[]` | Revert checkbox (optimistic rollback) |
| Click delete button | `DELETE /api/todos/:id` | Remove from `todos[]` | Revert removal (optimistic rollback) |
| Double-click title | — | Set `editingTodoId = todo.id` | — |
| Enter/blur in edit field | `PATCH /api/todos/:id { title: newTitle }` | Update todo in `todos[]`, clear `editingTodoId` | Restore original title |
| Escape in edit field | — | Clear `editingTodoId` | — |
| Submit empty in edit field | `DELETE /api/todos/:id` | Remove from `todos[]`, clear `editingTodoId` | Revert |
| Click filter tab | — | Set `FilterCriteria`, re-render (client-side) | — |
| Click "Clear completed" | `DELETE /api/todos?status=completed` | Remove all completed from `todos[]` | Revert |

**Optimistic updates**: toggle and delete update `todos[]` immediately before the API responds; rollback to previous state on API error.

## TDD Test Cases (from spec)

- Entering a title and pressing Enter creates a new item at the top of the list
- Pressing Escape in the new-todo input clears without creating
- Filter tabs correctly show/hide items without an additional network request

## Non-Functional Requirements (from spec)

- Optimistic UI updates for toggle and delete; rollback on API error
- Duplicate rapid toggles: second request supersedes first; final server state wins
- Network offline: pending actions show error; previously loaded list remains visible
