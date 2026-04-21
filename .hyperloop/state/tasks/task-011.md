---
id: task-011
title: DELETE /api/todos/:id and DELETE /api/todos?status=completed endpoints
spec_ref: specs/interface.spec.md
status: not-started
phase: null
deps: [task-007, task-008]
round: 0
branch: null
pr: null
---

## Summary

Implement the `DELETE /api/todos/:id` (single delete) and `DELETE /api/todos?status=completed` (bulk clear completed) endpoints with full test coverage.

## Scope

### DELETE /api/todos/:id

**Response 204**: No body.

**Response 404** on `TodoNotFoundError`.

Flow: `repository.findById(id)` → if null raise `TodoNotFoundError` → `todo.delete()` → `repository.delete(id)` → 204.

### DELETE /api/todos?status=completed

**Response 200**:
```json
{ "deletedCount": 2 }
```

Flow: `repository.findAll(filter: 'completed')` → for each: `todo.delete()` + `repository.delete(id)` → return count.

- When no completed todos exist: returns 200 with `deletedCount: 0`.
- This endpoint is distinguished from `DELETE /api/todos/:id` by the presence of `?status=completed` — the router must route these correctly.

## TDD Test Cases (from spec)

**DELETE /api/todos/:id**
- Existing todo returns 204
- Unknown id returns 404

**DELETE /api/todos?status=completed**
- Deletes all completed; returns correct `deletedCount`
- When no completed todos exist: returns 200 with `deletedCount: 0`
