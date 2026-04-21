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

## Summary

Define the `TodoRepository` interface in the domain layer. This is a domain-owned contract; infrastructure implements it.

## Scope

```
interface TodoRepository {
  findById(id: TodoId): Todo | null
  findAll(filter?: FilterCriteria): Todo[]
  save(todo: Todo): void       // insert or update
  delete(id: TodoId): void
  counts(): { all: number, active: number, completed: number }
}
```

## Notes

- This file lives in the **domain layer**, not the infrastructure layer.
- No implementation here — only the contract/interface/abstract base.
- The `counts()` method is required by `GET /api/todos` to return counts for all tabs without a second query.
- Swapping SQLite for another store must require only a new implementation of this interface; the domain and application layers must not change.
