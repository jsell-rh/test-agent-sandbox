---
id: task-009
title: API error handling middleware and error envelope
spec_ref: specs/interface.spec.md
status: not-started
phase: null
deps: [task-005, task-002]
round: 0
branch: null
pr: null
---

## Scope

Implement the shared API error handling layer used by all server routes. All 4xx/5xx responses must conform to the error envelope defined in the spec.

### Error Envelope

```json
{
  "error":   "ERROR_CODE_CONSTANT",
  "message": "Human-readable description"
}
```

### Mappings

| HTTP Status | `error` value | Trigger |
|---|---|---|
| 404 | `TODO_NOT_FOUND` | `TodoNotFoundError` |
| 422 | `INVALID_TITLE` | `InvalidTitleError` |
| 400 | `BAD_REQUEST` | Malformed JSON or unknown `status` value |
| 500 | `INTERNAL_ERROR` | Unhandled exception |

### Deliverables

- A `handleApiError(err)` utility (or Nuxt server middleware / event handler wrapper) that maps domain errors to the correct HTTP status + envelope
- Shared `createErrorResponse(code, message, status)` helper
- Validation helper for the `filter` query parameter (`all | active | completed` — anything else → 400)
- Validation helper for the `status` body field (`active | completed` — anything else → 400)

## Test Cases (write tests first)

- `InvalidTitleError` → 422 `{ error: "INVALID_TITLE", ... }`
- `TodoNotFoundError` → 404 `{ error: "TODO_NOT_FOUND", ... }`
- Unknown error → 500 `{ error: "INTERNAL_ERROR", ... }`
- Invalid `filter` query param → 400 `{ error: "BAD_REQUEST", ... }`
- Invalid `status` body value → 400 `{ error: "BAD_REQUEST", ... }`
