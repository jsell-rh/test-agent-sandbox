---
id: task-009
title: API application layer bootstrap and error handling
spec_ref: specs/interface.spec.md
status: not-started
phase: null
deps: [task-004, task-005]
round: 0
branch: null
pr: null
---

## Summary

Set up the backend API server (application layer) with:

- Framework bootstrap (e.g. FastAPI or equivalent).
- Dependency injection wiring: inject `TodoRepository` implementation into route handlers.
- Global error handler middleware mapping domain errors to HTTP responses:

| Exception | HTTP Status | `error` value |
|---|---|---|
| `TodoNotFoundError` | 404 | `TODO_NOT_FOUND` |
| `InvalidTitleError` | 422 | `INVALID_TITLE` |
| Malformed JSON / bad `status` value | 400 | `BAD_REQUEST` |
| Unhandled exception | 500 | `INTERNAL_ERROR` |

- All error responses follow the envelope: `{ "error": "CODE", "message": "..." }`.
- Base path: `/api/todos`.
- No business logic here — Application Layer only coordinates and translates.
