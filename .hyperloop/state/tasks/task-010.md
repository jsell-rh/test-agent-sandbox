---
id: task-010
title: GET /api/todos and GET /api/todos/:id endpoints
spec_ref: specs/interface.spec.md
status: not-started
phase: null
deps: [task-008, task-009]
round: 0
branch: null
pr: null
---

## Scope

Implement the two read endpoints.

### GET /api/todos

**Query params**: `filter` (`all | active | completed`, default `all`)

**Response 200**:
```json
{
  "todos": [ /* Todo[] filtered */ ],
  "counts": { "all": int, "active": int, "completed": int }
}
```

- `todos` is filtered by `filter`; `counts` is always computed over ALL todos
- Invalid `filter` → 400 via error middleware (task-009)
- Calls `repository.findAll(filter)` and `repository.counts()` — both in one handler

### GET /api/todos/:id

**Response 200**: full Todo resource  
**Response 404**: `TodoNotFoundError` via error middleware

- Calls `repository.findById(id)`; null → `TodoNotFoundError`

### Resource Representation

```json
{
  "id":        "string (UUID v4)",
  "title":     "string",
  "status":    "active | completed",
  "createdAt": "string (ISO 8601 UTC)",
  "updatedAt": "string (ISO 8601 UTC)"
}
```

## Test Cases (write tests first — use in-memory DB)

- GET /api/todos: empty DB → `{ todos: [], counts: { all:0, active:0, completed:0 } }`
- GET /api/todos?filter=active: excludes completed todos; counts still reflect all
- GET /api/todos?filter=completed: excludes active todos
- GET /api/todos?filter=invalid: 400
- GET /api/todos/:id: returns correct Todo resource
- GET /api/todos/:unknown-id: 404
