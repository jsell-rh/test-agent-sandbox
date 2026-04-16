---
id: task-002
title: Todo aggregate with factory, command methods, and invariants (TDD)
spec_ref: specs/domain-model.spec.md
status: not-started
phase: null
deps: [task-001]
round: 0
branch: null
pr: null
---

## Scope

Implement and test the `Todo` Aggregate Root using strict TDD (tests first).

### Aggregate State

```
Todo {
  id:        TodoId        // immutable after creation
  title:     TodoTitle     // mutable via updateTitle()
  status:    TodoStatus    // transitions via complete() / reopen()
  createdAt: Timestamp     // immutable after creation
  updatedAt: Timestamp     // updated on every mutation
}
```

### Factory

- `Todo.create(title: TodoTitle): Todo` — validates invariants, assigns a new `TodoId`, sets `status` to `active`, emits `TodoCreated`
- `Todo.reconstitute(...)` — private factory for loading from persistence; does NOT emit events

### Command Methods

- `todo.complete()` — transitions `active` -> `completed`, emits `TodoCompleted`; idempotent no-op if already completed
- `todo.reopen()` — transitions `completed` -> `active`, emits `TodoReopened`; idempotent no-op if already active
- `todo.updateTitle(newTitle: TodoTitle)` — updates title, emits `TodoTitleUpdated`; raises `InvalidTitleError` if invalid
- `todo.delete()` — emits `TodoDeleted`; actual removal delegated to repository

### Invariants

1. `TodoTitle` must not be blank or whitespace-only
2. `TodoTitle` must not exceed 500 characters
3. `complete()` on an already-completed Todo is a no-op (no event)
4. `reopen()` on an already-active Todo is a no-op (no event)
5. Cannot create a `Todo` without a `TodoTitle`

### Critical Test Cases (from spec)

**Todo.create():**
- Returns a Todo with `status: active`
- Assigns a non-null `TodoId`
- Emits exactly one `TodoCreated` event
- Raises `InvalidTitleError` when title is invalid

**todo.complete():**
- Transitions `active` -> `completed`, emits `TodoCompleted`
- Calling on already-`completed` Todo: no state change, no event emitted

**todo.reopen():**
- Transitions `completed` -> `active`, emits `TodoReopened`
- Calling on already-`active` Todo: no state change, no event emitted

**todo.updateTitle():**
- Updates `title`, emits `TodoTitleUpdated`
- Raises `InvalidTitleError` when new title is invalid

**Failure modes:**
- Create with empty title: `InvalidTitleError` thrown before any persistence
- Update to whitespace title: `InvalidTitleError` thrown; original title unchanged
- Complete already-completed Todo: idempotent no-op; no duplicate event
