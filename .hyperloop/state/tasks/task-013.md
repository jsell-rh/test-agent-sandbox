---
id: task-013
title: PATCH /api/todos/:id endpoint (update title and/or status)
spec_ref: specs/interface.spec.md
status: not-started
phase: null
deps: [task-009, task-008]
round: 0
branch: null
pr: null
---

## Summary

Implement `PATCH /api/todos/:id`.

**Request body** (all fields optional):
```json
{ "title": "string", "status": "active | completed" }
```

Domain command mapping:
- `title` present → `todo.updateTitle(newTitle)`
- `status: "completed"` → `todo.complete()`
- `status: "active"` → `todo.reopen()`

After command(s), call `repository.save(todo)`.

**Response 200** — updated Todo resource.
**Response 404** — `TodoNotFoundError`.
**Response 422** — `InvalidTitleError`.
**Response 400** — unknown `status` value.

## TDD Cases

- `status: "completed"` marks active todo as completed; returns 200.
- `status: "active"` reopens completed todo; returns 200.
- `status: "completed"` on already-completed todo returns 200 (idempotent).
- Unknown id returns 404.
- Invalid title returns 422.
- Unknown `status` value returns 400.
