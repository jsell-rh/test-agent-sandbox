---
id: task-003
title: Todo aggregate (create, complete, reopen, updateTitle, delete)
spec_ref: specs/domain-model.spec.md
status: not-started
phase: null
deps: [task-001, task-002]
round: 0
branch: null
pr: null
---

## Scope

Implement the `Todo` Aggregate Root with all command methods. All business rules and invariants live here — not in services.

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

### Factory

- `Todo.create(title: TodoTitle): Todo` — validates invariants, assigns new `TodoId`, sets status `active`, emits `TodoCreated`
- `Todo.reconstitute(...)` — private/internal factory that rehydrates from storage **without** emitting events

### Command Methods

- `todo.complete()` — active → completed, emits `TodoCompleted`; already-completed is no-op (no event)
- `todo.reopen()` — completed → active, emits `TodoReopened`; already-active is no-op (no event)
- `todo.updateTitle(newTitle)` — replaces title, emits `TodoTitleUpdated`; raises `InvalidTitleError` if invalid
- `todo.delete()` — emits `TodoDeleted`; actual removal delegated to repository

## Test Cases (write tests first)

**Todo.create()**
- Returns Todo with `status: active`
- Assigns a non-null `TodoId`
- Emits exactly one `TodoCreated` event
- Raises `InvalidTitleError` for blank title

**todo.complete()**
- Transitions active → completed, emits `TodoCompleted`
- Already-completed: no state change, no event emitted

**todo.reopen()**
- Transitions completed → active, emits `TodoReopened`
- Already-active: no state change, no event emitted

**todo.updateTitle()**
- Updates title, emits `TodoTitleUpdated`
- Raises `InvalidTitleError` for blank/too-long new title; original title unchanged

**Todo.reconstitute()**
- Does not emit any domain events
- All fields match the supplied values
