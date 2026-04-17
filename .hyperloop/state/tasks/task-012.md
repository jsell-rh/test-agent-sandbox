---
id: task-012
title: GET /api/todos/:id endpoint (fetch single todo)
spec_ref: specs/interface.spec.md
status: not-started
phase: null
deps: [task-009, task-008]
round: 0
branch: null
pr: null
---

## Summary

Implement `GET /api/todos/:id`.

Calls `repository.findById(id)`. If null, raises `TodoNotFoundError` (caught by middleware → 404).

**Response 200** — the Todo resource.
**Response 404** — `{ "error": "TODO_NOT_FOUND", "message": "..." }`.

## TDD Cases

- Known id returns 200 with matching Todo resource.
- Unknown id returns 404 with `error: "TODO_NOT_FOUND"`.
