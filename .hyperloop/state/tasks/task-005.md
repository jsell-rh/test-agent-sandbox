---
id: task-005
title: TodoRepository Interface
spec_ref: specs/domain-model.spec.md
status: not-started
phase: null
deps: [task-001]
round: 0
branch: null
pr: null
---

Define the `TodoRepository` interface (contract) owned by the Domain layer. Infrastructure implements it; nothing else in the domain or application layer depends on a concrete class.

```
interface TodoRepository {
  findById(id: TodoId): Todo | null
  findAll(filter?: FilterCriteria): Todo[]
  save(todo: Todo): void       // insert or update (upsert)
  delete(id: TodoId): void
  counts(): { all: number, active: number, completed: number }
}
```

Notes:
- `findById` returns `null` (not an error) when not found. The Application Layer converts `null` → `TodoNotFoundError`.
- `delete` does not throw if the id does not exist.
- `counts()` is a single-query aggregate (spec: persistence.spec.md).
- Place this interface in the domain layer, not in persistence or application layers.
