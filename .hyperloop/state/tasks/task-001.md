---
id: task-001
title: Domain value objects, domain events, and domain errors (TDD)
spec_ref: specs/domain-model.spec.md
status: not-started
phase: null
deps: []
round: 0
branch: null
pr: null
---

## Scope

Implement and test all primitive building blocks of the domain model using strict TDD (tests first).

### Value Objects

- `TodoId` — UUID v4 string; immutable; equality by value
- `TodoTitle` — non-empty string, max 500 chars, trimmed; immutable; raises `InvalidTitleError` if blank or too long
- `TodoStatus` — enumeration: `active | completed`
- `FilterCriteria` — enumeration: `all | active | completed`; default `all`
- `Timestamp` — ISO 8601 UTC string; immutable; equality by value

### Domain Events (immutable records)

- `TodoCreated { todoId, title, occurredAt }`
- `TodoCompleted { todoId, occurredAt }`
- `TodoReopened { todoId, occurredAt }`
- `TodoTitleUpdated { todoId, newTitle, occurredAt }`
- `TodoDeleted { todoId, occurredAt }`

### Domain Errors

- `InvalidTitleError` — raised when `TodoTitle` is blank or exceeds 500 characters
- `TodoNotFoundError` — raised when a `TodoId` references a non-existent Todo

### Critical Test Cases (from spec)

**TodoTitle:**
- Blank string raises `InvalidTitleError`
- Whitespace-only string raises `InvalidTitleError`
- 500-character string is valid
- 501-character string raises `InvalidTitleError`
- Leading/trailing whitespace is trimmed before validation
