---
id: task-006
title: SQLite TodoRepository implementation with TDD
spec_ref: specs/persistence.spec.md
status: not-started
phase: null
deps: [task-003, task-004, task-005]
round: 0
branch: null
pr: null
---

## Scope

Implement the `TodoRepository` interface (defined in task-003) using raw SQLite queries. No ORM.

### Methods to Implement

**findById(id: TodoId): Todo | null**
```sql
SELECT * FROM todos WHERE id = ?;
```
Returns null when no row found.

**findAll(filter?: FilterCriteria): Todo[]**
```sql
-- all (default)
SELECT * FROM todos ORDER BY created_at DESC;
-- active
SELECT * FROM todos WHERE status = 'active' ORDER BY created_at DESC;
-- completed
SELECT * FROM todos WHERE status = 'completed' ORDER BY created_at DESC;
```

**save(todo: Todo): void** — upsert
```sql
INSERT INTO todos (id, title, status, created_at, updated_at)
VALUES (?, ?, ?, ?, ?)
ON CONFLICT(id) DO UPDATE SET
  title      = excluded.title,
  status     = excluded.status,
  updated_at = excluded.updated_at;
```
`created_at` is never overwritten on update.

**delete(id: TodoId): void**
```sql
DELETE FROM todos WHERE id = ?;
```
No error if row does not exist.

**counts(): { all, active, completed }**
```sql
SELECT
  COUNT(*) AS all,
  SUM(CASE WHEN status = 'active'    THEN 1 ELSE 0 END) AS active,
  SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completed
FROM todos;
```

### Domain <-> Row Mapping

Write path: `Todo.id.value -> id`, `Todo.title.value -> title`, `Todo.status -> status`, `Todo.createdAt.value -> created_at`, `Todo.updatedAt.value -> updated_at`

Read path: row fields -> `TodoId(row.id)`, `TodoTitle(row.title)`, `TodoStatus(row.status)`, `Timestamp(row.created_at)`, `Timestamp(row.updated_at)` — reconstituted via `Todo.reconstitute()`, which does NOT emit domain events.

### Critical Test Cases (from spec)

**findById():**
- Returns a fully reconstituted `Todo` with all fields matching saved values
- Returns null for an unknown `TodoId`
- Reconstituted Todo does not emit any Domain Events

**findAll():**
- Returns todos ordered by `createdAt` descending
- `filter: 'active'` excludes completed todos
- `filter: 'completed'` excludes active todos
- `filter: 'all'` returns both active and completed todos
- Returns empty array when no todos exist

**save() — insert:**
- Persisted todo can be retrieved via `findById()`
- `createdAt` and `updatedAt` are identical on first save

**save() — update:**
- Updated title returned by `findById()`
- Updated status returned by `findById()`
- `createdAt` is unchanged after update
- `updatedAt` is later than `createdAt` after update

**delete():**
- Deleted todo is not returned by `findById()` or `findAll()`
- Calling delete on non-existent id does not throw

**counts():**
- Returns `{ all: 0, active: 0, completed: 0 }` on empty store
- Correctly counts after mixed inserts

### Failure Modes (from spec)

| Scenario | Expected Behaviour |
|---|---|
| `save()` with corrupted `TodoId` | SQLite CHECK constraint raises; propagates as `PersistenceError` |
| Concurrent writes (WAL mode) | Second writer waits up to busy_timeout; no corruption |

### Non-Functional Requirements

- Raw SQL only — no ORM between repository and database
- All list queries complete in < 10ms for up to 10,000 todos
- Test isolation via fresh in-memory database per test suite
