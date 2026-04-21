---
id: task-004
title: TodoRepository interface (domain-owned contract)
spec_ref: specs/domain-model.spec.md
status: not-started
phase: null
deps: [task-001, task-003]
round: 0
branch: null
pr: null
---

## Scope

Define the `TodoRepository` interface (or abstract base / protocol) in the domain layer. This is the only coupling point between the domain and infrastructure — infrastructure implements it, domain owns it.

```
interface TodoRepository {
  findById(id: TodoId): Todo | null
  findAll(filter?: FilterCriteria): Todo[]
  save(todo: Todo): void       // insert or update
  delete(id: TodoId): void
  counts(): { all: number, active: number, completed: number }
}
```

Notes:
- `findById` returns `null` (not an error) when not found; callers convert null → `TodoNotFoundError`
- `delete` does not throw when id is absent (Application Layer validates existence first)
- `counts` is always computed over ALL todos regardless of filter

## Deliverable

A typed interface/protocol/abstract class file in the domain layer. No implementation. Accompanied by a test that a mock/stub conforming to the interface satisfies all method signatures.
