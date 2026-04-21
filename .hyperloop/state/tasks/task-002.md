---
id: task-002
title: Domain events
spec_ref: specs/domain-model.spec.md
status: not-started
phase: null
deps: [task-001]
round: 0
branch: null
pr: null
---

## Summary

Implement all five Domain Events as immutable records.

## Scope

Events (all immutable, emitted by the Aggregate after state change is applied):

- `TodoCreated { todoId: TodoId, title: TodoTitle, occurredAt: Timestamp }`
- `TodoCompleted { todoId: TodoId, occurredAt: Timestamp }`
- `TodoReopened { todoId: TodoId, occurredAt: Timestamp }`
- `TodoTitleUpdated { todoId: TodoId, newTitle: TodoTitle, occurredAt: Timestamp }`
- `TodoDeleted { todoId: TodoId, occurredAt: Timestamp }`

Events reference Value Objects from task-001, hence the dependency.

## Notes

- Events are pure data — no behaviour, no side effects.
- They are produced by the Aggregate (task-003) and consumed by external subscribers or the repository layer.
