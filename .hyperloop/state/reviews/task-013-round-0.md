---
task_id: task-013
round: 0
role: verifier
verdict: pass
---

All checks pass. The DELETE endpoints are correctly implemented, tested, and spec-compliant.

## Verification Steps

### 1. Code Review

**`DELETE /api/todos/:id`** (`server/api/todos/[id].delete.ts`):
- `repo.findById(id)` called; 404 `TODO_NOT_FOUND` returned if missing ✅
- `todo.delete()` (domain command) invoked before `repo.delete(todo.id)` ✅
- `setResponseStatus(event, 204)` + `return null` — correct 204 no-body response ✅
- Error envelope format matches spec (`{ error, message }`) ✅

**`DELETE /api/todos?status=completed`** (`server/api/todos/index.delete.ts`):
- `query.status !== 'completed'` catches both missing and wrong-value cases → 400 `BAD_REQUEST` ✅
- `repo.findAll(FilterCriteria.completed)` used for retrieval (no raw SQL) ✅
- Deletes each completed todo in a loop ✅
- Returns `{ deletedCount: completed.length }` with implicit 200 ✅

**Domain model** (`server/domain/Todo.ts`):
- `Todo.delete()` emits `TodoDeleted` event and updates `_updatedAt` ✅
- Properly separates intent (domain event) from persistence (repo.delete) ✅

### 2. Test Suite

`npx nuxt prepare` required to generate `.nuxt/tsconfig.json` before tests can run (pre-existing worktree concern; not a defect in this task).

After prepare:
- `npx vitest run --config vitest.infra.config.ts` — **78 tests, 5 files, all passed** ✅
- `npx vitest run` (app-layer) — **111 tests, 4 files, all passed** ✅

All spec-mandated test cases from the TDD Plan are present and green:

| Scenario | Result |
|---|---|
| Existing todo returns 204 | ✅ |
| Deleted todo no longer retrievable (GET → 404) | ✅ |
| Unknown id returns 404 TODO_NOT_FOUND | ✅ |
| Deletes all completed; correct deletedCount | ✅ |
| No completed todos → 200 with deletedCount: 0 | ✅ |
| Empty store → 200 with deletedCount: 0 | ✅ |
| Missing status param → 400 BAD_REQUEST | ✅ |
| Unsupported status value → 400 BAD_REQUEST | ✅ |

### 3. Check Scripts

No `.hyperloop/checks/` directory exists; step skipped.

### 4. Commit Trailers

HEAD commit `9ae11bd` contains:
- `Spec-Ref: specs/interface.spec.md@83f71c8105542fd0e91599d89f191c28862ee3ca` ✅
- `Task-Ref: task-013` ✅

### 5. Spec Compliance

All spec requirements from `specs/interface.spec.md` are met:
- 204 (no body) for single delete ✅
- 200 `{ deletedCount }` for bulk delete ✅
- 400 `BAD_REQUEST` error envelope for unsupported query params ✅
- 404 `TODO_NOT_FOUND` error envelope for unknown id ✅
- Separation rule honoured: no business logic in Application Layer ✅
