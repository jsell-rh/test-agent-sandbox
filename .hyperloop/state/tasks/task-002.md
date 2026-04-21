---
id: task-002
title: Domain errors and domain events
spec_ref: specs/domain-model.spec.md
status: not-started
phase: null
deps: []
round: 0
branch: null
pr: null
---

## Scope

Implement all Domain Errors and Domain Events as immutable value types.

### Domain Errors

- `InvalidTitleError` — raised when `TodoTitle` is blank or exceeds 500 characters
- `TodoNotFoundError` — raised when a `TodoId` references a non-existent Todo

### Domain Events

All events are immutable records; no behaviour, only data:

- `TodoCreated { todoId, title, occurredAt }`
- `TodoCompleted { todoId, occurredAt }`
- `TodoReopened { todoId, occurredAt }`
- `TodoTitleUpdated { todoId, newTitle, occurredAt }`
- `TodoDeleted { todoId, occurredAt }`

## Test Cases (write tests first)

- Each error carries a meaningful message string
- Each event is constructable and its fields are readable
- Events are immutable (fields cannot be reassigned after construction)
