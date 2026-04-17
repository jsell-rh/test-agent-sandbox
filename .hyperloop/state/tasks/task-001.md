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

## Summary

Implement all five Value Objects from the domain model using strict TDD.

- `TodoId` — UUID v4 string wrapper; immutable; equality by value.
- `TodoTitle` — non-empty string ≤ 500 chars, trimmed; raises `InvalidTitleError` on violation; immutable; equality by value.
- `TodoStatus` — `active | completed` enumeration.
- `FilterCriteria` — `all | active | completed` enumeration; default `all`.
- `Timestamp` — ISO 8601 UTC string wrapper; immutable; equality by value.

## TDD Cases (from spec)

- Blank string raises `InvalidTitleError`.
- Whitespace-only string raises `InvalidTitleError`.
- 500-character string is valid.
- 501-character string raises `InvalidTitleError`.
- Leading/trailing whitespace is trimmed before validation.
