---
id: task-008
title: SQLiteTodoRepository Implementation
spec_ref: specs/persistence.spec.md
status: not-started
phase: null
deps: [task-004, task-005, task-006, task-007]
round: 0
branch: null
pr: null
---

Implement `SQLiteTodoRepository` — a concrete implementation of the `TodoRepository` interface backed by SQLite. Raw SQL only; no ORM.

### Mapping: Domain → Row (write)

```
Todo.id.value        → id
Todo.title.value     → title
Todo.status          → status
Todo.createdAt.value → created_at
Todo.updatedAt.value → updated_at
```

### Mapping: Row → Domain (reconstitution)

Call `Todo.reconstitute()` — no Domain Events emitted on load.

### Method implementations

**findById(id: TodoId): Todo | null**
```sql
SELECT * FROM todos WHERE id = ?;
```
Returns `null` when no row found.

**findAll(filter?: FilterCriteria): Todo[]**
```sql
-- filter = 'all'       → SELECT * FROM todos ORDER BY created_at DESC;
-- filter = 'active'    → SELECT * FROM todos WHERE status = 'active' ORDER BY created_at DESC;
-- filter = 'completed' → SELECT * FROM todos WHERE status = 'completed' ORDER BY created_at DESC;
```

**save(todo: Todo): void** — upsert
```sql
INSERT INTO todos (id, title, status, created_at, updated_at)
VALUES (?, ?, ?, ?, ?)
ON CONFLICT(id) DO UPDATE SET
  title = excluded.title,
  status = excluded.status,
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

### Critical test cases (each test uses fresh `:memory:` DB)

- `findById` returns fully reconstituted Todo matching saved values
- `findById` returns null for unknown `TodoId`
- Reconstituted Todo emits no Domain Events
- `findAll` returns todos ordered by `createdAt` descending
- `findAll` with `filter: 'active'` excludes completed todos
- `findAll` with `filter: 'completed'` excludes active todos
- `findAll` returns empty array when store is empty
- `save` (insert): todo retrievable via `findById`; `createdAt` === `updatedAt`
- `save` (update): new title and status retrievable; `createdAt` unchanged; `updatedAt` > `createdAt`
- `delete`: todo not returned by `findById` or `findAll`
- `delete` on non-existent id does not throw
- `counts` returns `{ all: 0, active: 0, completed: 0 }` on empty store
- `counts` correctly counts after mixed inserts
