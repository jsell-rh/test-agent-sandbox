---
id: task-001
title: Domain value objects (TodoId, TodoTitle, TodoStatus, FilterCriteria, Timestamp)
spec_ref: specs/domain-model.spec.md
status: not-started
phase: null
deps: []
round: 0
branch: null
pr: null
---

## Scope

Implement all Value Objects defined in the domain model with full TDD coverage.

- `TodoId` — UUID v4 string, immutable, equality by value
- `TodoTitle` — non-empty string, max 500 chars, trimmed, raises `InvalidTitleError` on violation (error defined in task-002 but can be co-located here to avoid circular deps)
- `TodoStatus` — enumeration: `active | completed`
- `FilterCriteria` — enumeration: `all | active | completed`, default `all`
- `Timestamp` — ISO 8601 UTC string, immutable, equality by value

## Test Cases (write tests first)

- `TodoTitle`: blank raises error, whitespace-only raises error, 500-char is valid, 501-char raises error, leading/trailing whitespace is trimmed before validation
- `TodoId`: two IDs generated independently are not equal; value equality holds for same value
- `TodoStatus`: only `active` and `completed` are valid values
- `FilterCriteria`: only `all`, `active`, `completed` are valid; default is `all`
