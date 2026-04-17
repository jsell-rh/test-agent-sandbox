---
id: task-004
title: TodoRepository Interface
spec_ref: specs/domain-model.spec.md
status: not-started
phase: null
deps: [task-001, task-003]
round: 0
branch: null
pr: null
---

## Scope

Define the `TodoRepository` interface as owned by the Domain layer. This is a contract only —
no implementation. Infrastructure will implement it; the domain must never depend on infrastructure.

### Interface contract

```
interface TodoRepository {
  findById(id: TodoId): Todo | null
  findAll(filter?: FilterCriteria): Todo[]
  save(todo: Todo): void       // insert or update
  delete(id: TodoId): void
  counts(): { all: number, active: number, completed: number }
}
```

### Constraints

- Lives in the domain layer; has zero imports from infrastructure or application layers.
- `findById` returns `null` (not an error) when no row found.
- `findAll` accepts an optional `FilterCriteria`; omitting it is equivalent to `all`.
- `save` must behave as an upsert (insert or update).
- `counts` is included here because it is referenced by the Application Layer for `GET /api/todos`.

### Notes

- The `counts()` method is an extension beyond the core spec interface but is required by the
  Application Layer (see interface.spec.md §GET /api/todos). Adding it here keeps the interface
  cohesive and allows different implementations (e.g., in-memory, SQLite) to optimise it differently.
