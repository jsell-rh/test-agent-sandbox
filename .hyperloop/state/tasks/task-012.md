---
id: task-012
title: PATCH /api/todos/:id endpoint
spec_ref: specs/interface.spec.md
status: not-started
phase: null
deps: [task-008, task-009]
round: 0
branch: null
pr: null
---

## Scope

Implement the partial update endpoint. Supports updating `title` and/or `status` in a single request.

### PATCH /api/todos/:id

**Request body** (all fields optional):
```json
{
  "title":  "string",
  "status": "active | completed"
}
```

**Mapping to domain commands**:
- `title` present → `todo.updateTitle(newTitle)` (raises `InvalidTitleError` on invalid)
- `status: "completed"` → `todo.complete()` (idempotent)
- `status: "active"` → `todo.reopen()` (idempotent)

**Response 200**: updated Todo resource  
**Response 404**: TodoNotFoundError  
**Response 422**: InvalidTitleError  
**Response 400**: unknown `status` value

### Handler Logic

1. `repository.findById(id)` → null throws `TodoNotFoundError`
2. Apply `title` update if present
3. Apply `status` transition if present
4. `repository.save(todo)`
5. Return 200 with updated resource

## Test Cases (write tests first)

- `status: "completed"` on active todo → 200 with `status: "completed"`
- `status: "active"` on completed todo → 200 with `status: "active"`
- `status: "completed"` on already-completed todo → 200 (idempotent)
- Valid `title` update → 200 with new title
- Invalid `title` → 422
- Both `title` and `status` in one request → both applied, 200
- Unknown id → 404
- Unknown `status` value → 400
