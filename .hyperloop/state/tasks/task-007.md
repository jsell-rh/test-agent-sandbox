---
id: task-007
title: SQLite TodoRepository implementation
spec_ref: specs/persistence.spec.md
status: not-started
phase: null
deps: [task-004, task-005, task-006]
round: 0
branch: null
pr: null
---

## Summary

Implement the `TodoRepository` interface using raw SQLite. No ORM. Full TDD test suite using in-memory SQLite.

## Scope

**Methods to implement**:

- `findById(id: TodoId): Todo | null`
  ```sql
  SELECT * FROM todos WHERE id = ?;
  ```
  Returns null (not error) when no row found.

- `findAll(filter?: FilterCriteria): Todo[]`
  - `all` / omitted: `SELECT * FROM todos ORDER BY created_at DESC;`
  - `active`: `SELECT * FROM todos WHERE status = 'active' ORDER BY created_at DESC;`
  - `completed`: `SELECT * FROM todos WHERE status = 'completed' ORDER BY created_at DESC;`

- `save(todo: Todo): void` — upsert:
  ```sql
  INSERT INTO todos (id, title, status, created_at, updated_at)
  VALUES (?, ?, ?, ?, ?)
  ON CONFLICT(id) DO UPDATE SET
    title      = excluded.title,
    status     = excluded.status,
    updated_at = excluded.updated_at;
  ```
  `created_at` is never overwritten on update.

- `delete(id: TodoId): void`
  ```sql
  DELETE FROM todos WHERE id = ?;
  ```
  No error if row does not exist.

- `counts(): { all: number, active: number, completed: number }`
  ```sql
  SELECT
    COUNT(*) AS all,
    SUM(CASE WHEN status = 'active'    THEN 1 ELSE 0 END) AS active,
    SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completed
  FROM todos;
  ```

**Domain <-> Row mapping**:
- Write: `Todo.id.value → id`, `Todo.title.value → title`, `Todo.status → status`, `Todo.createdAt.value → created_at`, `Todo.updatedAt.value → updated_at`
- Read (reconstitution): use `Todo.reconstitute()` — does NOT emit domain events

## TDD Test Cases (from spec)

**findById()**
- Returns fully reconstituted `Todo` with all fields matching saved values
- Returns null for unknown `TodoId`
- Reconstituted Todo does not emit any Domain Events

**findAll()**
- Returns todos ordered by `createdAt` descending
- `filter: 'active'` excludes completed todos
- `filter: 'completed'` excludes active todos
- `filter: 'all'` returns both
- Returns empty array when no todos exist

**save()** (insert)
- Persisted todo retrievable via `findById()`
- `createdAt` and `updatedAt` are identical on first save

**save()** (update)
- Updating title: `findById()` returns new title
- Updating status: `findById()` returns new status
- `createdAt` unchanged after update
- `updatedAt` is later than `createdAt` after update

**delete()**
- Deleted todo not returned by `findById()` or `findAll()`
- Calling delete on non-existent id does not throw

**counts()**
- Returns `{ all: 0, active: 0, completed: 0 }` on empty store
- Correctly counts after mixed inserts

## Non-Functional Requirements

- Raw SQL only — no ORM
- All list queries complete in < 10ms for up to 10,000 todos
- Each test suite uses a fresh in-memory database (`DATABASE_PATH=:memory:`) seeded via `save()` calls
