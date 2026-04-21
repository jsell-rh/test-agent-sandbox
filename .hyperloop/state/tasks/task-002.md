---
id: task-002
title: Domain Events
spec_ref: specs/domain-model.spec.md
status: not-started
phase: null
deps: [task-001]
round: 0
branch: null
pr: null
---

Implement all Domain Events as immutable records using the exact names from the Ubiquitous Language:

- `TodoCreated { todoId: TodoId, title: TodoTitle, occurredAt: Timestamp }`
- `TodoCompleted { todoId: TodoId, occurredAt: Timestamp }`
- `TodoReopened { todoId: TodoId, occurredAt: Timestamp }`
- `TodoTitleUpdated { todoId: TodoId, newTitle: TodoTitle, occurredAt: Timestamp }`
- `TodoDeleted { todoId: TodoId, occurredAt: Timestamp }`

All events must be immutable after construction. No behaviour — pure data records.
