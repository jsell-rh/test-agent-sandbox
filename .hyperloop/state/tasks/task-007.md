---
id: task-007
title: REST API — all endpoints, error handling, and application layer (TDD)
spec_ref: specs/interface.spec.md
status: not-started
phase: null
deps: [task-003, task-006]
round: 0
branch: null
pr: null
---

## Scope

Implement the full REST API application layer. Coordinates HTTP requests with the `Todo` Aggregate and `TodoRepository`. Contains no business rules.

Base path: `/api/todos`

### Error Envelope (all 4xx/5xx)

```json
{ "error": "ERROR_CODE_CONSTANT", "message": "Human-readable description" }
```

| Status | `error`          | Trigger |
|--------|------------------|---------|
| 404    | `TODO_NOT_FOUND` | `TodoId` does not exist |
| 422    | `INVALID_TITLE`  | `InvalidTitleError` from Aggregate |
| 400    | `BAD_REQUEST`    | Malformed JSON or unknown `status` value |
| 500    | `INTERNAL_ERROR` | Unhandled exception |

### Endpoints

**GET /api/todos**
- Optional `?filter=all|active|completed` query param (default: `all`). Invalid filter value -> 400.
- Response 200: `{ todos: Todo[], counts: { all, active, completed } }`
- `counts` always reflects ALL todos regardless of filter.

**POST /api/todos**
- Body: `{ "title": "string" }`. Invokes `Todo.create()`.
- Response 201: created Todo resource.
- Response 422: `{ "error": "INVALID_TITLE", "message": "..." }` on `InvalidTitleError`.

**GET /api/todos/:id**
- Response 200: Todo resource.
- Response 404 on `TodoNotFoundError`.

**PATCH /api/todos/:id**
- Body (all fields optional): `{ "title": "string", "status": "active|completed" }`.
- Mapping: `title` present -> `todo.updateTitle()`; `status: "completed"` -> `todo.complete()`; `status: "active"` -> `todo.reopen()`.
- Response 200: updated Todo resource.
- Response 404 on `TodoNotFoundError`.
- Response 422 on `InvalidTitleError`.

**DELETE /api/todos/:id**
- Invokes `todo.delete()` then `repository.delete()`.
- Response 204 (no body).
- Response 404 on `TodoNotFoundError`.

**DELETE /api/todos?status=completed**
- Bulk delete all completed Todos.
- Response 200: `{ "deletedCount": integer }`.

### Todo Resource Representation

```json
{
  "id":        "string (UUID v4)",
  "title":     "string",
  "status":    "active | completed",
  "createdAt": "string (ISO 8601 UTC)",
  "updatedAt": "string (ISO 8601 UTC)"
}
```

### Critical Test Cases (from spec)

**GET /api/todos:**
- Returns empty `todos` array and zero counts when no todos exist
- `filter=active` excludes completed todos; counts reflect all
- `filter=completed` excludes active todos; counts reflect all
- Invalid `filter` value returns 400

**POST /api/todos:**
- Valid title returns 201 with full Todo resource including UUID `id`
- Empty title returns 422 with `error: "INVALID_TITLE"`

**PATCH /api/todos/:id:**
- `status: "completed"` marks active todo as completed
- `status: "active"` reopens completed todo
- `status: "completed"` on already-completed todo returns 200 (idempotent)
- Unknown id returns 404
- Invalid title returns 422

**DELETE /api/todos/:id:**
- Existing todo returns 204
- Unknown id returns 404

**DELETE /api/todos?status=completed:**
- Deletes all completed; returns correct `deletedCount`
- No completed todos: returns 200 with `deletedCount: 0`

### Failure Modes

| Scenario | Expected Behaviour |
|---|---|
| API returns 500 | Error envelope `{ error: "INTERNAL_ERROR", ... }` |
| Delete non-existent TodoId | `TodoNotFoundError` -> 404 |
