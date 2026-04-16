---
id: task-003
title: TodoRepository interface definition (domain-owned)
spec_ref: specs/domain-model.spec.md
status: not-started
phase: null
deps: [task-001, task-002]
round: 0
branch: null
pr: null
---

## Scope

Define the `TodoRepository` interface as a domain-owned contract. No implementation here — that belongs to the persistence layer (task-006).

### Interface Contract

```
interface TodoRepository {
  findById(id: TodoId): Todo | null
  findAll(filter?: FilterCriteria): Todo[]
  save(todo: Todo): void       // insert or update
  delete(id: TodoId): void
  counts(): { all: number, active: number, completed: number }
}
```

### Notes

- `findById` returns `null` (not an error) when no row is found. The Application Layer converts null -> `TodoNotFoundError`.
- `findAll` optionally accepts a `FilterCriteria`; default behaviour returns all todos ordered by `createdAt` descending.
- `save` is an upsert — handles both insert (new Todo) and update (mutated Todo).
- `delete` is a hard delete; no error if the id does not exist (Application Layer validates existence first via `findById`).
- `counts()` returns aggregate counts across ALL todos, independent of any filter.

### No implementation

This task creates only the interface/type definition. The SQLite implementation is task-006.
