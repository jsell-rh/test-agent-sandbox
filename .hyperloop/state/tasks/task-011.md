---
id: task-011
title: POST /api/todos endpoint
spec_ref: specs/interface.spec.md
status: not-started
phase: null
deps: [task-008, task-009]
round: 0
branch: null
pr: null
---

## Scope

Implement Todo creation endpoint.

### POST /api/todos

**Request body**:
```json
{ "title": "string" }
```

**Response 201**: the created Todo resource (full representation)

**Response 422**: `InvalidTitleError`
```json
{ "error": "INVALID_TITLE", "message": "string" }
```

**Response 400**: malformed JSON body

### Handler Logic

1. Parse and validate request body
2. Construct `TodoTitle` (raises `InvalidTitleError` on invalid input — caught by error middleware)
3. Call `Todo.create(title)`
4. Call `repository.save(todo)`
5. Return 201 with Todo resource

## Test Cases (write tests first)

- Valid title → 201 with full Todo resource including UUID `id`, `status: "active"`, ISO timestamps
- Empty title → 422 `{ error: "INVALID_TITLE" }`
- Whitespace-only title → 422
- Title exactly 500 chars → 201
- Title 501 chars → 422
- Malformed JSON → 400
