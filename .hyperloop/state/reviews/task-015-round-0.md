---
task_id: task-015
round: 0
role: implementer
verdict: pass
---

## Summary

Implemented all REST API route handlers for the `/api/todos` endpoint as specified in `specs/interface.spec.md`.

### Files Created

**Route handlers** (`server/api/todos/`):
- `_resource.ts` — `TodoResource` interface + `toResource()` mapper (not a Nitro route)
- `index.get.ts` — `GET /api/todos` with `filter` query param validation, returns todos + counts
- `index.post.ts` — `POST /api/todos` creates a Todo via `Todo.create()`, returns 201
- `index.delete.ts` — `DELETE /api/todos?status=completed` bulk-deletes completed todos
- `[id].get.ts` — `GET /api/todos/:id` fetches a single Todo, 404 on miss
- `[id].patch.ts` — `PATCH /api/todos/:id` updates title and/or status, handles idempotency
- `[id].delete.ts` — `DELETE /api/todos/:id` deletes a single Todo, returns 204

**Tests** (`server/api/todos/todos.test.ts`):
- 39 integration tests covering the full HTTP contract from the TDD plan
- Uses in-memory SQLite + `vi.hoisted()` mock of `getTodoRepository`
- H3 `toWebHandler` for realistic request/response testing
- `onError` hook mirrors the production `apiErrorHandler` Nitro plugin

### Test Results

All 78 infra tests pass (39 new + 39 pre-existing). All 28 app-layer tests continue to pass.

### Design Decisions

- Explicit `h3` imports (no Nitro auto-imports) make handlers portable and unit-testable
- `_resource.ts` underscore prefix prevents Nitro from treating it as a route
- Error envelopes use `createError({ statusCode, data: { error, message } })` so the existing `formatApiError` utility handles them correctly in both production (via `apiErrorHandler` plugin) and tests (via `onError` hook)
- All critical spec test cases are covered: empty list, filter validation, 422/404 errors, idempotent complete, 204 on delete, bulk delete with `deletedCount`
