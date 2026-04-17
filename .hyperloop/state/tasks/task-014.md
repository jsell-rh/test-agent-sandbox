---
id: task-014
title: DELETE /api/todos/:id endpoint (delete single todo)
spec_ref: specs/interface.spec.md
status: not-started
phase: null
deps: [task-009, task-008]
round: 0
branch: null
pr: null
---

## Summary

Implement `DELETE /api/todos/:id`.

1. `repository.findById(id)` — if null, raise `TodoNotFoundError`.
2. `todo.delete()` — emits `TodoDeleted`.
3. `repository.delete(id)` — hard delete from storage.

**Response 204** — no body.
**Response 404** — `TodoNotFoundError`.

## TDD Cases

- Existing todo returns 204; subsequent `GET /api/todos/:id` returns 404.
- Unknown id returns 404 with `error: "TODO_NOT_FOUND"`.
