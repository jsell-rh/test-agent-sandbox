---
task_id: task-013
round: 0
role: implementer
verdict: pass
---

Both DELETE endpoints are implemented, tested, and passing.

## Summary

### Endpoints Implemented

**`DELETE /api/todos/:id`** — `server/api/todos/[id].delete.ts`
- Looks up the Todo by id via `repo.findById()`
- Returns 404 `TODO_NOT_FOUND` if not found (spec-compliant error envelope)
- Calls `todo.delete()` on the aggregate (domain command)
- Calls `repo.delete(todo.id)` to persist the removal
- Returns 204 with no body

**`DELETE /api/todos?status=completed`** — `server/api/todos/index.delete.ts`
- Validates `?status=completed` query param; returns 400 `BAD_REQUEST` if missing or any other value
- Retrieves all completed todos via `repo.findAll(FilterCriteria.completed)`
- Deletes each in a loop via `repo.delete(todo.id)`
- Returns `{ deletedCount: N }` with status 200

### Test Coverage

All spec-mandated test cases are present in `server/api/todos/todos.test.ts`:

| Scenario | Status |
|---|---|
| Existing todo returns 204 | ✅ |
| Deleted todo no longer retrievable | ✅ |
| Unknown id returns 404 TODO_NOT_FOUND | ✅ |
| Deletes all completed; correct deletedCount | ✅ |
| No completed todos → 200 with deletedCount: 0 | ✅ |
| Empty store → 200 with deletedCount: 0 | ✅ |
| Missing status param → 400 BAD_REQUEST | ✅ |
| Unsupported status value → 400 BAD_REQUEST | ✅ |

### Test Results

- `npx vitest run --config vitest.infra.config.ts` — **78 tests, 5 files, all passed**
  - `server/api/todos/todos.test.ts` — 31 tests
  - `server/infrastructure/persistence/SqliteTodoRepository.test.ts` — 23 tests
  - `server/infrastructure/persistence/MigrationRunner.test.ts` — 9 tests
  - `server/utils/errorFormatter.test.ts` — 7 tests
  - `server/utils/errors.test.ts` — 8 tests
- `npx vitest run` (app-layer) — **111 tests, 4 files, all passed**

### Spec Compliance

- 204 response with null body for single DELETE ✅
- 200 response with `{ deletedCount }` for bulk DELETE ✅
- 400 `BAD_REQUEST` for unsupported `?status` values ✅
- 404 `TODO_NOT_FOUND` follows the error envelope format ✅
- Domain `todo.delete()` command invoked before persistence removal ✅
- `FilterCriteria.completed` used for bulk retrieval (no raw SQL coupling) ✅
