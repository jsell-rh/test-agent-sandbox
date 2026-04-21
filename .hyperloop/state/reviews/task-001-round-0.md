---
task_id: task-001
round: 0
role: implementer
verdict: pass
---

Domain model implemented per `specs/domain-model.spec.md`. All 31 tests green, TypeScript compiles cleanly.

## Implementation Summary

### Value Objects
- `TodoTitle` — trims input, enforces non-blank and ≤500 chars, raises `InvalidTitleError` on violation
- `TodoStatus` — `active | completed` enum
- `FilterCriteria` — `all | active | completed` enum, default `all`
- `Timestamp` — ISO 8601 UTC string, immutable
- `TodoId` — UUID v4, assigned by `Todo.create()`

### Aggregate Root: Todo
- `Todo.create(title: TodoTitle)` — validates title, assigns UUID v4 `TodoId`, sets `status: active`, emits `TodoCreated`
- `todo.complete()` — idempotent: no-op if already `completed`, otherwise transitions and emits `TodoCompleted`
- `todo.reopen()` — idempotent: no-op if already `active`, otherwise transitions and emits `TodoReopened`
- `todo.updateTitle(newTitle)` — validates via `TodoTitle` constructor before mutating; original title preserved on error; emits `TodoTitleUpdated`
- `todo.delete()` — emits `TodoDeleted`; actual removal delegated to repository

### Domain Events
All 5 events (`TodoCreated`, `TodoCompleted`, `TodoReopened`, `TodoTitleUpdated`, `TodoDeleted`) implemented as immutable records with `todoId`, relevant payload, and `occurredAt` timestamp.

### Domain Errors
- `InvalidTitleError` — thrown by `TodoTitle` for blank or >500-char titles
- `TodoNotFoundError` — thrown by repository when `TodoId` references non-existent Todo

### Repository Interface
`TodoRepository` — domain-owned interface with `findById`, `findAll`, `save`, `delete`. No implementation (infrastructure concern).

### Test Results
- **31 tests, 2 suites — all green**
- `src/domain/__tests__/TodoTitle.test.ts` — 13 tests
- `src/domain/__tests__/Todo.test.ts` — 18 tests
- `npx tsc --noEmit` — clean

### Invariants Verified
1. Blank title raises `InvalidTitleError` ✓
2. Title ≤500 chars enforced ✓
3. `complete()` on already-completed is no-op ✓
4. `reopen()` on already-active is no-op ✓
5. No `Todo` created without `TodoTitle` ✓
