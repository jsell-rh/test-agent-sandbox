---
id: task-009
title: GET and POST /api/todos endpoints
spec_ref: specs/interface.spec.md
status: not-started
phase: null
deps: [task-008]
round: 0
branch: null
pr: null
---

Implement the list and create Todo endpoints using TDD.

**GET /api/todos**

Query params: `filter` — `all | active | completed` (default: `all`)

Response 200:
```json
{
  "todos": [ /* Todo[] ordered createdAt desc */ ],
  "counts": { "all": 0, "active": 0, "completed": 0 }
}
```
`counts` is ALWAYS computed over all todos regardless of `filter`.

Response 400 for invalid `filter` value.

**POST /api/todos**

Request: `{ "title": "string" }`
- Calls `Todo.create(title)` then `repository.save(todo)`
- Response 201: the created Todo resource
- Response 422: `{ "error": "INVALID_TITLE", "message": "..." }` for `InvalidTitleError`

**Critical test cases:**
- GET returns empty `todos` and zero counts when store is empty
- GET `filter=active` excludes completed from list; counts still reflect all
- GET `filter=completed` excludes active from list
- GET with invalid `filter` value returns 400
- POST valid title returns 201 with full resource including UUID `id`
- POST empty title returns 422 with `error: "INVALID_TITLE"`
