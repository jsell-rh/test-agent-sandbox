---
id: task-010
title: GET /api/todos endpoint (list with filter and counts)
spec_ref: specs/interface.spec.md
status: not-started
phase: null
deps: [task-009, task-008]
round: 0
branch: null
pr: null
---

## Summary

Implement `GET /api/todos`.

**Query param**: `filter` = `all | active | completed` (default `all`). Invalid value returns 400.

**Response 200**:
```json
{
  "todos": [ /* filtered Todo[] */ ],
  "counts": { "all": int, "active": int, "completed": int }
}
```
`counts` always reflects all todos regardless of `filter`.

## TDD Cases

- Returns empty `todos` and zero counts when no todos exist.
- `filter=active` excludes completed from list; counts reflect all.
- `filter=completed` excludes active from list; counts reflect all.
- Invalid `filter` value returns 400 with `error: "BAD_REQUEST"`.
