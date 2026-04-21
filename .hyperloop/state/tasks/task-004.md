---
id: task-004
title: TodoRepository domain interface
spec_ref: specs/domain-model.spec.md
status: not-started
phase: null
deps: [task-001, task-003]
round: 0
branch: null
pr: null
---

Define the `TodoRepository` interface as a domain-owned contract. Infrastructure implements this; no implementation lives here.

**Interface contract:**
```
interface TodoRepository {
  findById(id: TodoId): Todo | null
  findAll(filter?: FilterCriteria): Todo[]
  save(todo: Todo): void       // insert or update (upsert)
  delete(id: TodoId): void
  counts(): { all: number, active: number, completed: number }
}
```

**Notes:**
- `findById` returns `null` (not an error) when no row is found; the Application Layer converts null → `TodoNotFoundError`
- `delete` does not throw if the id does not exist (Application Layer validates existence first)
- `counts()` is computed over ALL todos regardless of any filter
- The interface lives in the domain layer — infrastructure depends on domain, never the reverse

Also define `PersistenceError` and `DatabaseInitError` domain-layer error types to be raised by implementations.
