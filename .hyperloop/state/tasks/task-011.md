---
id: task-011
title: POST /api/todos endpoint (create todo)
spec_ref: specs/interface.spec.md
status: not-started
phase: null
deps: [task-009, task-008]
round: 0
branch: null
pr: null
---

## Summary

Implement `POST /api/todos`.

**Request body**: `{ "title": "string" }`

Invokes `Todo.create(title)` then `repository.save(todo)`.

**Response 201** — full Todo resource JSON.
**Response 422** — `{ "error": "INVALID_TITLE", "message": "..." }` when `InvalidTitleError` is raised.

## TDD Cases

- Valid title returns 201 with complete Todo resource including a UUID `id`.
- Empty title returns 422 with `error: "INVALID_TITLE"`.
