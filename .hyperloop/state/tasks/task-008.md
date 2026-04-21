---
id: task-008
title: SQLite TodoRepository implementation
spec_ref: specs/persistence.spec.md
status: not-started
phase: null
deps: [task-004, task-007]
round: 0
branch: null
pr: null
---

## Scope

Implement `TodoRepository` (from task-004) using raw SQL against the SQLite connection (from task-006/007). No ORM.

### Methods

**findById(id: TodoId): Todo | null**
```sql
SELECT * FROM todos WHERE id = ?;
```
- Returns null when not found
- Reconstitutes via `Todo.reconstitute()` — no domain events emitted

**findAll(filter?: FilterCriteria): Todo[]**
```sql
-- all: SELECT * FROM todos ORDER BY created_at DESC;
-- active: SELECT * FROM todos WHERE status = 'active' ORDER BY created_at DESC;
-- completed: SELECT * FROM todos WHERE status = 'completed' ORDER BY created_at DESC;
```

**save(todo: Todo): void** — upsert:
```sql
INSERT INTO todos (id, title, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?)
ON CONFLICT(id) DO UPDATE SET title = excluded.title, status = excluded.status, updated_at = excluded.updated_at;
```
`created_at` is never overwritten on update.

**delete(id: TodoId): void**
```sql
DELETE FROM todos WHERE id = ?;
```
No error if row does not exist.

**counts(): { all, active, completed }**
```sql
SELECT COUNT(*) AS all,
  SUM(CASE WHEN status='active' THEN 1 ELSE 0 END) AS active,
  SUM(CASE WHEN status='completed' THEN 1 ELSE 0 END) AS completed
FROM todos;
```

### Domain ↔ Row Mapping

- Domain → Row: `id.value`, `title.value`, `status`, `createdAt.value`, `updatedAt.value`
- Row → Domain: construct value objects then call `Todo.reconstitute()`

## Test Cases (write tests first — use in-memory SQLite)

- `findById`: returns full Todo with matching fields; returns null for unknown id; reconstituted Todo has no pending events
- `findAll`: ordered by createdAt desc; `filter:'active'` excludes completed; `filter:'completed'` excludes active; empty array when no todos
- `save` (insert): todo retrievable via `findById`; `createdAt === updatedAt` on first save
- `save` (update): new title and status reflected; `createdAt` unchanged; `updatedAt` later than `createdAt`
- `delete`: deleted todo not returned by `findById` or `findAll`; calling on non-existent id does not throw
- `counts`: `{all:0, active:0, completed:0}` on empty store; correct after mixed inserts
