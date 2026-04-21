---
id: task-009
title: GET /api/todos and POST /api/todos endpoints
spec_ref: specs/interface.spec.md
status: not-started
phase: null
deps: [task-007, task-008]
round: 0
branch: null
pr: null
---

## Summary

Implement the `GET /api/todos` (list with filter and counts) and `POST /api/todos` (create) endpoints with full test coverage.

## Scope

### GET /api/todos

Query parameter: `filter` (`all` | `active` | `completed`, default `all`).

**Response 200**:
```json
{
  "todos": [ /* Todo[] */ ],
  "counts": {
    "all":       0,
    "active":    0,
    "completed": 0
  }
}
```

- `todos` is filtered by `FilterCriteria`; `counts` always reflect ALL todos regardless of filter.
- Call `repository.findAll(filter)` and `repository.counts()` — two queries, one response.
- Invalid `filter` value → 400 `BAD_REQUEST`.

### POST /api/todos

**Request**: `{ "title": "string" }`

**Response 201**: Full Todo resource.

**Response 422** on `InvalidTitleError`:
```json
{ "error": "INVALID_TITLE", "message": "..." }
```

Flow: parse body → construct `TodoTitle` → call `Todo.create()` → `repository.save()` → return resource.

## Todo Resource Shape

```json
{
  "id":        "uuid-v4",
  "title":     "string",
  "status":    "active | completed",
  "createdAt": "ISO 8601 UTC",
  "updatedAt": "ISO 8601 UTC"
}
```

## TDD Test Cases (from spec)

**GET /api/todos**
- Returns empty `todos` array and zero counts when no todos exist
- `filter=active` excludes completed todos from list; counts reflect all
- `filter=completed` excludes active todos from list
- Invalid `filter` value returns 400

**POST /api/todos**
- Valid title returns 201 with full Todo resource including a UUID `id`
- Empty title returns 422 with `error: "INVALID_TITLE"`
