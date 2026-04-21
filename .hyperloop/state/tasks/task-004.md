---
id: task-004
title: Todo Aggregate
spec_ref: specs/domain-model.spec.md
status: not-started
phase: null
deps: [task-001, task-002, task-003]
round: 0
branch: null
pr: null
---

Implement the `Todo` Aggregate Root using TDD (tests first). All business logic lives inside this class — no Domain Services.

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

- `Todo.create(title: TodoTitle): Todo` — validates invariants, assigns a new `TodoId`, sets `status` to `active`, emits `TodoCreated`.
- `Todo.reconstitute(...)` — private factory that bypasses event emission; used only by the repository when loading from storage. No `TodoCreated` emitted.

### Command methods

- `todo.complete()` — transitions `active` → `completed`, emits `TodoCompleted`. If already `completed`: no-op, no event.
- `todo.reopen()` — transitions `completed` → `active`, emits `TodoReopened`. If already `active`: no-op, no event.
- `todo.updateTitle(newTitle: TodoTitle)` — updates `title` and `updatedAt`, emits `TodoTitleUpdated`. Raises `InvalidTitleError` if new title is invalid.
- `todo.delete()` — emits `TodoDeleted`. Actual removal delegated to repository.

### Invariants (enforced inside Aggregate, not in Services)

1. `TodoTitle` must not be blank.
2. `TodoTitle` must not exceed 500 characters.
3. `complete()` on already-`completed` is idempotent — no event.
4. `reopen()` on already-`active` is idempotent — no event.
5. Cannot be created without a `TodoTitle`.

### Critical test cases (write before implementation)

**Todo.create()**
- Returns a Todo with `status: active`
- Assigns a non-null `TodoId`
- Emits exactly one `TodoCreated` event
- Raises `InvalidTitleError` when title is blank

**todo.complete()**
- `active` → `completed`, emits `TodoCompleted`
- Already-`completed`: no state change, no event

**todo.reopen()**
- `completed` → `active`, emits `TodoReopened`
- Already-`active`: no state change, no event

**todo.updateTitle()**
- Updates `title`, emits `TodoTitleUpdated`
- Raises `InvalidTitleError` for invalid new title; original title unchanged

**Todo.reconstitute()**
- Does not emit any Domain Events
