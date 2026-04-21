---
id: task-008
title: API server setup and error envelope middleware
spec_ref: specs/interface.spec.md
status: not-started
phase: null
deps: [task-003, task-007, task-005]
round: 0
branch: null
pr: null
---

Wire up the Nuxt 4 server layer with the domain and persistence layers. Implement the error envelope middleware that all API routes will use.

**Error envelope (all 4xx/5xx responses):**
```json
{ "error": "ERROR_CODE_CONSTANT", "message": "Human-readable description" }
```

| HTTP Status | `error` value    | Trigger                              |
|-------------|------------------|--------------------------------------|
| 404         | `TODO_NOT_FOUND` | `TodoId` does not exist              |
| 422         | `INVALID_TITLE`  | `InvalidTitleError` from Aggregate   |
| 400         | `BAD_REQUEST`    | Malformed JSON or unknown status value |
| 500         | `INTERNAL_ERROR` | Unhandled exception                  |

**Deliverables:**
- Nuxt server plugin or composable that initialises the SQLite repository on startup (runs migrations blocking before accepting requests)
- Shared error-handler utility that maps `InvalidTitleError` → 422, `TodoNotFoundError` → 404, unknown → 500
- Shared type definitions for the Todo resource JSON representation:
  ```json
  { "id", "title", "status", "createdAt", "updatedAt" }
  ```
- Utility that maps a `Todo` domain object to the JSON resource shape

**Tests:**
- Error handler maps `InvalidTitleError` to `{ status:422, error:"INVALID_TITLE" }`
- Error handler maps `TodoNotFoundError` to `{ status:404, error:"TODO_NOT_FOUND" }`
- Error handler maps unknown errors to `{ status:500, error:"INTERNAL_ERROR" }`
- Domain→JSON mapper produces correct field names and ISO 8601 timestamps
