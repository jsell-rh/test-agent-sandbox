---
id: task-003
title: Todo aggregate with command methods
spec_ref: specs/domain-model.spec.md
status: not-started
phase: null
deps: [task-001, task-002]
round: 0
branch: null
pr: null
---

Implement the `Todo` Aggregate Root using strict TDD (tests first). All business rules live inside the Aggregate — no logic in services.

**State:**
```
Todo {
  id:        TodoId        // immutable after creation
  title:     TodoTitle     // mutable via updateTitle()
  status:    TodoStatus    // transitions via complete() / reopen()
  createdAt: Timestamp     // immutable after creation
  updatedAt: Timestamp     // updated on every mutation
}
```

**Factory methods:**
- `Todo.create(title: TodoTitle): Todo` — validates invariants, assigns new `TodoId`, sets status `active`, emits `TodoCreated`
- `Todo.reconstitute(...)` — private factory that restores state from persistence WITHOUT emitting any events

**Command methods:**
- `todo.complete()` — active→completed, emits `TodoCompleted`; no-op (no event) if already completed
- `todo.reopen()` — completed→active, emits `TodoReopened`; no-op (no event) if already active
- `todo.updateTitle(newTitle: TodoTitle)` — updates title, sets updatedAt, emits `TodoTitleUpdated`; raises `InvalidTitleError` for invalid title
- `todo.delete()` — emits `TodoDeleted`; actual removal delegated to repository

**Invariants enforced inside the Aggregate:**
1. `TodoTitle` must not be blank or whitespace-only
2. `TodoTitle` must not exceed 500 characters
3. `complete()` on already-completed Todo: idempotent no-op, no event emitted
4. `reopen()` on already-active Todo: idempotent no-op, no event emitted
5. Cannot create a `Todo` without a `TodoTitle`

**Critical test cases:**
- `create()` returns Todo with `status: active`, non-null `TodoId`, exactly one `TodoCreated` event
- `create()` raises `InvalidTitleError` for invalid title
- `complete()` active→completed emits `TodoCompleted`
- `complete()` on completed Todo: no state change, no event
- `reopen()` completed→active emits `TodoReopened`
- `reopen()` on active Todo: no state change, no event
- `updateTitle()` updates title, emits `TodoTitleUpdated`
- `updateTitle()` with invalid title raises `InvalidTitleError`, original title unchanged
- `reconstitute()` does not emit any domain events
