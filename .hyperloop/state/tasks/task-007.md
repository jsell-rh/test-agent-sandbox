---
id: task-007
title: SQLite TodoRepository implementation
spec_ref: specs/persistence.spec.md
status: not-started
phase: null
deps: [task-004, task-006]
round: 0
branch: null
pr: null
---

Implement the `TodoRepository` interface against SQLite using raw SQL (no ORM). Use strict TDD (tests first). Each test suite uses a fresh in-memory database.

**Method implementations:**

`findById(id: TodoId): Todo | null`
```sql
SELECT * FROM todos WHERE id = ?;
```
Returns null when no row found.

`findAll(filter?: FilterCriteria): Todo[]`
```sql
-- all: SELECT * FROM todos ORDER BY created_at DESC;
-- active: SELECT * FROM todos WHERE status = 'active' ORDER BY created_at DESC;
-- completed: SELECT * FROM todos WHERE status = 'completed' ORDER BY created_at DESC;
```

`save(todo: Todo): void` — upsert:
```sql
INSERT INTO todos (id, title, status, created_at, updated_at)
VALUES (?, ?, ?, ?, ?)
ON CONFLICT(id) DO UPDATE SET
  title = excluded.title,
  status = excluded.status,
  updated_at = excluded.updated_at;
```
`created_at` must NOT be overwritten on update.

`delete(id: TodoId): void`
```sql
DELETE FROM todos WHERE id = ?;
```
No error if row does not exist.

`counts(): { all, active, completed }`
```sql
SELECT COUNT(*) AS all,
  SUM(CASE WHEN status='active' THEN 1 ELSE 0 END) AS active,
  SUM(CASE WHEN status='completed' THEN 1 ELSE 0 END) AS completed
FROM todos;
```

**Reconstitution:** use `Todo.reconstitute()` (not `Todo.create()`) when mapping rows back to domain objects — no events emitted.

**Critical test cases:**
- `findById` returns fully reconstituted Todo with all fields matching saved values
- `findById` returns null for unknown TodoId
- Reconstituted Todo emits no domain events
- `findAll` ordered by `createdAt` descending
- `findAll` with `active` filter excludes completed; `completed` filter excludes active; `all` returns both
- `save` (insert): persisted todo retrievable via `findById`; `createdAt` == `updatedAt`
- `save` (update): new title/status returned; `createdAt` unchanged; `updatedAt` later than `createdAt`
- `delete`: todo not returned by `findById` or `findAll`; no throw on non-existent id
- `counts`: `{ all:0, active:0, completed:0 }` on empty store; correct counts after mixed inserts
- `PersistenceError` propagated when SQLite CHECK constraint violated
