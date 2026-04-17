---
id: task-008
title: SQLite TodoRepository implementation
spec_ref: specs/persistence.spec.md
status: not-started
phase: null
deps: [task-004, task-005, task-007]
round: 0
branch: null
pr: null
---

## Summary

Implement `TodoRepository` (from task-005) against SQLite using raw SQL — no ORM. Each test suite uses a fresh `:memory:` database.

### findById(id)
```sql
SELECT * FROM todos WHERE id = ?;
```
Returns null (not error) when not found. Reconstitutes via `Todo.reconstitute()` — no domain events emitted.

### findAll(filter?)
```sql
-- all: SELECT * FROM todos ORDER BY created_at DESC;
-- active: SELECT * FROM todos WHERE status = 'active' ORDER BY created_at DESC;
-- completed: SELECT * FROM todos WHERE status = 'completed' ORDER BY created_at DESC;
```

### save(todo)
```sql
INSERT INTO todos (id, title, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?)
ON CONFLICT(id) DO UPDATE SET title=excluded.title, status=excluded.status, updated_at=excluded.updated_at;
```
`created_at` never overwritten on update.

### delete(id)
```sql
DELETE FROM todos WHERE id = ?;
```
No error if row absent.

### counts()
```sql
SELECT COUNT(*) AS all,
  SUM(CASE WHEN status='active' THEN 1 ELSE 0 END) AS active,
  SUM(CASE WHEN status='completed' THEN 1 ELSE 0 END) AS completed
FROM todos;
```

## TDD Cases (from spec)

- `findById` returns fully reconstituted Todo matching saved values.
- `findById` returns null for unknown id.
- Reconstituted Todo emits no domain events.
- `findAll` ordered by `createdAt` descending; filter variants correct.
- `save` (insert): persisted todo retrievable via `findById`.
- `save` (update): new title/status reflected; `createdAt` unchanged; `updatedAt` advanced.
- `delete`: todo absent from `findById` and `findAll` after deletion; no throw on unknown id.
- `counts` returns zeros on empty store; correct counts after mixed inserts.
