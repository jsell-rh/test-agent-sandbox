---
id: task-010
title: GET /api/todos/:id and PATCH /api/todos/:id endpoints
spec_ref: specs/interface.spec.md
status: not-started
phase: null
deps: [task-007, task-008]
round: 0
branch: null
pr: null
---

## Summary

Implement the `GET /api/todos/:id` (fetch single) and `PATCH /api/todos/:id` (partial update) endpoints with full test coverage.

## Scope

### GET /api/todos/:id

**Response 200**: Full Todo resource.

**Response 404** on `TodoNotFoundError`:
```json
{ "error": "TODO_NOT_FOUND", "message": "..." }
```

Flow: `repository.findById(id)` → if null raise `TodoNotFoundError` → return resource.

### PATCH /api/todos/:id

**Request** (all fields optional):
```json
{
  "title":  "string",
  "status": "active | completed"
}
```

Domain command mapping:
- `title` present → `todo.updateTitle(new TodoTitle(title))`
- `status: "completed"` → `todo.complete()`
- `status: "active"` → `todo.reopen()`
- Unknown `status` value → 400 `BAD_REQUEST`

Both `title` and `status` may be present in the same request; both commands are applied.

**Response 200**: Updated Todo resource.

**Response 404**: `TodoNotFoundError`.

**Response 422**: `InvalidTitleError`.

Flow: `repository.findById(id)` → apply commands → `repository.save(todo)` → return resource.

## TDD Test Cases (from spec)

**PATCH /api/todos/:id**
- `status: "completed"` marks active todo as completed
- `status: "active"` reopens completed todo
- `status: "completed"` on already-completed todo returns 200 (idempotent)
- Unknown id returns 404
- Invalid title returns 422
