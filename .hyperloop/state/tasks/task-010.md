---
id: task-010
title: Single-todo and bulk-delete endpoints
spec_ref: specs/interface.spec.md
status: not-started
phase: null
deps: [task-008]
round: 0
branch: null
pr: null
---

Implement the remaining four API endpoints using TDD.

**GET /api/todos/:id**
- Response 200: the Todo resource
- Response 404: `{ "error": "TODO_NOT_FOUND" }` for unknown id

**PATCH /api/todos/:id**

Request (all fields optional): `{ "title": "string", "status": "active | completed" }`

Mapping:
- `title` present → `todo.updateTitle()`
- `status: "completed"` → `todo.complete()`
- `status: "active"` → `todo.reopen()`

- Response 200: updated Todo resource
- Response 404: `TodoNotFoundError`
- Response 422: `InvalidTitleError`
- Response 400: unknown `status` value or malformed JSON

**DELETE /api/todos/:id**
- Calls `todo.delete()` then `repository.delete(id)`
- Response 204: no body
- Response 404: `TodoNotFoundError`

**DELETE /api/todos?status=completed** ("Clear completed")
- Fetches all completed todos, deletes each
- Response 200: `{ "deletedCount": N }`
- Returns 200 with `deletedCount: 0` when no completed todos exist

**Critical test cases:**
- GET /:id returns 200 for existing todo, 404 for unknown
- PATCH `status: "completed"` marks active todo completed (200)
- PATCH `status: "active"` reopens completed todo (200)
- PATCH `status: "completed"` on already-completed todo returns 200 (idempotent)
- PATCH unknown id returns 404; invalid title returns 422
- DELETE /:id existing returns 204; unknown returns 404
- DELETE ?status=completed deletes all completed, returns correct `deletedCount`
- DELETE ?status=completed with no completed todos returns `{ deletedCount: 0 }`
