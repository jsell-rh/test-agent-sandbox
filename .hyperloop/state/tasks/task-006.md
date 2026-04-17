---
id: task-006
title: SQLite TodoRepository Implementation
spec_ref: specs/persistence.spec.md
status: not-started
phase: null
deps: [task-003, task-004, task-005]
round: 0
branch: null
pr: null
---

## Scope

Implement the `TodoRepository` interface (task-004) against SQLite using raw SQL only — no ORM.
Use `Todo.reconstitute()` (task-003) to rehydrate domain objects from rows.

### Methods to implement

#### findById(id: TodoId): Todo | null
```sql
SELECT * FROM todos WHERE id = ?;
```
Returns `null` when no row found (not an error).

#### findAll(filter?: FilterCriteria): Todo[]
```sql
-- filter = 'all' or omitted
SELECT * FROM todos ORDER BY created_at DESC;

-- filter = 'active'
SELECT * FROM todos WHERE status = 'active' ORDER BY created_at DESC;

-- filter = 'completed'
SELECT * FROM todos WHERE status = 'completed' ORDER BY created_at DESC;
```

#### save(todo: Todo): void — upsert
```sql
INSERT INTO todos (id, title, status, created_at, updated_at)
VALUES (?, ?, ?, ?, ?)
ON CONFLICT(id) DO UPDATE SET
  title      = excluded.title,
  status     = excluded.status,
  updated_at = excluded.updated_at;
```
`created_at` is never overwritten on update.

#### delete(id: TodoId): void
```sql
DELETE FROM todos WHERE id = ?;
```
No error if row does not exist.

#### counts(): { all: number, active: number, completed: number }
```sql
SELECT
  COUNT(*) AS all,
  SUM(CASE WHEN status = 'active'    THEN 1 ELSE 0 END) AS active,
  SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completed
FROM todos;
```

### Domain <-> Row mapping

**Write (Domain -> Row)**
```
Todo.id.value        -> id
Todo.title.value     -> title
Todo.status          -> status
Todo.createdAt.value -> created_at
Todo.updatedAt.value -> updated_at
```

**Read (Row -> Domain)**
```
id         -> TodoId(row.id)
title      -> TodoTitle(row.title)
status     -> TodoStatus(row.status)
created_at -> Timestamp(row.created_at)
updated_at -> Timestamp(row.updated_at)
```
Reconstitution uses `Todo.reconstitute()` — does NOT emit domain events.

### TDD: Required test cases (write tests first)

Each test suite uses a fresh in-memory database seeded via `save()` calls.

**findById()**
- Returns a fully reconstituted Todo with all fields matching saved values
- Returns null for unknown TodoId
- Reconstituted Todo does not emit any Domain Events

**findAll()**
- Returns todos ordered by `createdAt` descending
- `filter: 'active'` excludes completed todos
- `filter: 'completed'` excludes active todos
- `filter: 'all'` returns both active and completed todos
- Returns empty array when no todos exist

**save() — insert**
- Persisted todo can be retrieved via findById()
- `createdAt` and `updatedAt` are identical on first save

**save() — update**
- Updating title: findById() returns new title
- Updating status: findById() returns new status
- `createdAt` is unchanged after update
- `updatedAt` is later than `createdAt` after update

**delete()**
- Deleted todo is not returned by findById() or findAll()
- Calling delete on non-existent id does not throw

**counts()**
- Returns `{ all: 0, active: 0, completed: 0 }` on empty store
- Correctly counts after mixed inserts

### Failure modes

- `save()` called with invalid data raises `PersistenceError` (wraps SQLite constraint violation).
