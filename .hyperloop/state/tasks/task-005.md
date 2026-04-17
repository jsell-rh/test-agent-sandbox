---
id: task-005
title: TodoRepository interface (domain-owned contract)
spec_ref: specs/domain-model.spec.md
status: not-started
phase: null
deps: [task-001, task-004]
round: 0
branch: null
pr: null
---

## Summary

Define the `TodoRepository` interface (abstract base class / protocol) owned by the Domain layer. No implementation here — infrastructure provides that in task-008.

```
interface TodoRepository {
  findById(id: TodoId): Todo | null
  findAll(filter?: FilterCriteria): Todo[]
  save(todo: Todo): void       // insert or update
  delete(id: TodoId): void
  counts(): { all: int, active: int, completed: int }
}
```

Note: `counts()` is added per the persistence spec requirement for `GET /api/todos`.
