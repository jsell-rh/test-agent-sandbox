---
id: task-011
title: REST API Router and Endpoints
spec_ref: specs/interface.spec.md
status: not-started
phase: null
deps: [task-008, task-009, task-010]
round: 0
branch: null
pr: null
---

Implement all REST API endpoints under `/api/todos`, wired to the Application Layer use cases and the SQLite repository.

### Endpoints

| Method | Path | Use case | Success |
|---|---|---|---|
| GET | `/api/todos?filter=` | `ListTodos` | 200 `{ todos, counts }` |
| POST | `/api/todos` | `CreateTodo` | 201 Todo resource |
| GET | `/api/todos/:id` | `GetTodo` | 200 Todo resource |
| PATCH | `/api/todos/:id` | `UpdateTodo` | 200 Todo resource |
| DELETE | `/api/todos/:id` | `DeleteTodo` | 204 no body |
| DELETE | `/api/todos?status=completed` | `ClearCompleted` | 200 `{ deletedCount }` |

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

### Critical test cases

**GET /api/todos**
- Returns empty `todos` array and zero counts when no todos exist
- `filter=active` excludes completed todos but counts reflect all
- `filter=completed` excludes active todos
- Invalid `filter` value returns 400

**POST /api/todos**
- Valid title returns 201 with full Todo resource including UUID `id`
- Empty title returns 422 with `error: "INVALID_TITLE"`

**PATCH /api/todos/:id**
- `status: "completed"` marks active todo as completed
- `status: "active"` reopens completed todo
- `status: "completed"` on already-completed todo returns 200 (idempotent)
- Unknown id returns 404
- Invalid title returns 422

**DELETE /api/todos/:id**
- Existing todo returns 204
- Unknown id returns 404

**DELETE /api/todos?status=completed**
- Deletes all completed; returns correct `deletedCount`
- No completed todos: returns 200 with `deletedCount: 0`
