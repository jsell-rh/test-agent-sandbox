---
id: task-007
title: API Foundation, Error Middleware, GET /api/todos, POST /api/todos
spec_ref: specs/interface.spec.md
status: not-started
phase: null
deps: [task-003, task-004, task-006]
round: 0
branch: null
pr: null
---

## Scope

Stand up the HTTP application, wire in the `TodoRepository`, implement global error handling,
and deliver the two highest-traffic endpoints: list and create.

### Application setup

- Base path: `/api/todos`
- All request/response bodies are JSON.
- All timestamps ISO 8601 UTC; all IDs UUID v4.
- Inject the `TodoRepository` implementation via dependency injection — no direct imports of
  SQLite inside route handlers.

### Error middleware / envelope

All 4xx and 5xx responses use this envelope:
```json
{ "error": "ERROR_CODE_CONSTANT", "message": "Human-readable description" }
```

| Status | `error` value     | Trigger                                   |
|--------|-------------------|-------------------------------------------|
| 404    | `TODO_NOT_FOUND`  | `TodoNotFoundError` from domain/repo      |
| 422    | `INVALID_TITLE`   | `InvalidTitleError` from Aggregate        |
| 400    | `BAD_REQUEST`     | Malformed JSON or unknown `status` value  |
| 500    | `INTERNAL_ERROR`  | Unhandled exception                       |

### GET /api/todos

Query parameters:
- `filter`: `all | active | completed` (default `all`). Invalid value -> 400.

Response 200:
```json
{
  "todos": [ /* Todo resource[] */ ],
  "counts": { "all": 0, "active": 0, "completed": 0 }
}
```
`counts` is always computed over ALL todos regardless of `filter`.

### POST /api/todos

Request body: `{ "title": "string" }`

Response 201: created Todo resource.
Response 422: `InvalidTitleError` envelope.

### Todo resource representation

```json
{
  "id":        "string (UUID v4)",
  "title":     "string",
  "status":    "active | completed",
  "createdAt": "string (ISO 8601 UTC)",
  "updatedAt": "string (ISO 8601 UTC)"
}
```

### TDD: Required test cases (write tests first)

**GET /api/todos**
- Returns empty `todos` array and zero counts when no todos exist
- `filter=active` excludes completed todos from list but counts reflect all
- `filter=completed` excludes active todos from list
- Invalid `filter` value returns 400 with `BAD_REQUEST` envelope

**POST /api/todos**
- Valid title returns 201 with full Todo resource including a UUID `id`
- Empty title returns 422 with `error: "INVALID_TITLE"`
- Malformed JSON body returns 400
