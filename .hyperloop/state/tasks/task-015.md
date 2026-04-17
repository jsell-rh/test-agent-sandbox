---
id: task-015
title: DELETE /api/todos?status=completed endpoint (bulk clear completed)
spec_ref: specs/interface.spec.md
status: not-started
phase: null
deps: [task-009, task-008]
round: 0
branch: null
pr: null
---

## Summary

Implement `DELETE /api/todos?status=completed`.

1. `repository.findAll(filter: 'completed')` — get all completed todos.
2. For each: `todo.delete()`, `repository.delete(todo.id)`.
3. Return count.

**Response 200**:
```json
{ "deletedCount": integer }
```

## TDD Cases

- Deletes all completed todos; returns correct `deletedCount`.
- When no completed todos exist: returns 200 with `deletedCount: 0`.
