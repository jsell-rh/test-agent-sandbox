---
id: task-003
title: Todo aggregate root
spec_ref: specs/domain-model.spec.md
status: not-started
phase: null
deps: [task-001, task-002]
round: 0
branch: null
pr: null
---

## Summary

Implement the `Todo` Aggregate Root with all factory and command methods using strict TDD.

## Scope

**State**:
```
Todo {
  id:        TodoId        // immutable after creation
  title:     TodoTitle     // mutable via updateTitle()
  status:    TodoStatus    // transitions via complete() / reopen()
  createdAt: Timestamp     // immutable after creation
  updatedAt: Timestamp     // updated on every mutation
}
```

**Factory methods**:
- `Todo.create(title: TodoTitle): Todo` — validates invariants, assigns new `TodoId`, sets `status: active`, emits `TodoCreated`
- `Todo.reconstitute(...)` — private factory for loading from storage; does NOT emit `TodoCreated`

**Command methods**:
- `todo.complete()` — transitions `active` -> `completed`, emits `TodoCompleted`; idempotent no-op if already `completed`
- `todo.reopen()` — transitions `completed` -> `active`, emits `TodoReopened`; idempotent no-op if already `active`
- `todo.updateTitle(newTitle: TodoTitle)` — updates title, emits `TodoTitleUpdated`; raises `InvalidTitleError` on invalid title
- `todo.delete()` — emits `TodoDeleted`; actual removal delegated to the repository

**Invariants** (enforced inside the Aggregate):
1. `TodoTitle` must not be blank or whitespace-only
2. `TodoTitle` must not exceed 500 characters
3. `complete()` on already-`completed` Todo is a no-op (no event)
4. `reopen()` on already-`active` Todo is a no-op (no event)
5. Cannot be created without a `TodoTitle`

## TDD Test Cases (from spec)

**Todo.create()**
- Returns a Todo with `status: active`
- Assigns a non-null `TodoId`
- Emits exactly one `TodoCreated` event
- Raises `InvalidTitleError` when title is invalid

**todo.complete()**
- Transitions `active` -> `completed`, emits `TodoCompleted`
- Calling on already-`completed` Todo: no state change, no event emitted

**todo.reopen()**
- Transitions `completed` -> `active`, emits `TodoReopened`
- Calling on already-`active` Todo: no state change, no event emitted

**todo.updateTitle()**
- Updates `title`, emits `TodoTitleUpdated`
- Raises `InvalidTitleError` when new title is invalid

**Failure modes**:
- Create with empty title → `InvalidTitleError` before any persistence
- Update to whitespace title → `InvalidTitleError`; original title unchanged
- Complete an already-completed Todo → idempotent no-op; no duplicate event
