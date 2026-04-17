---
id: task-004
title: Todo aggregate (create, complete, reopen, updateTitle, delete)
spec_ref: specs/domain-model.spec.md
status: not-started
phase: null
deps: [task-001, task-002, task-003]
round: 0
branch: null
pr: null
---

## Summary

Implement the `Todo` Aggregate Root with all invariants, factory, and command methods enforced by TDD.

**State**: `id`, `title`, `status`, `createdAt`, `updatedAt`.

**Factory**: `Todo.create(title: TodoTitle) -> Todo` — validates, assigns new `TodoId`, sets `status: active`, emits `TodoCreated`.

**Reconstitution**: `Todo.reconstitute(...)` — private factory used by the repository to rebuild without emitting events.

**Commands**:
- `complete()` — idempotent; emits `TodoCompleted` only on transition from `active`.
- `reopen()` — idempotent; emits `TodoReopened` only on transition from `completed`.
- `updateTitle(newTitle)` — validates via `TodoTitle`, emits `TodoTitleUpdated`.
- `delete()` — emits `TodoDeleted`; actual removal delegated to repository.

## TDD Cases (from spec)

- `create()` returns Todo with `status: active`, non-null `TodoId`, exactly one `TodoCreated` event.
- `create()` with invalid title raises `InvalidTitleError`.
- `complete()` on active: transitions to completed, emits `TodoCompleted`.
- `complete()` on already-completed: no state change, no event.
- `reopen()` on completed: transitions to active, emits `TodoReopened`.
- `reopen()` on already-active: no state change, no event.
- `updateTitle()` updates title, emits `TodoTitleUpdated`.
- `updateTitle()` with invalid title raises `InvalidTitleError`; original title unchanged.
