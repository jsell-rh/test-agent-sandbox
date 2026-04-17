---
id: task-008
title: API Resource Endpoints — GET/:id, PATCH/:id, DELETE/:id, DELETE bulk
spec_ref: specs/interface.spec.md
status: not-started
phase: null
deps: [task-007]
round: 0
branch: null
pr: null
---

## Scope

Implement the remaining four API endpoints that operate on individual Todo resources and
the bulk-delete action.

### GET /api/todos/:id

Response 200: Todo resource.
Response 404: `TODO_NOT_FOUND` envelope.

### PATCH /api/todos/:id

Request body (all fields optional):
```json
{ "title": "string", "status": "active | completed" }
```

Mapping to domain commands:
- `title` present -> `todo.updateTitle()`
- `status: "completed"` -> `todo.complete()`
- `status: "active"` -> `todo.reopen()`

If both `title` and `status` are provided, apply both in a single request.

Response 200: updated Todo resource.
Response 404: `TODO_NOT_FOUND`.
Response 422: `INVALID_TITLE`.
Response 400: unknown `status` value or malformed JSON.

### DELETE /api/todos/:id

Response 204: no body.
Response 404: `TODO_NOT_FOUND`.

### DELETE /api/todos?status=completed (bulk)

Deletes all Todos with `status = completed`. Does not require any Todos to exist.

Response 200:
```json
{ "deletedCount": 3 }
```

### TDD: Required test cases (write tests first)

**GET /api/todos/:id**
- Returns 200 with the Todo resource for a known id
- Returns 404 for an unknown id

**PATCH /api/todos/:id**
- `status: "completed"` marks active todo as completed (200)
- `status: "active"` reopens completed todo (200)
- `status: "completed"` on already-completed todo returns 200 (idempotent)
- `title` update returns 200 with new title
- `title` and `status` can be updated in a single PATCH
- Unknown id returns 404
- Invalid title returns 422
- Unknown status value returns 400

**DELETE /api/todos/:id**
- Existing todo returns 204
- Unknown id returns 404

**DELETE /api/todos?status=completed**
- Deletes all completed todos; returns correct `deletedCount`
- When no completed todos exist: returns 200 with `deletedCount: 0`
