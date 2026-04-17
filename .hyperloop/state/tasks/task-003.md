---
id: task-003
title: Todo Aggregate
spec_ref: specs/domain-model.spec.md
status: not-started
phase: null
deps: [task-001, task-002]
round: 0
branch: null
pr: null
---

## Scope

Implement the `Todo` Aggregate Root with all factory methods, command methods, and invariant
enforcement. All business logic lives inside the Aggregate — no logic in services.

### State

```
Todo {
  id:        TodoId        // immutable after creation
  title:     TodoTitle     // mutable via updateTitle()
  status:    TodoStatus    // transitions via complete() / reopen()
  createdAt: Timestamp     // immutable after creation
  updatedAt: Timestamp     // updated on every mutation
}
```

### Factory methods

- `Todo.create(title: TodoTitle): Todo`
  Validates invariants, assigns new `TodoId`, sets `status` to `active`, emits `TodoCreated`.
- `Todo.reconstitute(...)` (private/internal)
  Rehydrates a Todo from persistence without emitting any events. Used by the repository only.

### Command methods

- `todo.complete()` — `active` -> `completed`, emits `TodoCompleted`; no-op if already completed.
- `todo.reopen()` — `completed` -> `active`, emits `TodoReopened`; no-op if already active.
- `todo.updateTitle(newTitle: TodoTitle)` — updates title, emits `TodoTitleUpdated`; raises `InvalidTitleError` if invalid.
- `todo.delete()` — emits `TodoDeleted`; actual removal delegated to repository.

### Invariants (enforced inside Aggregate)

1. `TodoTitle` must not be blank or whitespace-only.
2. `TodoTitle` must not exceed 500 characters.
3. `complete()` on an already-completed Todo is a no-op (idempotent, no event emitted).
4. `reopen()` on an already-active Todo is a no-op (idempotent, no event emitted).
5. A `Todo` cannot be created without a `TodoTitle`.

### TDD: Required test cases (write tests first)

**Todo.create()**
- Returns a Todo with `status: active`
- Assigns a non-null `TodoId`
- Emits exactly one `TodoCreated` event
- Raises `InvalidTitleError` when title is blank
- Raises `InvalidTitleError` when title exceeds 500 characters

**todo.complete()**
- Transitions `active` -> `completed`, emits `TodoCompleted`
- Calling on already-`completed` Todo: no state change, no event emitted

**todo.reopen()**
- Transitions `completed` -> `active`, emits `TodoReopened`
- Calling on already-`active` Todo: no state change, no event emitted

**todo.updateTitle()**
- Updates `title`, emits `TodoTitleUpdated`
- Raises `InvalidTitleError` when new title is invalid; original title unchanged

**Todo.reconstitute()**
- Rehydrated Todo does not emit any Domain Events
- All fields match the source data
