---
id: task-003
title: Domain events (TodoCreated, TodoCompleted, TodoReopened, TodoTitleUpdated, TodoDeleted)
spec_ref: specs/domain-model.spec.md
status: not-started
phase: null
deps: [task-001]
round: 0
branch: null
pr: null
---

## Summary

Implement all five immutable Domain Event records emitted by the `Todo` Aggregate.

```
TodoCreated    { todoId, title, occurredAt }
TodoCompleted  { todoId, occurredAt }
TodoReopened   { todoId, occurredAt }
TodoTitleUpdated { todoId, newTitle, occurredAt }
TodoDeleted    { todoId, occurredAt }
```

All fields use the Value Object types from task-001. Events are immutable after construction — no mutation methods.
