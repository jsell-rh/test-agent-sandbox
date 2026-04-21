---
id: task-008
title: API server scaffolding and error handling middleware
spec_ref: specs/interface.spec.md
status: not-started
phase: null
deps: [task-003]
round: 0
branch: null
pr: null
---

## Summary

Scaffold the REST API server and implement the shared error handling middleware that maps domain errors to HTTP responses using the standard error envelope.

## Scope

**Server setup**:
- Project scaffold with dependency management
- Base routing under `/api/todos`
- Request/response JSON serialization
- Environment-based configuration (port, `DATABASE_PATH`)

**Error handling middleware** (catches all 4xx/5xx):

Error envelope format:
```json
{
  "error":   "ERROR_CODE_CONSTANT",
  "message": "Human-readable description"
}
```

Mapping:
| Domain Error / Condition | HTTP Status | `error` value |
|---|---|---|
| `TodoNotFoundError` | 404 | `TODO_NOT_FOUND` |
| `InvalidTitleError` | 422 | `INVALID_TITLE` |
| Malformed JSON / unknown `status` value | 400 | `BAD_REQUEST` |
| Unhandled exception | 500 | `INTERNAL_ERROR` |

## Notes

- No business logic here — only wiring and error translation.
- The middleware must be testable in isolation; individual route handlers are tested in task-009 through task-014.
