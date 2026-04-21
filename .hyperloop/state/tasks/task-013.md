---
id: task-013
title: DELETE /api/todos/:id and DELETE /api/todos?status=completed endpoints
spec_ref: specs/interface.spec.md
status: not-started
phase: null
deps: [task-008, task-009]
round: 0
branch: null
pr: null
---

## Scope

Implement both delete endpoints.

### DELETE /api/todos/:id

Single Todo deletion.

**Response 204**: no body  
**Response 404**: TodoNotFoundError

Handler logic:
1. `repository.findById(id)` → null throws `TodoNotFoundError`
2. `todo.delete()` (emits `TodoDeleted`)
3. `repository.delete(id)`
4. Return 204

### DELETE /api/todos?status=completed

Bulk delete all completed Todos ("Clear completed").

**Response 200**:
```json
{ "deletedCount": integer }
```

Handler logic:
1. `repository.findAll(filter: 'completed')` → list of completed todos
2. For each: `todo.delete()`, `repository.delete(todo.id)`
3. Return 200 with `deletedCount`

(No 404 — zero completed todos is a valid success: `{ deletedCount: 0 }`)

## Test Cases (write tests first)

**DELETE /api/todos/:id**
- Existing todo → 204, subsequent `findById` returns null
- Unknown id → 404

**DELETE /api/todos?status=completed**
- Mix of active and completed todos → returns correct `deletedCount`, only completed deleted
- No completed todos → 200 with `deletedCount: 0`
- All todos active → `findAll('active')` still returns full active list after bulk delete
