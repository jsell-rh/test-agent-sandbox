---
id: task-010
title: API Error Handling Middleware
spec_ref: specs/interface.spec.md
status: not-started
phase: null
deps: [task-003]
round: 0
branch: null
pr: null
---

Implement error handling middleware that maps Domain/Application errors to the HTTP error envelope defined in the spec.

### Error envelope (all 4xx/5xx responses)

```json
{
  "error":   "ERROR_CODE_CONSTANT",
  "message": "Human-readable description"
}
```

### Mapping table

| Error class / condition | HTTP Status | `error` value |
|---|---|---|
| `TodoNotFoundError` | 404 | `TODO_NOT_FOUND` |
| `InvalidTitleError` | 422 | `INVALID_TITLE` |
| `BadRequestError` (malformed JSON, unknown status) | 400 | `BAD_REQUEST` |
| Unhandled exception | 500 | `INTERNAL_ERROR` |

### Requirements

- The middleware must catch all errors propagated from route handlers.
- 500 errors should log the full stack trace server-side but return only a generic message to the client.
- Domain error classes (`InvalidTitleError`, `TodoNotFoundError`) must be instanceof-checkable so the middleware can discriminate them.

### TDD
- Each error class maps to the correct HTTP status and `error` code.
- Unknown errors produce a 500 with `INTERNAL_ERROR` and do not leak stack traces.
